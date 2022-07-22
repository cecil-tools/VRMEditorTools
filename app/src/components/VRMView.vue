<template>
  <div class="vrmview">
    <canvas id="canvas" ref="canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import * as BABYLON from 'babylonjs'
import 'babylonjs-loaders'
import 'babylon-vrm-loader'

@Component({
  components: {
  } 
})
export default class VRMView extends Vue {
  _scene: any = null
  _engine: any = null

  @Prop()
  debug!: boolean

  @Prop()
  path!: string
 
  initScene() {
    if (this._scene){
      // Releases all held resources
      this._scene.dispose()
    }

    const canvas: any = this.$refs.canvas
    this._engine = new BABYLON.Engine(canvas)

    // シーンを作成
    this._scene = new BABYLON.Scene(this._engine)

    if (this.debug == true) {
      // シーンのレンダリングをデバッグ
      this._scene.debugLayer.show({
        embedMode: false,
        showExplorer: true
      })
    }

    // カメラを作成 ArcRotateCamera
    this._scene.createDefaultCameraOrLight(true, true, true)
    this._scene.activeCamera.alpha = - Math.PI/2
    this._scene.activeCamera.radius = 2.5
    
    // ライトを作成
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this._scene)

    this._engine.runRenderLoop(() => {
      this._scene.render()
    });
    
    window.addEventListener('resize', () => {
      this._engine.resize()
    });    
  }

  // VRM 読み込み
  async drawVrm(sceneFilename: string | File) {
    console.log('drawVrm', sceneFilename)
    
    // 表示の初期化
    this.initScene();

    BABYLON.SceneLoader.AppendAsync(".", sceneFilename, this._scene, null, ".glb")
      .then((scene: any) => {
        console.log('scene', scene)

        const node = scene.rootNodes.filter((n: any) => {
          return (n.name == '__root__')
        })[0]
        console.log('node', node)

        // Armature を 取り出す
        if (node) {
          const armature = node._children.filter((c: any) => {
            return (c.name == 'Armature')
          })[0]
          console.log('Armature', armature)
          const hips = armature._children.filter((c: any) => {
            return (c.name == 'Hips')
          })[0]
          console.log('Hips', hips)
          hips.position.y = 0.0
        }

        console.log('meshes', scene.meshes)
        const meshe = scene.meshes.filter((m: any) => {
          return (m.name == '__root__')
        })[0]
        meshe.position.y = 0.0
      })
  }

  drawFirstPerson(firstPerson: any) {
    console.log('drawFirstPerson', firstPerson)
    // lookAtTypeName
    // firstPersonBone
  }
}
</script>

<style scoped>
  #canvas {    
    width: 300px;
    height: 400px;

    background-color: gray;
  }
</style>
