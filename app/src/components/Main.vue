<template>
  <div class="main">
    <FileUpload :changeFile="changeFile" />
    <button @click="clickExport">Export</button>
    <VRMView ref="vrmview" :path="path" :debug="false" />

    <div>
      <h1>画像一覧</h1>
      <div class="images" v-for="img,i in vrmImages" :key="i">
        <div class="images_name">{{img.name}}</div>
        <img class="images_src" :src="img.src" :alt="img.name"/> 
      </div>
    </div>
</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import VRMView from '@/components/VRMView.vue'
import FileUpload from '@/components/FileUpload.vue'
import VRMParser from '@/module/VRMParser.ts'

@Component({
  components: {
    VRMView,
    FileUpload
  } 
})
export default class Main extends Vue {
  path = "./res/pk03.vrm"

  // アップロードされたファイル
  _selectVrmFile?: File

  vrmImages: any[] = []

  mounted() {
    // VRM 読み込み
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.drawVrm( this.path )
  }

  changeFile(event: any) {
    console.log('changeFile', event)
    this._selectVrmFile = event.target.files[0]
    // VRM 読み込み
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.drawVrm( this._selectVrmFile! )

    //VRM パース
    VRMParser.parse(this._selectVrmFile!, (json: any, images: any[]) => {
      this.vrmImages.splice(0, this.vrmImages.length)
      this.vrmImages.push(...images)
      console.log('vrmImages', this.vrmImages)
    })
  }

  clickExport() {
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.downloadFile()
  }
}
</script>

<style scoped>
  .main {
    width: 915px;
    margin: 0 auto;
    /* background-color: aqua; */
  }

  .images {
    width: 100%;
    background-color: gray;
  }

  .images_name {
    display: block;
    text-align: center;
  }

  .images_src {
    display: block;
    width: 200px;
  }
</style>
