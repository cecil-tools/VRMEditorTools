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
    if (this._scene) {
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
    // this._scene.activeCamera.alpha = BABYLON.Tools.ToRadians(0)
    this._scene.activeCamera.beta = BABYLON.Tools.ToRadians(70)
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
  async drawVrm(sceneFilename: string | File): Promise<void> {
    console.log('drawVrm', sceneFilename)
    return new Promise((resolve, reject) => {
      // 表示の初期化
      this.initScene();

      BABYLON.SceneLoader.AppendAsync(".", sceneFilename, this._scene, null, ".glb")
        .then((scene: any) => {
          console.log('scene', scene)
          // セシル系で服がズレるので Armature を 取り出して Hips 位置を調整
          // Armature と Hips の座標を書き換えてみる          
          const armatureNode = scene.transformNodes.filter((n: any) => {
            return (n.name == 'Armature')
          })[0]
          if (armatureNode) {
            const hipsNode = scene.transformNodes.filter((n: any) => {
              return (n.name == 'Hips')
            })[0]
            hipsNode.position.x = 0
            hipsNode.position.y = 0
            hipsNode.position.z = 0
          }
          resolve();
        })
    })
  }

  // カメラのターゲット変更する
  setCameraTarget(vrmJson: any) {
    console.log('setCameraTarget')
    const targetBoneName = 'hips' // hips head
    const transformNodes = this._scene.transformNodes
    const extVRM = vrmJson.extensions.VRM

    if (extVRM) {
      const humanBones = extVRM.humanoid.humanBones
      humanBones.forEach((humanBone: any) => {
        const bone = humanBone.bone;
        if (targetBoneName == bone) {
          const node = vrmJson.nodes[humanBone.node]
          const transformNode = transformNodes.filter((n: any) => {
            return (n.name == node.name)
          })[0]
          const position = transformNode.absolutePosition;
          this._scene.activeCamera.setTarget(new BABYLON.Vector3(
            position.x,
            position.y,
            position.z
          ));
        }
      })
    }
  }

  // 球体メッシュを生成
  createSphere(name: any, position: any, color: BABYLON.Color3, size: number) {
    // 球体メッシュを生成
    const sphere = BABYLON.MeshBuilder.CreateSphere(name, { diameter: size }, this._scene)
    // 球体の位置を設定
    sphere.position.x = position.x;
    sphere.position.y = position.y;
    sphere.position.z = position.z;

    // 球体の色を設定
    const material = new BABYLON.StandardMaterial(`material-${name}`, this._scene)
    material.diffuseColor = color
    sphere.material = material
    return sphere
  }

  // firstPersonBoneOffset 位置に球体を表示数する
  drawFirstPerson(vrmJson: any) {
    console.log('drawFirstPerson', vrmJson)

    const extVRM = vrmJson.extensions.VRM

    if (extVRM) {
      const firstPersonBone = vrmJson.nodes[extVRM.firstPerson.firstPersonBone]
      const firstPersonBoneOffset = extVRM.firstPerson.firstPersonBoneOffset
      console.log('firstPersonBone', firstPersonBone)
      console.log('firstPersonBoneOffset', firstPersonBoneOffset)

      // 実際に表示されているモデルの表示位置を取得するために transformNodes を取り出す
      const transformNodes = this._scene.transformNodes

      // firstPersonBone.name と一致する transformNode を取得する
      const transformNode = transformNodes.filter((n: any) => {
        return (n.name == firstPersonBone.name)
      })[0]
      const position = {
        x: transformNode.absolutePosition.x + firstPersonBoneOffset.x * -1.0,
        y: transformNode.absolutePosition.y + firstPersonBoneOffset.y,
        z: transformNode.absolutePosition.z + firstPersonBoneOffset.z
      }
      console.log('firstPersonBone position', position)
      // const sphere = this.createSphere('firstPerson', position, BABYLON.Color3.Red(), 0.05)
      // TODO firstPerson sphere を gizmos 表示する

      /*
      // 試しに humanBones の位置に 球体を置いてみる
      const humanBones = extVRM.humanoid.humanBones
      humanBones.forEach((humanBone: any) => {
        const name = humanBone.bone;
        const node = vrmJson.nodes[humanBone.node]
        // console.log('humanBone', name, node)
        // node.name と一致する transformNode を取得する
        const transformNode = transformNodes.filter((n: any) => {
          return (n.name == node.name)
        })[0]
        const position = transformNode.absolutePosition;
  
        // 球体を表示
        this.createSphere(name, position, BABYLON.Color3.Blue(), 0.03)
      })
      */
    }
  }
}
</script>

<style scoped>
#canvas {
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
