<template>
  <div class="vrmview">
    <canvas id="canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { VRMLoaderPlugin, VRMExpression, VRMExpressionMorphTargetBind } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import JSZip from 'jszip';

import VRMParser from '@/module/VRMParser'

@Component({})
export default class VRMViewThree extends Vue {
  renderer: any | null = null;
  scene = new THREE.Scene();
  camera: any | null = null;
  controls: any | null = null;
  transformControls: any | null = null;
  firstPersonHelper: any | null = null;
  currentVrmVersion = 0;
  loader = new GLTFLoader();
  gltf: any = null;

  skeletonHelper: any | null = null;
  isSkeletonXRay = true;
  boneHighlightGroup: any | null = null;
  currentHighlightBoneNode: any | null = null;

  // アクセサリ管理
  accessoriesMap: Map<string, { id: string; object: any; boneNode: any; item: any }> = new Map();
  activeAccessoryId: string | null = null;
  accessoryTransformControls: any | null = null;

  // モーション（VRMA）管理
  currentMixer: any | null = null;
  currentAction: any | null = null;
  currentClip: any | null = null;
  currentVrmAnimation: any | null = null;
  currentVrmaFileName = '';
  clock = new THREE.Clock();
  isMotionPlaying = false;
  isMotionLoop = true;
  motionPlaybackSpeed = 1.0;

  _engine: any = null

  @Prop()
  debug!: boolean

  @Prop()
  path!: string
  
  BASE_CAMERA_SETTING = {
    fov: 45,
    position: {
      x: 0,
      y: 1,
      z: -1.5
    },
  };

  render = () => {
    if (this.renderer == null) return;
    this.renderer.render(this.scene, this.camera!);
  }

  initScene = () => {
    const viewerElement = document.getElementById("canvas");
    if (viewerElement == null) return;

    // renderer が初期化済みなら何もしない
    if (this.renderer != null) return;

    // renderer 初期設定
    this.renderer = new THREE.WebGLRenderer({
      canvas: viewerElement,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(viewerElement.clientWidth, viewerElement.clientHeight);
    this.renderer.setClearColor(0x7fbfff, 1.0);

    const canvas = this.renderer.domElement;

    // カメラを作成
    // new THREE.PerspectiveCamera(視野角, アスペクト比, near, far)
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.BASE_CAMERA_SETTING.fov, aspect, 0.1, 10);
    this.camera.position.set(this.BASE_CAMERA_SETTING.position.x,
      this.BASE_CAMERA_SETTING.position.y, 
      this.BASE_CAMERA_SETTING.position.z);
    // this.camera.rotation.set(0, Math.PI, 0);
    this.scene.add( this.camera );

    // ライトを作成
    const intensity = 1.5;
    {
      const light = new THREE.DirectionalLight(0xffffff, intensity);
      light.position.set(0, 2, -2);
      this.scene.add(light);
    }
    {
      const light = new THREE.DirectionalLight(0xffffff, intensity);
      light.position.set(0, 2, 2);
      this.scene.add(light);      
    }

    /*
    {
      const light = new THREE.AmbientLight(0xffffff, 2.0);
      this.scene.add(light);
    }
    */

    // コントローラー
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.y = 1.0;
    this.controls.update();

    this.initTransformControls(canvas);

    // VRM & VRMA ローダープラグイン登録
    this.loader.register((parser: any) => new VRMLoaderPlugin(parser));
    this.loader.register((parser: any) => new VRMAnimationLoaderPlugin(parser));

    this.update();
  }

  //フレーム更新
  update = () => {
      requestAnimationFrame(this.update);

      const delta = this.clock.getDelta();
      const safeDelta = Math.min(delta, 0.1);

      if (this.currentMixer && this.isMotionPlaying) {
        this.currentMixer.update(safeDelta);
        if (this.currentAction) {
          this.$emit('motion-time-update', {
            currentTime: this.currentAction.time,
            duration: this.currentClip ? this.currentClip.duration : 0
          });
        }
      }

      if (this.gltf && this.gltf.userData && this.gltf.userData.vrm) {
        this.gltf.userData.vrm.update(safeDelta);
      }

      if (this.skeletonHelper && this.skeletonHelper.visible) {
        this.skeletonHelper.update();
      }
      if (this.boneHighlightGroup && this.boneHighlightGroup.visible && this.currentHighlightBoneNode) {
        const worldPos = new THREE.Vector3();
        this.currentHighlightBoneNode.getWorldPosition(worldPos);
        this.boneHighlightGroup.position.copy(worldPos);
        const worldQuat = new THREE.Quaternion();
        this.currentHighlightBoneNode.getWorldQuaternion(worldQuat);
        this.boneHighlightGroup.quaternion.copy(worldQuat);
      }
      this.render();
  }

  // VRM 読み込み
  drawVrm = async (sceneFilename: string | File): Promise<void> => {
    console.log('drawVrm', sceneFilename)
    return new Promise((resolve, reject) => {
      // 表示の初期化
      this.initScene();
      this.hideFirstPersonGizmo();
      this.hideArmatureSkeleton();
      this.clearAllAccessories();
      if (this.skeletonHelper) {
        this.scene.remove(this.skeletonHelper);
        this.skeletonHelper = null;
      }
      
      // シーンから VRMを削除
      if (this.gltf != null) {
        this.scene.remove(this.gltf.scene);
      }

      // 既存ミキサー停止
      if (this.currentMixer) {
        this.currentMixer.stopAllAction();
        this.currentMixer = null;
        this.currentAction = null;
        this.currentClip = null;
      }

      // VRM ファイルを読み込む
      var path = null;
      if (sceneFilename instanceof File) {
        const blob = new Blob([sceneFilename], { type: "application/octet-stream" });
        path = URL.createObjectURL(blob);
      } else {
        path = sceneFilename
      }
      console.log('path', path)

      this.loader.load(
        path,
        (gltf: any) => {
          console.log('gltf', gltf)
          // VRM モデルをシーンに追加
          this.scene.add(gltf.scene)
          this.gltf = gltf;

          // ロード済みモーションがあれば再バインド
          if (this.currentVrmAnimation && gltf.userData && gltf.userData.vrm) {
            this.applyVrmAnimationToVrm(this.currentVrmAnimation, gltf.userData.vrm);
          }

          // this.render();
          resolve();
        },
        (progress: any) => {
          console.log('progress', progress)
        },
        (error: any) => {
          console.log('error', error)
          reject(error);
        }
      );
    })    
  }
  
  // カメラのターゲット変更する
  setCameraTarget = (vrmJson: any) => {
    console.log('setCameraTarget', VRMParser.getVRMVersion());
    
    // モデルのバウンディングボックスを計算
    const box = new THREE.Box3().setFromObject(this.gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // ターゲット設定（モデルの中心）
    this.controls.target.set(0, center.y, 0);

    // カメラ距離を動的に計算
    const fov = this.camera.fov * (Math.PI / 180);
    let distance = Math.abs((size.y / 2) / Math.tan(fov / 2));
    distance *= 1.2; // マージン

    // カメラ位置調整 (Z軸のみ変更、高さは中心に合わせるか、初期設定のままにするか)
    // VRM 1.0 の場合は +Z, 0.x の場合は -Z から見るのが正面
    // ただし、真正面からのビューにするため、X=0, Y=center.yにセットしなおすのが自然
    const sign = (VRMParser.getVRMVersion().version == 1) ? 1.0 : -1.0;
    this.camera.position.set(0, center.y, distance * sign);
    
    this.controls.update();
  }

  // TransformControls 初期化
  initTransformControls = (canvas: HTMLCanvasElement) => {
    if (this.transformControls != null) return;

    this.transformControls = new TransformControls(this.camera!, canvas);
    this.transformControls.setMode('translate');
    this.transformControls.setSize(0.6);

    // ドラッグ中のカメラ操作無効化
    this.transformControls.addEventListener('dragging-changed', (event: any) => {
      if (this.controls) {
        this.controls.enabled = !event.value;
      }
    });

    // ギズモドラッグ時の座標変換・親へのイベント通知
    this.transformControls.addEventListener('objectChange', () => {
      this.onGizmoChange();
    });

    this.scene.add(this.transformControls);

    // アクセサリ専用 TransformControls 初期化
    if (this.accessoryTransformControls == null) {
      this.accessoryTransformControls = new TransformControls(this.camera!, canvas);
      this.accessoryTransformControls.setMode('translate');
      this.accessoryTransformControls.setSize(0.6);

      this.accessoryTransformControls.addEventListener('dragging-changed', (event: any) => {
        if (this.controls) {
          this.controls.enabled = !event.value;
        }
      });

      this.accessoryTransformControls.addEventListener('objectChange', () => {
        this.onAccessoryGizmoChange();
      });

      this.scene.add(this.accessoryTransformControls);
    }

    // 視点マーカー（半透明球体）の作成
    // 深度テストを無効にし、頭部内部に入っても埋もれないよう最前面描画
    const geometry = new THREE.SphereGeometry(0.025, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.85
    });
    this.firstPersonHelper = new THREE.Mesh(geometry, material);
    this.firstPersonHelper.renderOrder = 999;
    this.firstPersonHelper.visible = false;
    this.scene.add(this.firstPersonHelper);
  }

  // 頭部ボーンノードを取得
  getHeadBoneNode = (): any => {
    if (!this.gltf || !this.gltf.userData.vrm) return null;
    const vrm = this.gltf.userData.vrm;
    if (vrm.humanoid) {
      if (vrm.humanoid.getRawBoneNode) {
        return vrm.humanoid.getRawBoneNode('head');
      } else if (vrm.humanoid.getBoneNode) {
        return vrm.humanoid.getBoneNode('head');
      }
    }
    return null;
  }

  // ギズモ移動時のコールバック
  onGizmoChange = () => {
    const headNode = this.getHeadBoneNode();
    if (!headNode || !this.firstPersonHelper) return;

    headNode.updateWorldMatrix(true, false);
    const invHeadMatrix = headNode.matrixWorld.clone().invert();
    const localPos = this.firstPersonHelper.position.clone().applyMatrix4(invHeadMatrix);

    let x = parseFloat(localPos.x.toFixed(4));
    let y = parseFloat(localPos.y.toFixed(4));
    let z = 0;

    if (this.currentVrmVersion === 1) {
      z = parseFloat(localPos.z.toFixed(4));
    } else {
      // VRM 0.x はローカルZ軸の正負が反転
      z = parseFloat((-localPos.z).toFixed(4));
    }

    this.$emit('change-first-person-offset', { x, y, z });
  }

  // firstPerson オブジェクトから offset を抽出
  extractOffset = (firstPerson: any, version: number): { x: number, y: number, z: number } => {
    if (!firstPerson) return { x: 0, y: 0.06, z: 0 };
    if (version === 1) {
      const arr = firstPerson.offsetFromHeadBone || [0, 0.06, 0];
      return { x: arr[0] ?? 0, y: arr[1] ?? 0.06, z: arr[2] ?? 0 };
    } else {
      const offset = firstPerson.firstPersonBoneOffset || { x: 0, y: 0.06, z: 0 };
      return { x: offset.x ?? 0, y: offset.y ?? 0.06, z: offset.z ?? 0 };
    }
  }

  // 視点マーカーの位置を頭部ボーンのローカルオフセットから更新
  updateHelperPosition = (x: number, y: number, z: number) => {
    const headNode = this.getHeadBoneNode();
    if (!headNode || !this.firstPersonHelper) return;

    headNode.updateWorldMatrix(true, false);
    let localVec: any;
    if (this.currentVrmVersion === 1) {
      localVec = new THREE.Vector3(x, y, z);
    } else {
      localVec = new THREE.Vector3(x, y, -z);
    }

    const worldPos = localVec.clone().applyMatrix4(headNode.matrixWorld);
    this.firstPersonHelper.position.copy(worldPos);

    const headQuat = new THREE.Quaternion();
    headNode.getWorldQuaternion(headQuat);
    this.firstPersonHelper.quaternion.copy(headQuat);

    if (this.transformControls) {
      this.transformControls.updateMatrixWorld();
    }
  }

  // ギズモと視点マーカーを表示
  public showFirstPersonGizmo = (firstPerson: any, vrmVersion: any) => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (canvas) {
      this.initTransformControls(canvas);
    }
    if (!this.firstPersonHelper || !this.transformControls) return;

    this.currentVrmVersion = (vrmVersion && typeof vrmVersion.version === 'number') ? vrmVersion.version : 0;
    const offset = this.extractOffset(firstPerson, this.currentVrmVersion);

    this.updateHelperPosition(offset.x, offset.y, offset.z);

    this.firstPersonHelper.visible = true;
    this.transformControls.attach(this.firstPersonHelper);

    // 視点にカメラをフォーカス
    this.focusFirstPerson();
  }

