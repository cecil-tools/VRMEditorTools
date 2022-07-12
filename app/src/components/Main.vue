<template>
  <div class="main">
    <FileUpload :changeFile="changeFile" />
    <button @click="clickExport">Export</button>
    <VRMView ref="vrmview" :path="path" :debug="true" />
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
  _selectVrmFile?: File;

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
    VRMParser.parse(this._selectVrmFile);
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
</style>
