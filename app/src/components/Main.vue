<template>
  <div class="main">
    <div class="container vrmviewContainer">
      <FileUpload :changeFile="changeFile" />
      <VRMView ref="vrmview" :path="path" :debug="false" />
      <button @click="clickExport">VRM Export</button>
    </div>
    <div class="container vrmparserContainer">
      <VRMParserView ref="vrmparser" :drawVrm="drawVrm"/>
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
    const vrmparser = this.$refs.vrmparser as VRMParserView
    vrmparser.downloadFile()
    
    // GLTF2Export
    // const vrmview = this.$refs.vrmview as VRMView
    // vrmview.downloadFile()
  }

  drawVrm(file: File) {
    const vrmview = this.$refs.vrmview as VRMView
    vrmview.drawVrm( file )
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
      width: 300px;
      button {
        font-size: large;
      }
    }
  }

  @media screen and (max-width: 767px) {
    .main {
      flex-direction: column;

      .container {
        width: 100%;
      }
    }
  }
</style>
