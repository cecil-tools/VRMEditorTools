<template>
  <div class="vrmparserview">
    <!-- TABメニュー -->
    <div id="tab">
      <ul class="tabMenu">
        <li @click="clickSelectTab('tab_images')">{{$t('tabImages')}}</li>
        <li @click="clickSelectTab('tab_first_person')">{{$t('tabFirstPerson')}}</li>
        <li @click="clickSelectTab('tab_vroid')">{{$t('tabVroid')}}</li>
      </ul>
    </div>
    <TabImages :selectTabType="selectTabType" :vrmImages="vrmImages" :drawVrm="drawVrm" />
    <TabFirstPerson :selectTabType="selectTabType" :firstPerson="firstPerson" />
    <TabVroid :selectTabType="selectTabType" :springBoneSkirt="springBoneSkirt" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

import TabImages from '@/components/VRMParserViewTabs/TabImages.vue'
import TabFirstPerson from '@/components/VRMParserViewTabs/TabFirstPerson.vue'
import TabVroid from '@/components/VRMParserViewTabs/TabVroid.vue'

@Component({
  components: {
    TabImages,
    TabFirstPerson,
    TabVroid
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
  firstPerson: any

  // スプリングボーン 一覧
  springBoneSkirt: any

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