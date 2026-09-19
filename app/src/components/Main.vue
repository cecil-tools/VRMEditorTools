<template>
  <div class="main">
    <div class="container vrmviewContainer">
      <FileUpload :changeFile="changeFile" />
      <VRMView ref="vrmview" :path="path" :debug="false" @change-first-person-offset="onChangeFirstPersonFromGizmo" />
      <div>
        <label for="btnExport">{{$t('btnExport')}}</label>
        <input id="btnExport" type="button" @click="clickExport" />
      </div>
      <div>
        <label for="btnCapture3Views">3面図保存</label>
        <input id="btnCapture3Views" type="button" @click="clickCapture3Views" />
      </div>
    </div>
    <div class="container vrmparserContainer">
      <VRMParserView ref="vrmparser" :drawVrm="drawVrm" :drawFirstPerson="drawFirstPerson" :changeBlendShape="changeBlendShape" @select-tab="onSelectTab" @download-all-blendshapes="onDownloadAllBlendShapes" @change-first-person-offset="onChangeFirstPersonFromUI" @focus-first-person="onFocusFirstPerson" @change-blendshape-weight="onChangeBlendShapeWeight" @reset-all-blendshapes="onResetAllBlendShapes" @preview-morph-target="onPreviewMorphTarget" @register-custom-expression="onRegisterCustomExpression" @unregister-custom-expression="onUnregisterCustomExpression" @select-bone="onSelectBone" @focus-bone="onFocusBone" @toggle-skeleton="onToggleSkeleton" @toggle-xray="onToggleXRay" />
    </div>
</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import FileUpload from '@/components/FileUpload.vue'
import VRMParserView from '@/components/VRMParserView.vue'

import VRMView from '@/components/VRMViewThree.vue'

@Component({
  components: {
    VRMView,
    FileUpload,
    VRMParserView
  } 
})
export default class Main extends Vue {
  path = "./res/pk03.vrm"

  // アップロードされたファイル
  selectVrmFile?: File | null = null

  mounted() {
    // VRM 読み込み
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.drawVrm( this.path )
      .then(() => {
        fetch(this.path)
          .then((res) => res.blob())
          .then(blob => {            
            // VRMパース
            const vrmparser = this.$refs.vrmparser as VRMParserView    
            vrmparser.parse( new File([blob], 'vrm') )
          })
      })
      .catch((e) => {
        console.log(e)
      })
  }

  changeFile(event: any) {
    console.log('changeFile', event)
    this.selectVrmFile = event.target.files[0]
    // VRM 読み込み
    this.drawVrm( this.selectVrmFile! )
  }

  clickExport() {
    const vrmparser = this.$refs.vrmparser as VRMParserView
    vrmparser.downloadFile()
  }

  clickCapture3Views() {
    const vrmview = this.$refs.vrmview as any
    if (vrmview.captureThreeViews) {
        vrmview.captureThreeViews();
    } else {
        console.error("captureThreeViews method not found on VRMView");
    }
  }

  drawVrm(file: File) {
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.drawVrm( file )
      .then(() => {
          // VRMパース
          const vrmparser = this.$refs.vrmparser as VRMParserView    
          vrmparser.parse( file )
            .then((json) => {
              // カメラ位置を調整する
              vrmview.setCameraTarget(json);
            })
        })
        .catch((e) => {
          console.log(e)
        })
  }

  drawFirstPerson(vrmJson: any) {
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.drawFirstPerson(vrmJson)
  }

  // 表情変更
  changeBlendShape(name: string) {
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.changeBlendShape(name)
  }