  // ギズモと視点マーカーを非表示
  public hideFirstPersonGizmo = () => {
    if (this.transformControls) {
      this.transformControls.detach();
    }
    if (this.firstPersonHelper) {
      this.firstPersonHelper.visible = false;
    }
  }

  // UI入力からの視点オフセット更新
  public setFirstPersonOffset = (offset: { x: number, y: number, z: number }) => {
    if (!this.firstPersonHelper) return;
    this.updateHelperPosition(offset.x, offset.y, offset.z);
  }

  // 視点位置にカメラをフォーカス
  public focusFirstPerson = () => {
    if (!this.camera || !this.controls) return;
    const headNode = this.getHeadBoneNode();
    if (!headNode) return;

    const targetPos = new THREE.Vector3();
    if (this.firstPersonHelper && this.firstPersonHelper.visible) {
      this.firstPersonHelper.getWorldPosition(targetPos);
    } else {
      headNode.getWorldPosition(targetPos);
    }

    this.controls.target.copy(targetPos);

    const fov = this.camera.fov * (Math.PI / 180);
    const focusSize = 0.35;
    let distance = Math.abs((focusSize / 2) / Math.tan(fov / 2));
    distance *= 1.8;

    const sign = (this.currentVrmVersion === 1) ? 1.0 : -1.0;
    this.camera.position.set(targetPos.x, targetPos.y, targetPos.z + (distance * sign));
    this.controls.update();
  }

  // firstPersonBoneOffset 位置に球体を表示数する
  drawFirstPerson = (vrmJson: any) => {
    console.log('drawFirstPerson', vrmJson);  
  }

