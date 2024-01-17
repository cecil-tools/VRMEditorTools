<template>
  <div class="vrmparserview">
    <!-- TABメニュー -->
    <div id="tab">
      <ul class="tabMenu">
        <li @click="clickSelectTab('tab_images')">{{$t('tabImages')}}</li>
        <li @click="clickSelectTab('tab_materials')">{{$t('tabMaterials')}}</li>
        <li @click="clickSelectTab('tab_first_person')">{{$t('tabFirstPerson')}}</li>
        <li @click="clickSelectTab('tab_vroid')">{{$t('tabVroid')}}</li>
        <li @click="clickSelectTab('tab_meta')">{{$t('tabMeta')}}</li>
        <!--
        <li @click="clickSelectTab('tab_short_video')">{{$t('tabShortVideo')}}</li>
        -->
      </ul>
    </div>
    <TabImages :selectTabType="selectTabType" :vrmImages="vrmImages" :drawVrm="drawVrm" />
    <TabFirstPerson :selectTabType="selectTabType" :firstPerson="firstPerson" :vrmScale="vrmScale" :drawVrm="drawVrm" />
    <TabVroid :selectTabType="selectTabType" :springBoneSkirt="springBoneSkirt" />
    <TabShortVideo :selectTabType="selectTabType" />
    <TabMaterials :selectTabType="selectTabType" :vrmImages="vrmImages" :drawVrm="drawVrm" />
    <TabMeta :selectTabType="selectTabType" :json="json" />
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

@Component({
  components: {
    TabImages,
    TabFirstPerson,
    TabVroid,
    TabShortVideo,
    TabMaterials,
    TabMeta
  }
})
export default class VRMParserView extends Vue {
  @Prop() 
  drawVrm: (file: File) => void

  @Prop()
  drawFirstPerson: (vrmJson: any) => void

  vrmImages: any[] = []
  
  // タブ切り替え
  selectTabType = "tab_images"

  // 視点位置
  firstPerson: any = null

  // スケール
  vrmScale: any = 1.0

  // スプリングボーン 一覧
  springBoneSkirt: any = []

  // モデル情報
  json: any = {}

  clickSelectTab(type: string) {
    console.log('clickSelectTab', type)
    this.selectTabType = type 
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

}
</script>

<style scoped lang="scss">
  $green: #007db9;
  $white: #fff;

  #tab {
    width: 100%;
    max-width: 500px;

    .tabMenu {
      display: flex;
      padding-left: 3px;
      margin: 0;

      li {
        display: inline;
        width: auto;
        padding: 10px 10px;
        color: $white;
        border-right: 1px solid $white;
        background-color: $green;
        cursor: pointer;
              
        &:last-child {
          border-right: none;
        }
      }      
    }
  }
</style>