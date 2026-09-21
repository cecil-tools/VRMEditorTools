<template>
  <div class="vrmparserview">
    <!-- TABメニュー -->
    <div id="tab">
      <ul class="tabMenu">
        <li :class="{ active: selectTabType === 'tab_images' }" @click="clickSelectTab('tab_images')">{{$t('tabImages')}}</li>
        <li :class="{ active: selectTabType === 'tab_texture_color' }" @click="clickSelectTab('tab_texture_color')">{{$t('tabTextureColor')}}</li>
        <li :class="{ active: selectTabType === 'tab_materials' }" @click="clickSelectTab('tab_materials')">{{$t('tabMaterials')}}</li>
        <li :class="{ active: selectTabType === 'tab_first_person' }" @click="clickSelectTab('tab_first_person')">{{$t('tabFirstPerson')}}</li>
        <li :class="{ active: selectTabType === 'tab_meta' }" @click="clickSelectTab('tab_meta')">{{$t('tabMeta')}}</li>
        <li :class="{ active: selectTabType === 'tab_vroid' }" @click="clickSelectTab('tab_vroid')">{{$t('tabVroid')}}</li>
        <li :class="{ active: selectTabType === 'tab_blendshape' }" @click="clickSelectTab('tab_blendshape')">{{$t('tabBlendShape')}}</li>
        <li :class="{ active: selectTabType === 'tab_armature' }" @click="clickSelectTab('tab_armature')">{{$t('tabArmature')}}</li>
        <li :class="{ active: selectTabType === 'tab_accessory' }" @click="clickSelectTab('tab_accessory')">{{$t('tabAccessory')}}</li>
        <li :class="{ active: selectTabType === 'tab_motion' }" @click="clickSelectTab('tab_motion')">{{$t('tabMotion')}}</li>
        <!--
        <li @click="clickSelectTab('tab_short_video')">{{$t('tabShortVideo')}}</li>
        -->
      </ul>
    </div>
    <TabImages :selectTabType="selectTabType" :vrmImages="vrmImages" :drawVrm="drawVrm" :vrmVersion="vrmVersion" />
    <TabTextureColor ref="tabTextureColor" :selectTabType="selectTabType" :vrmImages="vrmImages" :drawVrm="drawVrm" :vrmVersion="vrmVersion" :json="json" @preview-texture="onPreviewTexture" @reset-texture-preview="onResetTexturePreview" />
    <TabFirstPerson ref="tabFirstPerson" :selectTabType="selectTabType" :firstPerson="firstPerson" :vrmScale="vrmScale" :drawVrm="drawVrm" :vrmVersion="vrmVersion" @change-first-person-offset="onChangeFirstPersonFromUI" @focus-first-person="onFocusFirstPerson" />
    <TabVroid :selectTabType="selectTabType" :springBoneGroups="springBoneGroups" :vrmVersion="vrmVersion" @preview-spring-bone="onPreviewSpringBone" />
    <TabShortVideo :selectTabType="selectTabType" />
    <TabMaterials :selectTabType="selectTabType" :vrmImages="vrmImages" :drawVrm="drawVrm" @preview-material-outline-width="onPreviewMaterialOutlineWidth" @preview-material-outline-mode="onPreviewMaterialOutlineMode" />
    <TabMeta :selectTabType="selectTabType" :json="json" />
    <TabBlendShape ref="tabBlendShape" :selectTabType="selectTabType" :drawVrm="drawVrm" :blendShapeGroups="blendShapeGroups" :morphMeshes="morphMeshes" :json="json" :vrmVersion="vrmVersion" :changeBlendShape="changeBlendShape" @download-all-blendshapes="onDownloadAllBlendShapes" @change-blendshape-weight="onChangeBlendShapeWeight" @reset-all-blendshapes="onResetAllBlendShapes" @preview-morph-target="onPreviewMorphTarget" @register-custom-expression="onRegisterCustomExpression" @unregister-custom-expression="onUnregisterCustomExpression" @reload-blendshapes="reloadBlendShapes" />
    <TabArmature :selectTabType="selectTabType" :json="json" :vrmVersion="vrmVersion" @select-bone="onSelectBone" @focus-bone="onFocusBone" @toggle-skeleton="onToggleSkeleton" @toggle-xray="onToggleXRay" />
    <TabAccessory ref="tabAccessory" :selectTabType="selectTabType" :json="json" :vrmVersion="vrmVersion" @load-accessory="onLoadAccessory" @select-accessory="onSelectAccessory" @toggle-accessory-visibility="onToggleAccessoryVisibility" @remove-accessory="onRemoveAccessory" @focus-accessory="onFocusAccessory" @change-accessory-bone="onChangeAccessoryBone" @change-accessory-mode="onChangeAccessoryMode" @change-accessory-transform="onChangeAccessoryTransform" @activate-accessory-mode="onActivateAccessoryMode" @merge-accessories-to-vrm="onMergeAccessoriesToVRM" />
    <TabMotion ref="tabMotion" :selectTabType="selectTabType" :motionInfo="motionInfo" :isPlaying="isMotionPlaying" :currentTime="motionCurrentTime" :duration="motionDuration" @load-vrma="onLoadVRMA" @play-motion="onPlayMotion" @pause-motion="onPauseMotion" @stop-motion="onStopMotion" @seek-motion="onSeekMotion" @set-motion-speed="onSetMotionSpeed" @set-motion-loop="onSetMotionLoop" @reset-motion-pose="onResetMotionPose" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

