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

        // セシル系で服がズレるので Armature を 取り出して hips 位置を調整
        if (node) {
          // TODO "Cecil"
          const armature = node._children.filter((c: any) => {
            return (c.name == 'Armature')
          })[0]
          console.log('Armature', armature)
          if (armature){
            // Hips
            const hips = armature._children.filter((c: any) => {
              return (c.name == 'Hips')
            })[0]
            console.log('Hips', hips)
            if (hips) {
              hips.position.y = 0.0
              // Hips -> BoneRootXXX
              const boneRoot = hips._children.filter((c: any) => {
                return (c.name.indexOf('BoneRoot') != -1)
              })[0]
              console.log('boneRoot', boneRoot)
              if (boneRoot) {
                boneRoot.position.y = 0.0
              }
              /*
              //Hips -> Spine -> Spine1 -> Spine2 -> Neck -> Head -> KamiAll -> KamiMakerDRoot
              const kamiAll = hips._children.filter((c: any) => {
                return (c.name == 'Spine')
              })[0]._children.filter((c: any) => {
                return (c.name == 'Spine1')
              })[0]._children.filter((c: any) => {
                return (c.name == 'Spine2')
              })[0]._children.filter((c: any) => {
                return (c.name == 'Neck')
              })[0]._children.filter((c: any) => {
                return (c.name == 'Head')
              })[0]._children.filter((c: any) => {
                return (c.name == 'KamiAll')
              })[0]
              console.log('kamiAll', kamiAll)
              if (kamiAll) {
                console.log('kamiAll -> position', kamiAll.position)
                kamiAll.position.y = 0.4
              }
              */
            }
          }
        }

        console.log('meshes', scene.meshes)
        const meshe = scene.meshes.filter((m: any) => {
          return (m.name == '__root__')
        })[0]
        meshe.position.y = 0.0
      })
  }

  // firstPersonBoneOffset 位置に球体を表示数する
  drawFirstPerson(vrmJson: any) {
    console.log('drawFirstPerson', vrmJson)

    const extVRM = vrmJson.extensions.VRM
    const firstPersonBone = vrmJson.nodes[extVRM.firstPerson.firstPersonBone]
    const firstPersonBoneOffset = extVRM.firstPerson.firstPersonBoneOffset
    console.log('firstPersonBone', firstPersonBone)
    console.log('firstPersonBoneOffset', firstPersonBoneOffset)

    // 球体メッシュを生成
    const scale = 0.03
    const sphere = BABYLON.MeshBuilder.CreateSphere('firstPerson', {diameter: scale}, this._scene)

    // 球体の色を設定
    const materialSphere1 = new BABYLON.StandardMaterial("texture1", this._scene)
    materialSphere1.diffuseColor = BABYLON.Color3.Red()
    sphere.material = materialSphere1

    // TODO 球体の位置を調整する
    sphere.position.x = 0
    sphere.position.y = 0
    sphere.position.z = 0
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
