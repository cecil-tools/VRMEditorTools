<template>
  <div class="main">
    <div class="container vrmviewContainer" @dragover.prevent @drop.prevent="onContainerDrop">
      <FileUpload :changeFile="changeFile" />
      <VRMView ref="vrmview" :path="path" :debug="false" @change-first-person-offset="onChangeFirstPersonFromGizmo" @change-accessory-transform-from-gizmo="onChangeAccessoryTransformFromGizmo" @motion-time-update="onMotionTimeUpdate" @motion-state-change="onMotionStateChange" />
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
      <VRMParserView ref="vrmparser" :drawVrm="drawVrm" :drawFirstPerson="drawFirstPerson" :changeBlendShape="changeBlendShape" :motionInfo="motionInfo" :isMotionPlaying="isMotionPlaying" :motionCurrentTime="motionCurrentTime" :motionDuration="motionDuration" @select-tab="onSelectTab" @download-all-blendshapes="onDownloadAllBlendShapes" @change-first-person-offset="onChangeFirstPersonFromUI" @focus-first-person="onFocusFirstPerson" @change-blendshape-weight="onChangeBlendShapeWeight" @reset-all-blendshapes="onResetAllBlendShapes" @preview-morph-target="onPreviewMorphTarget" @register-custom-expression="onRegisterCustomExpression" @unregister-custom-expression="onUnregisterCustomExpression" @select-bone="onSelectBone" @focus-bone="onFocusBone" @toggle-skeleton="onToggleSkeleton" @toggle-xray="onToggleXRay" @preview-material-outline-width="onPreviewMaterialOutlineWidth" @preview-material-outline-mode="onPreviewMaterialOutlineMode" @preview-texture="onPreviewTexture" @reset-texture-preview="onResetTexturePreview" @load-accessory="onLoadAccessory" @select-accessory="onSelectAccessory" @toggle-accessory-visibility="onToggleAccessoryVisibility" @remove-accessory="onRemoveAccessory" @focus-accessory="onFocusAccessory" @change-accessory-bone="onChangeAccessoryBone" @change-accessory-mode="onChangeAccessoryMode" @change-accessory-transform="onChangeAccessoryTransform" @activate-accessory-mode="onActivateAccessoryMode" @merge-accessories-to-vrm="onMergeAccessoriesToVRM" @load-vrma="onLoadVRMA" @play-motion="onPlayMotion" @pause-motion="onPauseMotion" @stop-motion="onStopMotion" @seek-motion="onSeekMotion" @set-motion-speed="onSetMotionSpeed" @set-motion-loop="onSetMotionLoop" @reset-motion-pose="onResetMotionPose" @preview-spring-bone="onPreviewSpringBone" />
    </div>