import TabImages from '@/components/VRMParserViewTabs/TabImages.vue'
import TabTextureColor from '@/components/VRMParserViewTabs/TabTextureColor.vue'
import TabFirstPerson from '@/components/VRMParserViewTabs/TabFirstPerson.vue'
import TabVroid from '@/components/VRMParserViewTabs/TabVroid.vue'
import TabShortVideo from '@/components/VRMParserViewTabs/TabShortVideo.vue'
import TabMaterials from '@/components/VRMParserViewTabs/TabMaterials.vue'
import TabMeta from '@/components/VRMParserViewTabs/TabMeta.vue'
import TabBlendShape from './VRMParserViewTabs/TabBlendShape.vue'
import TabArmature from '@/components/VRMParserViewTabs/TabArmature.vue'
import TabAccessory from '@/components/VRMParserViewTabs/TabAccessory.vue'
import TabMotion from '@/components/VRMParserViewTabs/TabMotion.vue'

@Component({
  components: {
    TabImages,
    TabTextureColor,
    TabFirstPerson,
    TabVroid,
    TabShortVideo,
    TabMaterials,
    TabMeta,
    TabBlendShape,
    TabArmature,
    TabAccessory,
    TabMotion
  }
})
export default class VRMParserView extends Vue {
  @Prop({ default: null })
  motionInfo!: { fileName: string; duration: number; trackCount: number } | null;

  @Prop({ default: false })
  isMotionPlaying!: boolean;

  @Prop({ default: 0 })
  motionCurrentTime!: number;

  @Prop({ default: 0 })
  motionDuration!: number;

  @Prop() 
  drawVrm: (file: File) => void

  @Prop()
  drawFirstPerson: (vrmJson: any) => void

  @Prop()
  changeBlendShape: (name: string) => void

  vrmImages: any[] = []
  
  // タブ切り替え
  selectTabType = "tab_images"

  // 視点位置
  firstPerson: any = null

  // スケール
  vrmScale: any = 1.0

  // スプリングボーン 一覧
  springBoneSkirt: any = null
  springBoneGroups: any[] = []
  blendShapeGroups: any = []

  // モーフターゲットを持つメッシュ一覧
  morphMeshes: any[] = []

  // バージョン
  vrmVersion: any = null

  // モデル情報
  json: any = {}

  clickSelectTab(type: string) {
    console.log('clickSelectTab', type)
    this.selectTabType = type 
    this.$emit('select-tab', type)
  }

