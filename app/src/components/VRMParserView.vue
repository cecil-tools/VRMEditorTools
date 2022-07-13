<template>
  <div class="vrmparserview">
    <div>
      <table class="table">
        <thead>
          <tr>
            <th>番号</th>
            <th>
              <p>名前</p>
              <p>画像</p>
            </th>
            <th>容量(byte)</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="img,i in vrmImages" :key="i">
            <td>{{img.index}}</td>
            <td>
              <p>{{img.name}}</p>
              <p><img class="src_thumbnail" :src="img.src" :alt="img.name"/></p>
            </td>
            <td>{{img.size}}</td>
            <td>
              <p><button>エクスポート</button></p>
              <p><button>インポート</button></p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

@Component({
  components: {} 
})
export default class VRMParserView extends Vue {
  vrmImages: any[] = []

  parse(selectVrmFile: File) {
    console.log('VRMParserView parse', selectVrmFile)
    if (selectVrmFile == null) {
      return
    }

    //VRM パース
    VRMParser.parse(selectVrmFile, (json: any, images: any[]) => {
      this.vrmImages.splice(0, this.vrmImages.length)
      this.vrmImages.push(...images)
      console.log('vrmImages', this.vrmImages)
    })
  }
}
</script>

<style scoped>
  .table {
    margin: 0 auto;
    width: 100%;
    /* border: 1px black solid; */
  }
  .table thead {
    background-color: lightslategray;
  }
  .table thead p, .table tbody p {
    margin: 5px auto;
  }

  .table tbody tr {
    border: 1px black solid;
  }

  .table tbody p button {
    width: 120px;
  }
  
  .src_thumbnail {
    display: block;
    width: 60px;
    margin: 0 auto;
  }
</style>