</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import FileUpload from '@/components/FileUpload.vue'
import VRMParserView from '@/components/VRMParserView.vue'
import VRMView from '@/components/VRMViewThree.vue'
import VRMParser from '@/module/VRMParser'

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

  // モーション管理ステート
  motionInfo: { fileName: string; duration: number; trackCount: number } | null = null;
  isMotionPlaying = false;
  motionCurrentTime = 0;
  motionDuration = 0;

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
    if (vrmview.hideAccessoryGizmo && type !== 'tab_accessory') {
      vrmview.hideAccessoryGizmo();
    }
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
    } else if (type === 'tab_accessory') {
      if (vrmview.hideFirstPersonGizmo) {
        vrmview.hideFirstPersonGizmo();
      }
      if (vrmview.hideArmatureSkeleton) {
        vrmview.hideArmatureSkeleton();
      }
      if (vrmview.showAccessoryGizmo) {
        vrmview.showAccessoryGizmo();
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

    if (type !== 'tab_texture_color') {
      if (vrmview.resetTexturePreview) {
        vrmview.resetTexturePreview();
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

  onPreviewMaterialOutlineWidth(payload: { materialIndex: number, materialName: string, width: number }) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setMaterialOutlineWidth) {
      vrmview.setMaterialOutlineWidth(payload.materialName, payload.width, payload.materialIndex);
    }
  }

  onPreviewMaterialOutlineMode(payload: { materialIndex: number, materialName: string, mode: 'none' | 'worldCoordinates' | 'screenCoordinates' }) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setMaterialOutlineMode) {
      vrmview.setMaterialOutlineMode(payload.materialName, payload.mode, payload.materialIndex);
    }
  }

  onPreviewTexture(payload: any) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.previewTexture) {
      vrmview.previewTexture(payload);
    }
  }

  onResetTexturePreview(imageIndex?: number) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.resetTexturePreview) {
      vrmview.resetTexturePreview(imageIndex);
    }
  }

  // アクセサリイベントハンドラ
  onChangeAccessoryTransformFromGizmo(payload: any) {
    const vrmparser = this.$refs.vrmparser as any;
    if (vrmparser && vrmparser.updateAccessoryTransformFromGizmo) {
      vrmparser.updateAccessoryTransformFromGizmo(payload);
    }
  }

  onLoadAccessory(payload: any) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.loadAccessory) {
      vrmview.loadAccessory(payload);
    }
  }

  onSelectAccessory(id: string) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.selectAccessory) {
      vrmview.selectAccessory(id);
    }
  }

  onToggleAccessoryVisibility(payload: any) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.toggleAccessoryVisibility) {
      vrmview.toggleAccessoryVisibility(payload);
    }
  }

  onRemoveAccessory(id: string) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.removeAccessory) {
      vrmview.removeAccessory(id);
    }
  }

  onFocusAccessory(id: string) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.focusAccessory) {
      vrmview.focusAccessory(id);
    }
  }

  onChangeAccessoryBone(payload: any) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.changeAccessoryBone) {
      vrmview.changeAccessoryBone(payload);
    }
  }

  onChangeAccessoryMode(mode: string) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setAccessoryTransformMode) {
      vrmview.setAccessoryTransformMode(mode);
    }
  }

  onChangeAccessoryTransform(payload: any) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setAccessoryTransform) {
      vrmview.setAccessoryTransform(payload);
    }
  }

  onActivateAccessoryMode(payload: any) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview) {
      if (vrmview.showAccessoryGizmo) vrmview.showAccessoryGizmo();
      if (vrmview.setAccessoryTransformMode) vrmview.setAccessoryTransformMode(payload.mode);
    }
  }

  async onMergeAccessoriesToVRM(accessories: any[]) {
    try {
      await VRMParser.mergeAccessories(accessories);
    } catch (e) {
      console.error('Failed to merge accessories to VRM', e);
    }
  }

  // ===== モーション（VRMA）操作連携 =====

  onContainerDrop(e: DragEvent) {
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.vrma')) {
        this.onLoadVRMA(file);
      } else if (lowerName.endsWith('.vrm')) {
        this.selectVrmFile = file;
        this.drawVrm(file);
      }
    }
  }

  async onLoadVRMA(file: File) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.loadVRMA) {
      try {
        const info = await vrmview.loadVRMA(file);
        this.motionInfo = info;
        this.motionDuration = info.duration;
        this.motionCurrentTime = 0;
        this.isMotionPlaying = true;
        vrmview.playMotion();
      } catch (e: any) {
        console.error('Failed to load VRMA', e);
        alert(this.$t('motion.loadError') + (e?.message || e));
      }
    }
  }

  onPlayMotion() {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.playMotion) {
      vrmview.playMotion();
    }
  }

  onPauseMotion() {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.pauseMotion) {
      vrmview.pauseMotion();
    }
  }

  onStopMotion() {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.stopMotion) {
      vrmview.stopMotion();
    }
  }

  onSeekMotion(time: number) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.seekMotion) {
      vrmview.seekMotion(time);
      this.motionCurrentTime = time;
    }
  }

  onSetMotionSpeed(speed: number) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setMotionSpeed) {
      vrmview.setMotionSpeed(speed);
    }
  }

  onSetMotionLoop(loop: boolean) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.setMotionLoop) {
      vrmview.setMotionLoop(loop);
    }
  }

  onResetMotionPose() {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.resetMotionPose) {
      vrmview.resetMotionPose();
      this.isMotionPlaying = false;
      this.motionCurrentTime = 0;
    }
  }

  onMotionTimeUpdate(payload: { currentTime: number; duration: number }) {
    this.motionCurrentTime = payload.currentTime;
    if (payload.duration) {
      this.motionDuration = payload.duration;
    }
  }

  onMotionStateChange(payload: { isPlaying: boolean; currentTime?: number }) {
    this.isMotionPlaying = payload.isPlaying;
    if (payload.currentTime !== undefined) {
      this.motionCurrentTime = payload.currentTime;
    }
  }

  onPreviewSpringBone(payload: { targetBoneNames: string[]; settings: { gravityPower?: number; hitRadius?: number } }) {
    const vrmview = this.$refs.vrmview as any;
    if (vrmview && vrmview.updateSpringBoneLive) {
      vrmview.updateSpringBoneLive(payload.targetBoneNames, payload.settings);
    }
  }
}
</script>

<style scoped lang="scss">
  .main {
    display: flex;
    justify-content: center;
    margin: 0 auto;
    max-width: 100%;
    box-sizing: border-box;
    flex-wrap: wrap;
    gap: 16px;

    .container {
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

    .vrmviewContainer {
      flex: 0 0 auto;
      width: 600px;
      max-width: 100%;
    }

    .vrmparserContainer {
      flex: 0 1 600px;
      width: 100%;
      max-width: 600px;
      min-width: 0;
    }
  }
  
  @media screen and (max-width: 640px) {
    .main {
      flex-direction: column;
      align-items: center;
      gap: 8px;

      .container {
        width: 100%;
        margin: 0 auto;
      }

      .vrmviewContainer,
      .vrmparserContainer {
        width: 100%;
        max-width: 100%;
      }
    }
  }

  @media screen and (max-width: 480px) { 
    .main {
      .container {
        width: 300px;
        margin: 0 auto;
      }
    }
  }
</style>