  BLEND_SHAPE_GROUPS: any = {
    a: 'aa',
    i: 'ih',
    u: 'ou',
    e: 'ee',
    o: 'oh',
    blink: 'blink',
    angry: 'angry',
    fun: 'relaxed',
    happy: 'happy',
    joy: 'happy',
    relaxed: 'relaxed',    
    sorrow: 'sad',
    sad: 'sad',
    surprised: 'surprised',
    lookup: 'lookUp',
    lookdown: 'lookDown',
    lookleft: 'lookLeft',
    lookright: 'lookRight',
    blinkleft: 'blinkLeft',
    blinkright: 'blinkRight',
    blink_l: 'blinkLeft',
    blink_r: 'blinkRight',    
    neutral: 'neutral',
  }

  // 表情名（VRM 0.x presetName または VRM 1.0 expressionName）を解決
  getExpressionName = (name: string): string => {
    if (!this.gltf || !this.gltf.userData.vrm) return name;
    const vrm = this.gltf.userData.vrm;
    if (vrm.expressionManager) {
      if (vrm.expressionManager.getExpression(name)) {
        return name;
      }
      const key = name.toLowerCase();
      if (this.BLEND_SHAPE_GROUPS[key] && vrm.expressionManager.getExpression(this.BLEND_SHAPE_GROUPS[key])) {
        return this.BLEND_SHAPE_GROUPS[key];
      }
    }
    return name;
  }

  // 表情変更（単一表情を100%にし他を0%にする）
  changeBlendShape = (name: string) => {
    if (!this.gltf || !this.gltf.userData.vrm) return;
    const vrm = this.gltf.userData.vrm;
    if (!vrm.expressionManager) return;
    
    // 表情 リセット
    for (const expression of vrm.expressionManager.expressions) {
      vrm.expressionManager.setValue(expression.expressionName, 0.0);
    }

    // 表情変更
    const expName = this.getExpressionName(name);
    vrm.expressionManager.setValue(expName, 1.0);
    vrm.expressionManager.update();
    this.render();
  }

  // 単一表情のウェイトを設定（リアルタイムスライダー用）
  setBlendShapeWeight = (name: string, weight: number) => {
    if (!this.gltf || !this.gltf.userData.vrm) return;
    const vrm = this.gltf.userData.vrm;
    if (!vrm.expressionManager) return;

    const expName = this.getExpressionName(name);
    vrm.expressionManager.setValue(expName, Math.max(0, Math.min(1, weight)));
    vrm.expressionManager.update();
    this.render();
  }

  // 全ての表情をリセット
  resetAllBlendShapes = () => {
    if (!this.gltf || !this.gltf.userData.vrm) return;
    const vrm = this.gltf.userData.vrm;
    if (!vrm.expressionManager) return;

    for (const expression of vrm.expressionManager.expressions) {
      vrm.expressionManager.setValue(expression.expressionName, 0.0);
    }
    vrm.expressionManager.update();
    this.render();
  }

  // モーフターゲット直接プレビュー（バインド設定時の動作テスト用）
  previewMorphTarget = async (meshIndex: number, targetIndex: number, weight: number) => {
    if (!this.gltf) return;
    try {
      if (this.gltf.parser && this.gltf.parser.getDependency) {
        const meshObj = await this.gltf.parser.getDependency('mesh', meshIndex);
        if (meshObj) {
          if (meshObj.isMesh && meshObj.morphTargetInfluences) {
            meshObj.morphTargetInfluences[targetIndex] = weight;
          } else {
            meshObj.traverse((child: any) => {
              if (child.isMesh && child.morphTargetInfluences) {
                child.morphTargetInfluences[targetIndex] = weight;
              }
            });
          }
          this.render();
          return;
        }
      }
    } catch (e) {
      console.warn('getDependency mesh failed, falling back to traverse', e);
    }

    this.gltf.scene?.traverse((child: any) => {
      if (child.isMesh && child.morphTargetInfluences) {
        const assoc = this.gltf.parser?.associations?.get(child);
        if (assoc && (assoc.mesh === meshIndex || assoc.meshes === meshIndex)) {
          child.morphTargetInfluences[targetIndex] = weight;
        }
      }
    });
    this.render();
  }

  // マテリアルのアウトラインモードを即時反映（リアルタイムプレビュー）
  setMaterialOutlineMode = (materialName: string, mode: 'none' | 'worldCoordinates' | 'screenCoordinates', materialIndex?: number) => {
    if (!this.gltf || !this.gltf.scene) return;

    this.gltf.scene.traverse((child: any) => {
      if (!child.isMesh || !child.material) return;

      const isMaterialTarget = (mat: any) => {
        if (!mat) return false;
        const baseName = mat.name ? mat.name.replace(/\s*\(Outline\)$/, '') : '';
        if (baseName === materialName) return true;
        if (typeof materialIndex === 'number' && this.gltf.parser?.associations) {
          const assoc = this.gltf.parser.associations.get(mat);
          if (assoc && (assoc.material === materialIndex || assoc.materials === materialIndex)) {
            return true;
          }
        }
        return false;
      };

      if (Array.isArray(child.material)) {
        child.material.forEach((mat: any) => {
          if (isMaterialTarget(mat)) {
            mat.outlineWidthMode = mode;
            if (mode === 'none') {
              mat.outlineWidthFactor = 0;
            }
          }
        });
      } else {
        if (isMaterialTarget(child.material)) {
          const surfaceMaterial = child.material;
          surfaceMaterial.outlineWidthMode = mode;

          if (mode !== 'none') {
            child.material = [surfaceMaterial];
            const outlineMaterial = surfaceMaterial.clone();
            outlineMaterial.name = (surfaceMaterial.name || '') + ' (Outline)';
            outlineMaterial.isOutline = true;
            outlineMaterial.side = THREE.BackSide;
            outlineMaterial.outlineWidthMode = mode;
            if (!outlineMaterial.outlineWidthFactor || outlineMaterial.outlineWidthFactor <= 0) {
              const defaultWidth = (this.currentVrmVersion === 1) ? 0.05 : 0.0015;
              outlineMaterial.outlineWidthFactor = defaultWidth;
            }
            child.material.push(outlineMaterial);

            const geometry = child.geometry;
            if (geometry && (!geometry.groups || geometry.groups.length === 0)) {
              const primitiveVertices = geometry.index ? geometry.index.count : geometry.attributes.position.count / 3;
              geometry.addGroup(0, primitiveVertices, 0);
              geometry.addGroup(0, primitiveVertices, 1);
            }
          }
        }
      }
    });

    this.render();
  }

  // マテリアルのアウトライン太さを即時反映（リアルタイムプレビュー）
  setMaterialOutlineWidth = (materialName: string, width: number, materialIndex?: number) => {
    if (!this.gltf || !this.gltf.scene) return;

    const factor = (this.currentVrmVersion === 1) ? width : width * 0.01;

    this.gltf.scene.traverse((child: any) => {
      if (!child.isMesh || !child.material) return;

      const isMaterialTarget = (mat: any) => {
        if (!mat) return false;
        const baseName = mat.name ? mat.name.replace(/\s*\(Outline\)$/, '') : '';
        if (baseName === materialName) return true;
        if (typeof materialIndex === 'number' && this.gltf.parser?.associations) {
          const assoc = this.gltf.parser.associations.get(mat);
          if (assoc && (assoc.material === materialIndex || assoc.materials === materialIndex)) {
            return true;
          }
        }
        return false;
      };

      if (Array.isArray(child.material)) {
        // 既にアウトライン生成済みのメッシュ
        child.material.forEach((mat: any) => {
          if (isMaterialTarget(mat)) {
            mat.outlineWidthFactor = factor;
          }
        });
      } else {
        // 単一マテリアルの場合
        if (isMaterialTarget(child.material)) {
          const surfaceMaterial = child.material;
          surfaceMaterial.outlineWidthFactor = factor;
        }
      }
    });

    this.render();
  }

