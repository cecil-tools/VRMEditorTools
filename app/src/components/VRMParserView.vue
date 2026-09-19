<template>
  <div class="vrmparserview">
    <!-- TABメニュー -->
    <div id="tab">
      <ul class="tabMenu">
        <li :class="{ active: selectTabType === 'tab_images' }" @click="clickSelectTab('tab_images')">{{$t('tabImages')}}</li>
        <li :class="{ active: selectTabType === 'tab_materials' }" @click="clickSelectTab('tab_materials')">{{$t('tabMaterials')}}</li>
        <li :class="{ active: selectTabType === 'tab_first_person' }" @click="clickSelectTab('tab_first_person')">{{$t('tabFirstPerson')}}</li>
        <li :class="{ active: selectTabType === 'tab_meta' }" @click="clickSelectTab('tab_meta')">{{$t('tabMeta')}}</li>
        <li :class="{ active: selectTabType === 'tab_vroid' }" @click="clickSelectTab('tab_vroid')">{{$t('tabVroid')}}</li>
        <li :class="{ active: selectTabType === 'tab_blendshape' }" @click="clickSelectTab('tab_blendshape')">{{$t('tabBlendShape')}}</li>
        <li :class="{ active: selectTabType === 'tab_armature' }" @click="clickSelectTab('tab_armature')">{{$t('tabArmature')}}</li>
        <!--
        <li @click="clickSelectTab('tab_short_video')">{{$t('tabShortVideo')}}</li>
        -->
      </ul>
    </div>
    <TabImages :selectTabType="selectTabType" :vrmImages="vrmImages" :drawVrm="drawVrm" />
    <TabFirstPerson ref="tabFirstPerson" :selectTabType="selectTabType" :firstPerson="firstPerson" :vrmScale="vrmScale" :drawVrm="drawVrm" :vrmVersion="vrmVersion" @change-first-person-offset="onChangeFirstPersonFromUI" @focus-first-person="onFocusFirstPerson" />
    <TabVroid :selectTabType="selectTabType" :springBoneSkirt="springBoneSkirt" />
    <TabShortVideo :selectTabType="selectTabType" />
    <TabMaterials :selectTabType="selectTabType" :vrmImages="vrmImages" :drawVrm="drawVrm" />
    <TabMeta :selectTabType="selectTabType" :json="json" />
    <TabBlendShape ref="tabBlendShape" :selectTabType="selectTabType" :drawVrm="drawVrm" :blendShapeGroups="blendShapeGroups" :morphMeshes="morphMeshes" :json="json" :vrmVersion="vrmVersion" :changeBlendShape="changeBlendShape" @download-all-blendshapes="onDownloadAllBlendShapes" @change-blendshape-weight="onChangeBlendShapeWeight" @reset-all-blendshapes="onResetAllBlendShapes" @preview-morph-target="onPreviewMorphTarget" @register-custom-expression="onRegisterCustomExpression" @unregister-custom-expression="onUnregisterCustomExpression" @reload-blendshapes="reloadBlendShapes" />
    <TabArmature :selectTabType="selectTabType" :json="json" :vrmVersion="vrmVersion" @select-bone="onSelectBone" @focus-bone="onFocusBone" @toggle-skeleton="onToggleSkeleton" @toggle-xray="onToggleXRay" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

import TabImages from '@/components/VRMParserViewTabs/TabImages.vue'
import TabFirstPerson from '@/components/VRMParserViewTabs/TabFirstPerson.vue'
import TabVroid from '@/components/VRMParserViewTabs/TabVroid.vue'
import TabShortVideo from '@/components/VRMParserViewTabs/TabShortVideo.vue'
import TabMaterials from '@/components/VRMParserViewTabs/TabMaterials.vue'
import TabMeta from '@/components/VRMParserViewTabs/TabMeta.vue'
import TabBlendShape from './VRMParserViewTabs/TabBlendShape.vue'
import TabArmature from '@/components/VRMParserViewTabs/TabArmature.vue'

@Component({
  components: {
    TabImages,
    TabFirstPerson,
    TabVroid,
    TabShortVideo,
    TabMaterials,
    TabMeta,
    TabBlendShape,
    TabArmature
  }
})
export default class VRMParserView extends Vue {
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
  springBoneSkirt: any = []

  // ブレンドシェイプグループ 
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
        const springBoneGroups: any = VRMParser.getSecondaryAnimationBoneGroups()
        if (springBoneGroups) {
          this.springBoneSkirt = springBoneGroups.filter((v :any) => {
            return v.comment == 'Skirt'
          })[0]
          console.log('springBoneSkirt', this.springBoneSkirt)
        }

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