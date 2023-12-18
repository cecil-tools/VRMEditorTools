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

@Component({})
export default class VRMViewThree extends Vue {
  renderer: any | null = null;
  scene = new THREE.Scene();
  camera: any | null = null;
  loader = new GLTFLoader();
  gltf: any = null;

  _engine: any = null

  @Prop()
  debug!: boolean

  @Prop()
  path!: string
 
  render = () => {
    if (this.renderer == null) return;
    this.renderer.render(this.scene, this.camera!);
  }

  initScene = () => {
    const viewerElement = document.getElementById("canvas");
    if (viewerElement == null) return;

    // renderer が初期化済みなら何もしない
    if (this.renderer != null) return;

    /*
    this.loader.register((parser: any) => {
      return new VRMLoaderPlugin(parser);
    });
    */

    // renderer 初期設定
    this.renderer = new THREE.WebGLRenderer({
      canvas: viewerElement,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(viewerElement.clientWidth, viewerElement.clientHeight);
    this.renderer.setClearColor(0x7fbfff, 1.0);

    const canvas = this.renderer.domElement;

    // カメラを作成 
    this.camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 1, -1);
    this.camera.rotation.set(0, Math.PI, 0);
            
    // ライトを作成
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(-1, 1, -1).normalize();
    this.scene.add(light);

    // コントローラー
    const controls = new OrbitControls(this.camera, canvas);
    controls.target.y = 1.0;
    controls.update();

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

      this.loader.load(
        path,
        (gltf: any) => {
          console.log('gltf', gltf)
          this.gltf = gltf;
          // VRM モデルをシーンに追加
          this.scene.add(gltf.scene);
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
    console.log('setCameraTarget');
  }

  // 球体メッシュを生成
  createSphere = (name: any, position: any, color: any, size: number) => {
    return null;
  }

  // firstPersonBoneOffset 位置に球体を表示数する
  drawFirstPerson = (vrmJson: any) => {
    console.log('drawFirstPerson', vrmJson);  
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
