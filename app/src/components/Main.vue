<template>
  <div class="main">
    <div class="vrmviewContainer">
      <FileUpload :changeFile="changeFile" />
      <VRMView ref="vrmview" :path="path" :debug="false" />
      <button @click="clickExport">VRM Export</button>
    </div>
    <div class="vrmparserContainer">
      <VRMParserView ref="vrmparser" />
    </div>
</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

import VRMView from '@/components/VRMView.vue'
import FileUpload from '@/components/FileUpload.vue'
import VRMParserView from '@/components/VRMParserView.vue'

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
  }

  changeFile(event: any) {
    console.log('changeFile', event)
    this.selectVrmFile = event.target.files[0]
    // VRM 読み込み
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.drawVrm( this.selectVrmFile! )

    // VRMパース
    const vrmparser = this.$refs.vrmparser as VRMParserView    
    vrmparser.parse( this.selectVrmFile! )
  }

  clickExport() {
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.downloadFile()
  }
}
</script>

<style scoped>
  .main {
    display: flex;
    width: 915px;
    margin: 0 auto;
    /* background-color: aqua; */
  }

  .vrmviewContainer {
    flex: auto;
    width: 300px;
    /* background-color: red; */
  }

  .vrmviewContainer button {
    font-size: large;
  }

  .vrmparserContainer {
    flex: auto;
    width: 300px;
    /* background: blue; */
  }
</style>
