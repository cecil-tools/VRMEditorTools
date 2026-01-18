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
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import JSZip from 'jszip';

import VRMParser from '@/module/VRMParser'

@Component({})
export default class VRMViewThree extends Vue {
  renderer: any | null = null;
  scene = new THREE.Scene();
  camera: any | null = null;
  controls: any | null = null;
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

  // 球体メッシュを生成
  createSphere = (name: any, position: any, color: any, size: number) => {
    return null;
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
    fun: 'happy',
    happy: 'happy',
    joy: 'relaxed',
    relaxed: 'relaxed',    
    sorrow: 'sorrow',
    surprised: 'surprised',
    lookup: 'lookUp',
    lookdown: 'lookDown',
    lookleft: 'lookLeft',
    lookright: 'lookRight',
    blinkleft: 'blinkLeft',
    blinkright: 'blinkRight',
    blink_l: 'blinkLeft',
    blink_r: 'blinkRight',    
  }

  // 表情変更
  changeBlendShape = (name: string) => {
    // console.log('changeBlendShape', name, this.gltf.userData.vrm)
    const vrm = this.gltf.userData.vrm;
    
    // 表情 リセット
    for (const expression of vrm.expressionManager.expressions) {
      // console.log(' expression: ', expression.expressionName);
      vrm.expressionManager.setValue(expression.expressionName, 0.0);
    }

  // 表情変更
    const key = name.toLocaleLowerCase()
    vrm.expressionManager.setValue(this.BLEND_SHAPE_GROUPS[key], 1.0);
    vrm.expressionManager.update();
    this.render();
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
