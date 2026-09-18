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

    this.update();
  }

  //フレーム更新
  update = () => {
      requestAnimationFrame(this.update);
      this.render();
  }

  // VRM 読み込み
  drawVrm = async (sceneFilename: string | File): Promise<void> => {
    console.log('drawVrm', sceneFilename)
    return new Promise((resolve, reject) => {
      // 表示の初期化
      this.initScene();
      this.hideFirstPersonGizmo();
      
      // シーンから VRMを削除
      if (this.gltf != null) {
        this.scene.remove(this.gltf.scene);
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

      this.loader.register((parser: any) => {
        return new VRMLoaderPlugin(parser);
      });
      this.loader.load(
        path,
        (gltf: any) => {
          console.log('gltf', gltf)
          // VRM モデルをシーンに追加
          this.scene.add(gltf.scene)
          this.gltf = gltf;
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