  // テクスチャの色調変更をリアルタイムプレビュー（単一または複数）
  previewTexture = (
    payload: any,
    canvasArg?: HTMLCanvasElement
  ) => {
    if (!this.gltf || !this.gltf.scene) return;

    let items: Array<{ imageIndex: number; canvas: HTMLCanvasElement }> = [];
    if (typeof payload === 'number' && canvasArg) {
      items = [{ imageIndex: payload, canvas: canvasArg }];
    } else if (Array.isArray(payload)) {
      items = payload.filter((item: any) => item && typeof item.imageIndex === 'number' && item.canvas);
    } else if (payload && typeof payload.imageIndex === 'number' && payload.canvas) {
      items = [payload];
    }

    if (items.length === 0) return;

    const parser = this.gltf.parser;

    items.forEach(({ imageIndex, canvas }) => {
      // 1. 対象の imageIndex を参照する textureIndex を収集
      const targetTextureIndices = new Set<number>();
      if (VRMParser.json?.textures) {
        VRMParser.json.textures.forEach((tex: any, idx: number) => {
          if (tex.source === imageIndex) {
            targetTextureIndices.add(idx);
          }
        });
      }

      // 2. 対象テクスチャを使用しているマテリアル名およびマテリアルインデックスを収集
      const targetMaterialNames = new Set<string>();
      const targetMaterialIndices = new Set<number>();

      if (VRMParser.json?.materials) {
        VRMParser.json.materials.forEach((mat: any, mIdx: number) => {
          let usesTarget = false;

          // glTF 2.0 pbrMetallicRoughness
          const baseTex = mat.pbrMetallicRoughness?.baseColorTexture?.index;
          if (typeof baseTex === 'number' && targetTextureIndices.has(baseTex)) {
            usesTarget = true;
          }

          // VRM 0.x textureProperties
          if (!usesTarget && mat.textureProperties) {
            Object.values(mat.textureProperties).forEach((tIdx: any) => {
              if (typeof tIdx === 'number' && targetTextureIndices.has(tIdx)) usesTarget = true;
            });
          }

          // VRM 0.x extension
          const vrm0MatProps = VRMParser.json.extensions?.VRM?.materialProperties;
          if (!usesTarget && Array.isArray(vrm0MatProps)) {
            const vrmMat = vrm0MatProps[mIdx] || vrm0MatProps.find((p: any) => p.name === mat.name);
            if (vrmMat?.textureProperties) {
              Object.values(vrmMat.textureProperties).forEach((tIdx: any) => {
                if (typeof tIdx === 'number' && targetTextureIndices.has(tIdx)) usesTarget = true;
              });
            }
          }

          // VRM 1.0 VRMC_materials_mtoon
          const mtoon = mat.extensions?.VRMC_materials_mtoon;
          if (!usesTarget && mtoon) {
            const mtoonProps = [
              'shadeMultiplyTexture',
              'outlineWidthMultiplyTexture',
              'rimMultiplyTexture',
              'matcapTexture',
              'uvAnimationMaskTexture'
            ];
            mtoonProps.forEach((prop) => {
              const tIdx = mtoon[prop]?.index;
              if (typeof tIdx === 'number' && targetTextureIndices.has(tIdx)) usesTarget = true;
            });
          }

          if (usesTarget) {
            targetMaterialIndices.add(mIdx);
            if (mat.name) targetMaterialNames.add(mat.name);
          }
        });
      }

      // 3. Three.jsシーンを走査してテクスチャを置換
      this.gltf.scene.traverse((child: any) => {
        if (!child.isMesh || !child.material) return;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat: any) => {
          const baseMatName = mat.name ? mat.name.replace(/\s*\(Outline\)$/, '') : '';
          const assocMat = parser?.associations?.get(mat);
          const isTargetMat =
            targetMaterialNames.has(baseMatName) ||
            (assocMat && (targetMaterialIndices.has(assocMat.material) || targetMaterialIndices.has(assocMat.materials)));

          const textureProps = [
            'map',
            'shadeMultiplyTexture',
            'outlineWidthMultiplyTexture',
            'rimMultiplyTexture',
            'matcapTexture',
            'emissiveMap'
          ];

          let matTextureUpdated = false;

          textureProps.forEach((prop) => {
            const tex = mat[prop];
            if (!tex || !tex.isTexture) return;

            let isMatch = false;

            // associationsからの照合
            if (parser?.associations) {
              const assoc = parser.associations.get(tex);
              if (assoc && typeof assoc.textures === 'number' && targetTextureIndices.has(assoc.textures)) {
                isMatch = true;
              }
            }

            // マテリアルからの照合（map / shadeMultiplyTexture）
            if (!isMatch && isTargetMat && (prop === 'map' || prop === 'shadeMultiplyTexture')) {
              isMatch = true;
            }

            // 既にこの画像インデックスでプレビュー適用済みのテクスチャ
            if (!isMatch && (tex as any)._targetImageIndex === imageIndex) {
              isMatch = true;
            }

            if (isMatch) {
              if (!(tex as any)._originalImage) {
                (tex as any)._originalImage = tex.image;
                (tex as any)._targetImageIndex = imageIndex;
              }
              tex.image = canvas;
              tex.needsUpdate = true;
              matTextureUpdated = true;
            }
          });

          if (matTextureUpdated) {
            mat.needsUpdate = true;
          }
        });
      });
    });

    this.render();
  };

  // テクスチャのリアルタイムプレビューを元に戻す（単一、複数、または全解除）
  resetTexturePreview = (imageIndex?: number | number[]) => {
    if (!this.gltf || !this.gltf.scene) return;

    const targetIndices = typeof imageIndex === 'number'
      ? [imageIndex]
      : Array.isArray(imageIndex)
        ? imageIndex
        : null;

    this.gltf.scene.traverse((child: any) => {
      if (!child.isMesh || !child.material) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat: any) => {
        const textureProps = [
          'map',
          'shadeMultiplyTexture',
          'outlineWidthMultiplyTexture',
          'rimMultiplyTexture',
          'matcapTexture',
          'emissiveMap'
        ];

        let matTextureRestored = false;

        textureProps.forEach((prop) => {
          const tex = mat[prop];
          if (!tex || !tex.isTexture) return;

          if ((tex as any)._originalImage) {
            const currentImgIdx = (tex as any)._targetImageIndex;
            if (targetIndices === null || targetIndices.includes(currentImgIdx)) {
              tex.image = (tex as any)._originalImage;
              tex.needsUpdate = true;
              delete (tex as any)._originalImage;
              delete (tex as any)._targetImageIndex;
              matTextureRestored = true;
            }
          }
        });

        if (matTextureRestored) {
          mat.needsUpdate = true;
        }
      });
    });

    this.render();
  };

  // 動的エクスプレッションの登録（新規追加したブレンドシェイプを即時プレビュー）
  registerCustomExpression = async (name: string, binds: any[]) => {
    if (!this.gltf || !this.gltf.userData.vrm) return;
    const vrm = this.gltf.userData.vrm;
    if (!vrm.expressionManager) return;

    let expr = vrm.expressionManager.getExpression(name);
    if (expr) {
      vrm.expressionManager.unregisterExpression(expr);
      this.scene.remove(expr);
    }

    expr = new VRMExpression(name);
    this.scene.add(expr);

    for (const bind of binds) {
      const meshIndex = bind.mesh !== undefined ? bind.mesh : (bind.node !== undefined ? bind.node : 0);
      const targetIndex = bind.index !== undefined ? bind.index : 0;
      const bindWeight = (bind.weight !== undefined ? bind.weight : 100) * (bind.weight > 1.0 ? 0.01 : 1.0);

      const primitives: any[] = [];
      if (this.gltf.parser && this.gltf.parser.getDependency) {
        try {
          const meshObj = await this.gltf.parser.getDependency('mesh', meshIndex);
          if (meshObj) {
            if (meshObj.isMesh) primitives.push(meshObj);
            else meshObj.traverse((c: any) => { if (c.isMesh) primitives.push(c); });
          }
        } catch (e) {
          console.warn('Error finding meshObj for bind', e);
        }
      }
      if (primitives.length > 0) {
        expr.addBind(new VRMExpressionMorphTargetBind({
          primitives,
          index: targetIndex,
          weight: bindWeight
        }));
      }
    }

    vrm.expressionManager.registerExpression(expr);
  }

  // 動的エクスプレッションの解除
  unregisterCustomExpression = (name: string) => {
    if (!this.gltf || !this.gltf.userData.vrm) return;
    const vrm = this.gltf.userData.vrm;
    if (!vrm.expressionManager) return;
    const expr = vrm.expressionManager.getExpression(name);
    if (expr) {
      vrm.expressionManager.unregisterExpression(expr);
      this.scene.remove(expr);
    }
  } 

  // 3面図撮影
  captureThreeViews = async () => {
    if (!this.renderer || !this.camera) return;

    // 現在のカメラ位置を保存
    const originalPosition = this.camera.position.clone();
    const originalRotation = this.camera.rotation.clone();
    const originalControlTarget = this.controls.target.clone();

    // モデルのバウンディングボックスを計算
    const box = new THREE.Box3().setFromObject(this.gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // ターゲット設定（モデルの中心）
    const targetY = center.y;
    this.controls.target.set(0, targetY, 0);

    // カメラ距離を動的に計算 (高さに合わせて調整 + マージン)
    const fov = this.camera.fov * (Math.PI / 180);
    let distance = Math.abs((size.y / 2) / Math.tan(fov / 2));
    distance *= 1.2; // マージン

    const height = center.y;   // カメラ高さ (中心と同じにする)

    const views = [
      { x: 0, y: height, z: distance },        // Front
      { x: distance, y: height, z: 0 },        // Left (Side)
      { x: 0, y: height, z: -distance }        // Back
    ];

    const images: string[] = [];
    const canvas = this.renderer.domElement;
    const width = canvas.width;
    const heightPx = canvas.height;

    for (const pos of views) {
      // カメラ移動
      this.camera.position.set(pos.x, pos.y, pos.z);
      this.controls.update(); // OrbitControlsの更新が必要
      
      // レンダリング待機 (念のため)
      await new Promise(resolve => setTimeout(resolve, 100)); 
      this.render();

      // 画像取得
      images.push(canvas.toDataURL("image/png"));
    }

    // 画像結合処理
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = width * 3;
    mergedCanvas.height = heightPx;
    const ctx = mergedCanvas.getContext('2d');
    
    if (ctx) {
      // 背景白塗り（透過画像対策）
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

      for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.src = images[i];
        await new Promise((resolve) => { img.onload = resolve; });
        ctx.drawImage(img, width * i, 0);
      }

      // ダウンロード
      const link = document.createElement("a");
      link.href = mergedCanvas.toDataURL("image/png");
      link.download = "vrm_3views.png";
      link.click();
    }

    // カメラ位置を復元
    this.camera.position.copy(originalPosition);
    this.camera.rotation.copy(originalRotation);
    this.controls.target.copy(originalControlTarget);
    this.controls.update();
    this.render();
  } 

  // 顔にフォーカスする
  public focusFace = () => {
    if (!this.gltf || !this.gltf.userData.vrm) return;
    const vrm = this.gltf.userData.vrm;
    const headNode = vrm.humanoid.getRawBoneNode('head'); // VRM 0.x / 1.0 compatible method provided by library? 
    // If getRawBoneNode is not available on userData.vrm, use vrm.humanoid.getBoneNode
    // Actually @pixiv/three-vrm 2.0 uses vrm.humanoid.getRawBoneNode( VRMHumanoidBoneName.Head ) or similar.
    // Let's assume vrm.humanoid.getRawBoneNode works or fallback.
    
    // Note: vrm instance is from @pixiv/three-vrm.
    // Checking previous code: vrm.expressionManager.setValue exists.
    
    let head = null;
    if (vrm.humanoid.getRawBoneNode) {
        head = vrm.humanoid.getRawBoneNode("head");
    } else if (vrm.humanoid.getBoneNode) {
        head = vrm.humanoid.getBoneNode("head");
    }

    if (head) {
      const headPos = new THREE.Vector3();
      head.getWorldPosition(headPos);

      this.controls.target.copy(headPos);
      
      const fov = this.camera.fov * (Math.PI / 180);
      const faceSize = 0.3; // Approx face height
      let distance = Math.abs((faceSize / 2) / Math.tan(fov / 2));
      distance *= 2.0; // Margin

       // Adjust Z sign based on VRM version
      const sign = (VRMParser.getVRMVersion().version == 1) ? 1.0 : -1.0;

      // X, Y aligned with head, Z offset
      this.camera.position.set(headPos.x, headPos.y, headPos.z + (distance * sign));
      this.controls.update();
    }
  }
  
  // カメラリセット（全体表示）
  public resetCamera = () => {
      this.setCameraTarget(null);
  } 

  // 全表情を撮影してZIPでダウンロード
  public captureBlendShapes = async (names: string[]) => {
      if (!this.gltf || !this.gltf.userData.vrm) return;
      
      const zip = new JSZip();
      
      // 現在の表情を保存（後で戻すため）
      // 厳密には全て0に戻してからの方がいいかも
      
      for (const name of names) {
          // 表情変更
          this.changeBlendShape(name);
          
          // レンダリング待機 (念のため)
          await new Promise(resolve => setTimeout(resolve, 100)); 
          this.render();
          
          // 画像取得
          const canvas = this.renderer.domElement;
          const dataUrl = canvas.toDataURL("image/png");
          const base64 = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
          
          zip.file(`${name}.png`, base64, {base64: true});
      }
      
      // ZIP生成とダウンロード
      zip.generateAsync({type:"blob"})
      .then((content) => {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(content);
          link.download = "blendshapes.zip";
          link.click();
      });
  } 

  // アーマチュア スケルトン表示
  public showArmatureSkeleton = () => {
    if (!this.gltf || !this.gltf.scene) return;
    if (!this.skeletonHelper) {
      this.skeletonHelper = new THREE.SkeletonHelper(this.gltf.scene);
      this.applySkeletonXRay();
      this.scene.add(this.skeletonHelper);
    }
    this.skeletonHelper.visible = true;
    this.render();
  }

  // アーマチュア スケルトン非表示
  public hideArmatureSkeleton = () => {
    if (this.skeletonHelper) {
      this.skeletonHelper.visible = false;
    }
    this.clearBoneHighlight();
    this.render();
  }

  // スケルトン表示切替（ON/OFF）
  public toggleArmatureSkeleton = (visible: boolean) => {
    if (visible) {
      this.showArmatureSkeleton();
    } else {
      if (this.skeletonHelper) {
        this.skeletonHelper.visible = false;
        this.render();
      }
    }
  }

  // X線表示切替
  public setSkeletonXRay = (enabled: boolean) => {
    this.isSkeletonXRay = enabled;
    this.applySkeletonXRay();
    this.render();
  }

  private applySkeletonXRay = () => {
    if (this.skeletonHelper) {
      const mat = this.skeletonHelper.material as any;
      if (mat) {
        mat.depthTest = !this.isSkeletonXRay;
        mat.transparent = true;
        mat.opacity = 0.85;
      }
      this.skeletonHelper.renderOrder = this.isSkeletonXRay ? 998 : 0;
    }
  }

  // ボーンハイライト用のグループ初期化
  private initBoneHighlightGroup = () => {
    if (this.boneHighlightGroup) return;
    this.boneHighlightGroup = new THREE.Group();

    // 座標軸ヘルパー (RGB = XYZ)
    const axes = new THREE.AxesHelper(0.12);
    if (axes.material) {
      (axes.material as any).depthTest = false;
    }
    axes.renderOrder = 999;
    this.boneHighlightGroup.add(axes);

    // 半透明球体マーカー
    const sphereGeo = new THREE.SphereGeometry(0.02, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      wireframe: true,
      depthTest: false,
      transparent: true,
      opacity: 0.9
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.renderOrder = 999;
    this.boneHighlightGroup.add(sphere);

    this.boneHighlightGroup.visible = false;
    this.scene.add(this.boneHighlightGroup);
  }

  // 指定ノードのボーンをハイライト
  public highlightBone = async (nodeIndex: number) => {
    this.initBoneHighlightGroup();
    if (!this.gltf) return;

    let targetNode: any = null;
    if (this.gltf.parser && this.gltf.parser.getDependency) {
      try {
        targetNode = await this.gltf.parser.getDependency('node', nodeIndex);
      } catch (e) {
        console.warn('getDependency node failed, trying scene traverse', e);
      }
    }

    if (!targetNode && this.gltf.scene) {
      this.gltf.scene.traverse((child: any) => {
        const assoc = this.gltf.parser?.associations?.get(child);
        if (assoc && assoc.nodes === nodeIndex) {
          targetNode = child;
        }
      });
    }

    if (targetNode && this.boneHighlightGroup) {
      this.currentHighlightBoneNode = targetNode;
      const worldPos = new THREE.Vector3();
      targetNode.getWorldPosition(worldPos);
      this.boneHighlightGroup.position.copy(worldPos);

      const worldQuat = new THREE.Quaternion();
      targetNode.getWorldQuaternion(worldQuat);
      this.boneHighlightGroup.quaternion.copy(worldQuat);

      this.boneHighlightGroup.visible = true;
      this.render();
    }
  }

  // ハイライト解除
  public clearBoneHighlight = () => {
    if (this.boneHighlightGroup) {
      this.boneHighlightGroup.visible = false;
    }
    this.currentHighlightBoneNode = null;
    this.render();
  }

  // 指定ノードのボーンにカメラをフォーカス
  public focusBone = async (nodeIndex: number) => {
    if (!this.gltf || !this.camera || !this.controls) return;

    let targetNode: any = null;
    if (this.gltf.parser && this.gltf.parser.getDependency) {
      try {
        targetNode = await this.gltf.parser.getDependency('node', nodeIndex);
      } catch (e) {
        console.warn('getDependency node failed', e);
      }
    }

    if (!targetNode && this.gltf.scene) {
      this.gltf.scene.traverse((child: any) => {
        const assoc = this.gltf.parser?.associations?.get(child);
        if (assoc && assoc.nodes === nodeIndex) {
          targetNode = child;
        }
      });
    }

    if (targetNode) {
      const worldPos = new THREE.Vector3();
      targetNode.getWorldPosition(worldPos);

      this.controls.target.copy(worldPos);

      const fov = this.camera.fov * (Math.PI / 180);
      const focusSize = 0.3;
      let distance = Math.abs((focusSize / 2) / Math.tan(fov / 2));
      distance *= 1.8;

      const sign = (VRMParser.getVRMVersion().version == 1) ? 1.0 : -1.0;
      this.camera.position.set(worldPos.x, worldPos.y, worldPos.z + (distance * sign));
      this.controls.update();
      this.render();
    }
  }

  // ===== アクセサリ管理・操作メソッド =====

  // 指定ボーン探索（nodeIndex または boneName）
  public findBoneNode = async (boneName: string, nodeIndex?: number): Promise<any | null> => {
    if (!this.gltf) return null;

    let targetNode: any = null;
    // 1. nodeIndex で探索
    if (nodeIndex !== undefined && nodeIndex !== null && this.gltf.parser && this.gltf.parser.getDependency) {
      try {
        targetNode = await this.gltf.parser.getDependency('node', nodeIndex);
      } catch (e) {
        console.warn('findBoneNode: getDependency node failed', e);
      }
    }

    // 2. humanoidボーン名で探索
    if (!targetNode) {
      const vrm = this.gltf?.userData?.vrm;
      if (vrm?.humanoid) {
        try {
          if (vrm.humanoid.getRawBoneNode) {
            targetNode = vrm.humanoid.getRawBoneNode(boneName.toLowerCase());
          } else if (vrm.humanoid.getBoneNode) {
            targetNode = vrm.humanoid.getBoneNode(boneName.toLowerCase());
          }
        } catch (e) {
          // ignore error if humanoid bone node cannot be retrieved
        }
      }
    }

    // 3. シーングラフ走査
    if (!targetNode && this.gltf.scene) {
      this.gltf.scene.traverse((child: any) => {
        if (targetNode) return;
        if (nodeIndex !== undefined && nodeIndex !== null) {
          const assoc = this.gltf.parser?.associations?.get(child);
          if (assoc && assoc.nodes === nodeIndex) {
            targetNode = child;
            return;
          }
        }
        if (child.name && child.name.toLowerCase() === boneName.toLowerCase()) {
          targetNode = child;
          return;
        }
      });
    }

    return targetNode;
  }

  // アクセサリGLB読み込み・ボーン配下への配置
  public loadAccessory = async (payload: { item: any; buffer: ArrayBuffer }) => {
    const { item, buffer } = payload;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (canvas) {
      this.initTransformControls(canvas);
    }

    const loader = new GLTFLoader();
    loader.parse(
      buffer,
      '',
      async (gltf: any) => {
        const accessoryScene = gltf.scene;
        accessoryScene.name = `accessory_${item.id}`;

        // ボーンを探索して配下に配置
        const boneNode = await this.findBoneNode(item.targetBoneName, item.targetNodeIndex);
        if (boneNode) {
          boneNode.add(accessoryScene);
        } else if (this.gltf && this.gltf.scene) {
          this.gltf.scene.add(accessoryScene);
        } else {
          this.scene.add(accessoryScene);
        }

        // 初期Transform設定
        accessoryScene.position.set(item.position.x, item.position.y, item.position.z);
        accessoryScene.rotation.set(
          item.rotation.x * (Math.PI / 180),
          item.rotation.y * (Math.PI / 180),
          item.rotation.z * (Math.PI / 180)
        );
        accessoryScene.scale.set(item.scale.x, item.scale.y, item.scale.z);

        this.accessoriesMap.set(item.id, {
          id: item.id,
          object: accessoryScene,
          boneNode: boneNode || this.gltf?.scene || this.scene,
          item: item
        });

        this.selectAccessory(item.id);
        this.render();
      },
      (error: any) => {
        console.error('Error parsing accessory GLB', error);
      }
    );
  }

  // アクセサリの配置先ボーン変更
  public changeAccessoryBone = async (payload: { id: string; boneName: string; nodeIndex: number }) => {
    const acc = this.accessoriesMap.get(payload.id);
    if (!acc) return;

    const newBone = await this.findBoneNode(payload.boneName, payload.nodeIndex);
    if (newBone && newBone !== acc.boneNode) {
      acc.boneNode.remove(acc.object);
      newBone.add(acc.object);
      acc.boneNode = newBone;
      if (this.accessoryTransformControls && this.activeAccessoryId === payload.id) {
        this.accessoryTransformControls.attach(acc.object);
      }
      this.render();
    }
  }

  // ギズモ操作時のコールバック（UIへの通知）
  private onAccessoryGizmoChange = () => {
    if (!this.activeAccessoryId) return;
    const acc = this.accessoriesMap.get(this.activeAccessoryId);
    if (!acc || !acc.object) return;

    const pos = acc.object.position;
    const rot = acc.object.rotation;
    const scl = acc.object.scale;

    const position = {
      x: parseFloat(pos.x.toFixed(4)),
      y: parseFloat(pos.y.toFixed(4)),
      z: parseFloat(pos.z.toFixed(4))
    };

    const rotation = {
      x: parseFloat((rot.x * (180 / Math.PI)).toFixed(2)),
      y: parseFloat((rot.y * (180 / Math.PI)).toFixed(2)),
      z: parseFloat((rot.z * (180 / Math.PI)).toFixed(2))
    };

    const scale = {
      x: parseFloat(scl.x.toFixed(4)),
      y: parseFloat(scl.y.toFixed(4)),
      z: parseFloat(scl.z.toFixed(4))
    };

    this.$emit('change-accessory-transform-from-gizmo', {
      id: this.activeAccessoryId,
      position,
      rotation,
      scale
    });
  }

  // UIからのTransform変更を反映
  public setAccessoryTransform = (payload: {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }) => {
    const acc = this.accessoriesMap.get(payload.id);
    if (!acc || !acc.object) return;

    acc.object.position.set(payload.position.x, payload.position.y, payload.position.z);
    acc.object.rotation.set(
      payload.rotation.x * (Math.PI / 180),
      payload.rotation.y * (Math.PI / 180),
      payload.rotation.z * (Math.PI / 180)
    );
    acc.object.scale.set(payload.scale.x, payload.scale.y, payload.scale.z);

    if (this.accessoryTransformControls && this.activeAccessoryId === payload.id) {
      this.accessoryTransformControls.updateMatrixWorld();
    }
    this.render();
  }

  // 操作モード切り替え（translate / rotate / scale）
  public setAccessoryTransformMode = (mode: 'translate' | 'rotate' | 'scale') => {
    if (this.accessoryTransformControls) {
      this.accessoryTransformControls.setMode(mode);
    }
  }

  // アクセサリ選択
  public selectAccessory = (id: string | null) => {
    this.activeAccessoryId = id;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (canvas) {
      this.initTransformControls(canvas);
    }
    if (!this.accessoryTransformControls) return;

    if (id) {
      const acc = this.accessoriesMap.get(id);
      if (acc && acc.object && acc.object.visible) {
        this.accessoryTransformControls.attach(acc.object);
        this.accessoryTransformControls.visible = true;
      } else {
        this.accessoryTransformControls.detach();
      }
    } else {
      this.accessoryTransformControls.detach();
    }
    this.render();
  }

  // ギズモ非表示
  public hideAccessoryGizmo = () => {
    if (this.accessoryTransformControls) {
      this.accessoryTransformControls.detach();
    }
  }

  // ギズモ表示
  public showAccessoryGizmo = () => {
    if (this.activeAccessoryId) {
      this.selectAccessory(this.activeAccessoryId);
    }
  }

  // アクセサリにフォーカス
  public focusAccessory = (id: string) => {
    const acc = this.accessoriesMap.get(id);
    if (!acc || !acc.object || !this.camera || !this.controls) return;

    const worldPos = new THREE.Vector3();
    acc.object.getWorldPosition(worldPos);

    this.controls.target.copy(worldPos);
    const fov = this.camera.fov * (Math.PI / 180);
    const focusSize = 0.4;
    let distance = Math.abs((focusSize / 2) / Math.tan(fov / 2));
    distance *= 1.8;

    const sign = (VRMParser.getVRMVersion().version == 1) ? 1.0 : -1.0;
    this.camera.position.set(worldPos.x, worldPos.y, worldPos.z + (distance * sign));
    this.controls.update();
    this.render();
  }

  // アクセサリ削除
  public removeAccessory = (id: string) => {
    const acc = this.accessoriesMap.get(id);
    if (!acc) return;

    if (this.activeAccessoryId === id) {
      this.hideAccessoryGizmo();
      this.activeAccessoryId = null;
    }

    if (acc.boneNode && acc.object) {
      acc.boneNode.remove(acc.object);
    }

    acc.object.traverse((child: any) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });

    this.accessoriesMap.delete(id);
    this.render();
  }

  // 表示/非表示切り替え
  public toggleAccessoryVisibility = (payload: { id: string; visible: boolean }) => {
    const acc = this.accessoriesMap.get(payload.id);
    if (acc && acc.object) {
      acc.object.visible = payload.visible;
      if (!payload.visible && this.activeAccessoryId === payload.id && this.accessoryTransformControls) {
        this.accessoryTransformControls.detach();
      } else if (payload.visible && this.activeAccessoryId === payload.id && this.accessoryTransformControls) {
        this.accessoryTransformControls.attach(acc.object);
      }
      this.render();
    }
  }

  // 全アクセサリクリア
  public clearAllAccessories = () => {
    this.hideAccessoryGizmo();
    this.accessoriesMap.forEach((acc) => {
      if (acc.boneNode && acc.object) {
        acc.boneNode.remove(acc.object);
      }
      acc.object.traverse((child: any) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    });
    this.accessoriesMap.clear();
    this.activeAccessoryId = null;
  }

  // ===== モーション（VRMA）管理・操作メソッド =====

  // VRMA ファイルを読み込み
  public loadVRMA = async (file: File | string): Promise<{ fileName: string; duration: number; trackCount: number }> => {
    let path: string;
    let fileName = '';
    if (file instanceof File) {
      path = URL.createObjectURL(file);
      fileName = file.name;
    } else {
      path = file;
      fileName = file.split('/').pop() || 'motion.vrma';
    }
    this.currentVrmaFileName = fileName;

    const gltf = await this.loader.loadAsync(path);
    const vrmAnimations = gltf.userData.vrmAnimations;
    if (!vrmAnimations || vrmAnimations.length === 0) {
      throw new Error('No VRM Animation found in file');
    }
    const vrmAnimation = vrmAnimations[0];
    this.currentVrmAnimation = vrmAnimation;

    if (this.gltf && this.gltf.userData && this.gltf.userData.vrm) {
      this.applyVrmAnimationToVrm(vrmAnimation, this.gltf.userData.vrm);
    }

    const duration = this.currentClip ? this.currentClip.duration : (vrmAnimation.duration || 0);
    const trackCount = this.currentClip ? this.currentClip.tracks.length : 0;

    return { fileName, duration, trackCount };
  }

  // VRMAnimation を VRM モデルに適用
  public applyVrmAnimationToVrm = (vrmAnimation: any, vrm: any) => {
    if (this.currentMixer) {
      this.currentMixer.stopAllAction();
    }
    const clip = createVRMAnimationClip(vrmAnimation, vrm);
    this.currentClip = clip;
    this.currentMixer = new THREE.AnimationMixer(vrm.scene);
    this.currentAction = this.currentMixer.clipAction(clip);
    this.currentAction.setLoop(this.isMotionLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    this.currentAction.clampWhenFinished = true;
    this.currentAction.timeScale = this.motionPlaybackSpeed;

    this.currentMixer.addEventListener('finished', () => {
      this.isMotionPlaying = false;
      this.$emit('motion-state-change', {
        isPlaying: false,
        currentTime: this.currentClip ? this.currentClip.duration : 0,
      });
    });

    if (this.isMotionPlaying) {
      this.currentAction.play();
    }
  }

  // モーション再生
  public playMotion = () => {
    if (!this.currentAction || !this.currentMixer) return;
    if (!this.isMotionPlaying) {
      if (!this.isMotionLoop && this.currentClip && this.currentAction.time >= this.currentClip.duration) {
        this.currentAction.time = 0;
      }
      this.currentAction.paused = false;
      this.currentAction.play();
      this.isMotionPlaying = true;
      this.$emit('motion-state-change', { isPlaying: true });
    }
  }

  // モーション一時停止
  public pauseMotion = () => {
    if (!this.currentAction) return;
    this.currentAction.paused = true;
    this.isMotionPlaying = false;
    this.$emit('motion-state-change', { isPlaying: false });
  }

  // モーション停止
  public stopMotion = () => {
    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction.time = 0;
    }
    this.isMotionPlaying = false;
    this.resetMotionPose();
    this.$emit('motion-state-change', { isPlaying: false, currentTime: 0 });
  }

  // シーク位置変更
  public seekMotion = (time: number) => {
    if (!this.currentMixer || !this.currentAction) return;
    const clampedTime = Math.max(0, Math.min(time, this.currentClip ? this.currentClip.duration : time));
    this.currentMixer.setTime(clampedTime);
    this.currentAction.time = clampedTime;
    if (this.gltf && this.gltf.userData && this.gltf.userData.vrm) {
      this.gltf.userData.vrm.update(0);
    }
  }

  // 再生速度設定
  public setMotionSpeed = (speed: number) => {
    this.motionPlaybackSpeed = speed;
    if (this.currentAction) {
      this.currentAction.timeScale = speed;
    }
  }

  // ループ設定
  public setMotionLoop = (loop: boolean) => {
    this.isMotionLoop = loop;
    if (this.currentAction) {
      this.currentAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    }
  }

  // ポーズを初期姿勢（T-Pose/Rest Pose）にリセット
  public resetMotionPose = () => {
    if (!this.gltf || !this.gltf.userData || !this.gltf.userData.vrm) return;
    const vrm = this.gltf.userData.vrm;
    if (vrm.humanoid) {
      vrm.humanoid.resetNormalizedPose();
    }
    if (vrm.expressionManager) {
      vrm.expressionManager.expressions.forEach((exp: any) => {
        exp.clearAppliedWeight();
      });
      vrm.expressionManager.update();
    }
    vrm.update(0);
    this.render();
  }

  // スプリングボーンのリアルタイム設定更新
  public updateSpringBoneLive = (targetBoneNames: string[], settings: { gravityPower: number; hitRadius: number }) => {
    if (!this.gltf || !this.gltf.userData || !this.gltf.userData.vrm) return;
    const vrm = this.gltf.userData.vrm;
    const manager = vrm.springBoneManager;
    if (!manager || !manager.joints) return;

    const targetSet = new Set((targetBoneNames || []).map(n => n.toLowerCase()));
    const isSkirtTarget = targetSet.has('skirt') || targetBoneNames.length === 0;

    manager.joints.forEach((joint: any) => {
      const boneName = joint.bone?.name?.toLowerCase() || '';
      const isMatch = targetSet.has(boneName) || (isSkirtTarget && boneName.includes('skirt'));

      if (isMatch) {
        if (typeof settings.gravityPower === 'number') {
          joint.settings.gravityPower = settings.gravityPower;
        }
        if (typeof settings.hitRadius === 'number') {
          joint.settings.hitRadius = settings.hitRadius;
        }
      }
    });
  }

  // ポリゴン削減プレビュー用キャッシュ
  private originalIndicesMap: Map<string, any> = new Map();

  getThreeMeshPrimitives = async (meshIndex: number): Promise<any[]> => {
    const primitives: any[] = [];
    if (this.gltf?.parser && this.gltf.parser.getDependency) {
      try {
        const meshObj = await this.gltf.parser.getDependency('mesh', meshIndex);
        if (meshObj) {
          if (meshObj.isMesh) {
            primitives.push(meshObj);
          } else {
            meshObj.traverse((c: any) => {
              if (c.isMesh) primitives.push(c);
            });
          }
        }
      } catch (e) {
        console.warn('getDependency mesh failed for index', meshIndex, e);
      }
    }
    return primitives;
  };

  previewPolygonReduction = async (
    payload: {
      meshIndex: number;
      primitiveIndex: number;
      newIndices: Uint16Array | Uint32Array;
    }[]
  ) => {
    if (!this.gltf) return;

    for (const item of payload) {
      const key = `${item.meshIndex}_${item.primitiveIndex}`;
      const prims = await this.getThreeMeshPrimitives(item.meshIndex);
      const primMesh = prims[item.primitiveIndex];
      if (!primMesh || !primMesh.geometry) continue;

      if (!this.originalIndicesMap.has(key)) {
        this.originalIndicesMap.set(key, primMesh.geometry.index);
      }

      primMesh.geometry.index = new (THREE as any).BufferAttribute(item.newIndices, 1);
      primMesh.geometry.index.needsUpdate = true;
    }
  };

  resetPolygonReductionPreview = async () => {
    if (this.originalIndicesMap.size === 0) return;

    for (const [key, origIndex] of this.originalIndicesMap.entries()) {
      const [mIdxStr, pIdxStr] = key.split('_');
      const prims = await this.getThreeMeshPrimitives(Number(mIdxStr));
      const primMesh = prims[Number(pIdxStr)];
      if (primMesh && primMesh.geometry) {
        primMesh.geometry.index = origIndex;
        primMesh.geometry.index.needsUpdate = true;
      }
    }
    this.originalIndicesMap.clear();
  };

  setWireframeMode = (enabled: boolean) => {
    if (!this.gltf?.scene) return;
    this.gltf.scene.traverse((obj: any) => {
      if (obj.isMesh && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: any) => {
            m.wireframe = enabled;
          });
        } else {
          obj.material.wireframe = enabled;
        }
      }
    });
  };
}
</script>

<style scoped>
  #canvas {
    margin: 0 auto;
    width: 600px;
    height: 540px;

    background-color: gray;
  }
  
  @media screen and (max-width: 480px) { 
    #canvas {    
      width: 300px;
      height: 400px;
    }
  }
</style>