  // タブ切り替えイベント
  onSelectTab(type: string) {
    const vrmview = this.$refs.vrmview as any
    const vrmparser = this.$refs.vrmparser as any
    if (type === 'tab_blendshape') {
      if (vrmview.hideFirstPersonGizmo) {
        vrmview.hideFirstPersonGizmo();
      }
      if (vrmview.hideArmatureSkeleton) {
        vrmview.hideArmatureSkeleton();
      }
      if (vrmview.focusFace) {
        vrmview.focusFace();
      }
    } else if (type === 'tab_armature') {
      if (vrmview.hideFirstPersonGizmo) {
        vrmview.hideFirstPersonGizmo();
      }
      if (vrmview.showArmatureSkeleton) {
        vrmview.showArmatureSkeleton();
      }
    } else if (type === 'tab_first_person') {
      if (vrmview.hideArmatureSkeleton) {
        vrmview.hideArmatureSkeleton();
      }
      if (vrmview.showFirstPersonGizmo && vrmparser) {
        vrmview.showFirstPersonGizmo(vrmparser.firstPerson, vrmparser.vrmVersion);
      }
    } else {
      if (vrmview.hideFirstPersonGizmo) {
        vrmview.hideFirstPersonGizmo();
      }
      if (vrmview.hideArmatureSkeleton) {
        vrmview.hideArmatureSkeleton();
      }
      if (vrmview.resetCamera) {
          vrmview.resetCamera();
      }
    }
  }

  // ギズモドラッグによるオフセット変更をUIへ反映
  onChangeFirstPersonFromGizmo(offset: { x: number, y: number, z: number }) {
    const vrmparser = this.$refs.vrmparser as any;
    if (vrmparser && vrmparser.updateFirstPersonFromGizmo) {
      vrmparser.updateFirstPersonFromGizmo(offset);
    }
  }

  // UI操作によるオフセット変更を3Dビュー（ギズモ）へ反映
  onChangeFirstPersonFromUI(offset: { x: number, y: number, z: number }) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setFirstPersonOffset) {
      vrmview.setFirstPersonOffset(offset);
    }
  }

  // 視点位置へのカメラフォーカス
  onFocusFirstPerson() {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.focusFirstPerson) {
      vrmview.focusFirstPerson();
    }
  }

  onDownloadAllBlendShapes(names: string[]) {
      const vrmview = this.$refs.vrmview as any
      if (vrmview.captureBlendShapes) {
          vrmview.captureBlendShapes(names);
      }
  }

  onChangeBlendShapeWeight(payload: { name: string, weight: number }) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setBlendShapeWeight) {
      vrmview.setBlendShapeWeight(payload.name, payload.weight);
    }
  }

  onResetAllBlendShapes() {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.resetAllBlendShapes) {
      vrmview.resetAllBlendShapes();
    }
  }

  onPreviewMorphTarget(payload: { meshIndex: number, targetIndex: number, weight: number }) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.previewMorphTarget) {
      vrmview.previewMorphTarget(payload.meshIndex, payload.targetIndex, payload.weight);
    }
  }

  onRegisterCustomExpression(payload: { name: string, binds: any[] }) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.registerCustomExpression) {
      vrmview.registerCustomExpression(payload.name, payload.binds);
    }
  }

  onUnregisterCustomExpression(name: string) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.unregisterCustomExpression) {
      vrmview.unregisterCustomExpression(name);
    }
  }

  onSelectBone(nodeIndex: number) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.highlightBone) {
      vrmview.highlightBone(nodeIndex);
    }
  }

  onFocusBone(nodeIndex: number) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.focusBone) {
      vrmview.focusBone(nodeIndex);
    }
  }

  onToggleSkeleton(enabled: boolean) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.toggleArmatureSkeleton) {
      vrmview.toggleArmatureSkeleton(enabled);
    }
  }

  onToggleXRay(enabled: boolean) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setSkeletonXRay) {
      vrmview.setSkeletonXRay(enabled);
    }
  }
}
</script>

<style scoped lang="scss">
  .main {
    display: flex;
    justify-content: center;
    /* width: 915px; */
    margin: 0 auto;
    /* background-color: aqua; */
    .container {
      /* width: 300px; */
      width: 100%;

      label {
        font-size: large;
        border: solid 3px #AAAAAA;
        background-color: #F0F0F0;
        display: block;
        width: 90%;
        margin: 5px auto;
        transition: .3s;
      }
      label:hover {
        background-color: #AAAAAA;
      }
      input[type="button"] {
        /* font-size: large; */
        display:none; 
      }
    }
  }
  
  @media screen and (max-width: 480px) { 
    .main {
      flex-direction: column;
      .container {
        width: 300px;
        margin: 0 auto;
      }
    }
  }

  /*
  @media screen and (max-width: 767px) {
    .main {
      flex-direction: column;

      .container {
        width: 100%;
      }
    }
  }
  */
</style>