  onChangeFirstPersonFromUI(offset: { x: number, y: number, z: number }) {
    this.$emit('change-first-person-offset', offset);
  }

  onFocusFirstPerson() {
    this.$emit('focus-first-person');
  }

  updateFirstPersonFromGizmo(offset: { x: number, y: number, z: number }) {
    const tab = this.$refs.tabFirstPerson as any;
    if (tab && tab.updateOffsetFromGizmo) {
      tab.updateOffsetFromGizmo(offset);
    }
  }

  parse(selectVrmFile: File): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log('VRMParserView parse', selectVrmFile)
      if (selectVrmFile == null) {
        reject()
        return
      }

      //VRM パース
      VRMParser.parse(selectVrmFile, (json: any, images: any[]) => {
        this.vrmImages.splice(0, this.vrmImages.length)
        this.vrmImages.push(...images)
        console.log('vrmImages', this.vrmImages)

        // 一人称視点の位置を取得
        this.firstPerson = VRMParser.getFirstPersonBone()
        // console.log('firstPerson', this.firstPerson)
        if (this.firstPerson && this.firstPerson.firstPersonBone != -1) {
          this.drawFirstPerson(VRMParser.json)
        }

        // VRM 全体のスケールを取得
        if (VRMParser.json.nodes[0].scale != null) {
          this.vrmScale = VRMParser.json.nodes[0].scale
          console.log(`Armature name: ${VRMParser.json.nodes[0].name} vrmScale: ${this.vrmScale}`)
        }

        // TODO 頭にアクセサリを追加してみる
        // VRMParser.addHeadAccessory()

        // スプリングボーン グループ取得
        this.springBoneGroups = VRMParser.getSpringBoneGroups()
        console.log('springBoneGroups', this.springBoneGroups)
        const skirtGroup = this.springBoneGroups.find((g: any) => g.isSkirt)
        this.springBoneSkirt = skirtGroup || null

        // ブレンドシェイプグループ取得
        this.blendShapeGroups = VRMParser.getBlendShapeGroups()
        console.log('blendShapeGroups', this.blendShapeGroups)

        // モーフターゲットを持つメッシュ一覧取得
        this.morphMeshes = VRMParser.getMeshesWithMorphTargets()
        console.log('morphMeshes', this.morphMeshes)

        // バージョン
        this.vrmVersion = VRMParser.getVRMVersion()

        // モデル情報
        this.json = VRMParser.getVRMExtensionJson();

        resolve(VRMParser.json);      
      })
    });
  }
 
  downloadFile() {
    VRMParser.createVRMFile()
      .then((file: File) => {
        console.log('file', file)

        // ダウンロードしてみる
        const link = document.createElement('a')
        link.href = URL.createObjectURL(file)
        link.download = file.name
        link.click()
      })
      .catch(e => {
        console.error('error', e)
      })
  }

  onDownloadAllBlendShapes(names: string[]) {
      this.$emit('download-all-blendshapes', names);
  }

  reloadBlendShapes() {
    this.blendShapeGroups = VRMParser.getBlendShapeGroups();
    this.morphMeshes = VRMParser.getMeshesWithMorphTargets();
  }

  onChangeBlendShapeWeight(payload: { name: string, weight: number }) {
    this.$emit('change-blendshape-weight', payload);
  }

  onResetAllBlendShapes() {
    this.$emit('reset-all-blendshapes');
  }

  onPreviewMorphTarget(payload: { meshIndex: number, targetIndex: number, weight: number }) {
    this.$emit('preview-morph-target', payload);
  }

  onRegisterCustomExpression(payload: { name: string, binds: any[] }) {
    this.$emit('register-custom-expression', payload);
  }

  onUnregisterCustomExpression(name: string) {
    this.$emit('unregister-custom-expression', name);
  }

  onSelectBone(nodeIndex: number) {
    this.$emit('select-bone', nodeIndex);
  }

  onFocusBone(nodeIndex: number) {
    this.$emit('focus-bone', nodeIndex);
  }

  onToggleSkeleton(enabled: boolean) {
    this.$emit('toggle-skeleton', enabled);
  }

  onToggleXRay(enabled: boolean) {
    this.$emit('toggle-xray', enabled);
  }

  onPreviewMaterialOutlineWidth(payload: { materialIndex: number, materialName: string, width: number }) {
    this.$emit('preview-material-outline-width', payload);
  }

  onPreviewMaterialOutlineMode(payload: { materialIndex: number, materialName: string, mode: 'none' | 'worldCoordinates' | 'screenCoordinates' }) {
    this.$emit('preview-material-outline-mode', payload);
  }

  onPreviewTexture(payload: { imageIndex: number, canvas: HTMLCanvasElement }) {
    this.$emit('preview-texture', payload);
  }

  onResetTexturePreview(imageIndex?: number) {
    this.$emit('reset-texture-preview', imageIndex);
  }

  onLoadAccessory(payload: any) {
    this.$emit('load-accessory', payload);
  }

  onSelectAccessory(id: string) {
    this.$emit('select-accessory', id);
  }

  onToggleAccessoryVisibility(payload: any) {
    this.$emit('toggle-accessory-visibility', payload);
  }

  onRemoveAccessory(id: string) {
    this.$emit('remove-accessory', id);
  }

  onFocusAccessory(id: string) {
    this.$emit('focus-accessory', id);
  }

  onChangeAccessoryBone(payload: any) {
    this.$emit('change-accessory-bone', payload);
  }

  onChangeAccessoryMode(mode: string) {
    this.$emit('change-accessory-mode', mode);
  }

  onChangeAccessoryTransform(payload: any) {
    this.$emit('change-accessory-transform', payload);
  }

  onActivateAccessoryMode(payload: any) {
    this.$emit('activate-accessory-mode', payload);
  }

  onMergeAccessoriesToVRM(accessories: any[]) {
    this.$emit('merge-accessories-to-vrm', accessories);
  }

  updateAccessoryTransformFromGizmo(payload: any) {
    const tab = this.$refs.tabAccessory as any;
    if (tab && tab.updateTransformFromGizmo) {
      tab.updateTransformFromGizmo(payload);
    }
  }

  // スプリングボーン リアルタイムプレビュー中継
  onPreviewSpringBone(payload: any) {
    this.$emit('preview-spring-bone', payload);
  }

  // モーション操作イベント中継
  onLoadVRMA(file: File) {
    this.$emit('load-vrma', file);
  }

  onPlayMotion() {
    this.$emit('play-motion');
  }

  onPauseMotion() {
    this.$emit('pause-motion');
  }

  onStopMotion() {
    this.$emit('stop-motion');
  }

  onSeekMotion(time: number) {
    this.$emit('seek-motion', time);
  }

  onSetMotionSpeed(speed: number) {
    this.$emit('set-motion-speed', speed);
  }

  onSetMotionLoop(loop: boolean) {
    this.$emit('set-motion-loop', loop);
  }

  onResetMotionPose() {
    this.$emit('reset-motion-pose');
  }
}
</script>

<style scoped lang="scss">
  $green: #007db9;
  $white: #fff;

  #tab {
    width: 100%;
    max-width: 600px;

    .tabMenu {
      display: flex;
      flex-wrap: wrap;
      padding-left: 3px;
      margin: 0;

      li {
        display: inline;
        width: auto;
        padding: 8px 10px;
        color: $white;
        border-right: 1px solid $white;
        border-bottom: 1px solid $white;
        background-color: $green;
        cursor: pointer;
        font-size: 13px;
              
        &:last-child {
          border-right: none;
        }

        &.active {
          background-color: #004d73;
          font-weight: bold;
        }

        &:hover:not(.active) {
          background-color: #006da2;
        }
      }      
    }
  }
</style>