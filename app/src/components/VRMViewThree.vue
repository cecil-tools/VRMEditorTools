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
    // VRM 1.0 の場合 カメラ位置を調整する
    this.camera.position.z = (VRMParser.getVRMVersion().version == 1) ? 1.0 : - 1.5;
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
