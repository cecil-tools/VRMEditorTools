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
              <p><button @click="exportImage(img)">エクスポート</button></p>
              <p><button @click="importImage(img)">インポート</button></p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMView from '@/components/VRMView.vue'
import VRMParser from '@/module/VRMParser'

@Component({
  components: {} 
})
export default class VRMParserView extends Vue {
  @Prop() 
  drawVrm: (file: File) => void

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

  // 画像ファイル ダウンロード
  exportImage(img: any) {
    console.log('exportImage', img)

    const link = document.createElement('a')
    link.href = img.src
    link.download = img.name
    link.click()
  }

  // 画像ファイル差し替え
  importImage(img: any) {
    console.log('importImage', img)
    // ファイル選択
    let input = document.createElement('input')
    input.type = 'file'
    input.onchange = (event: any) => {
      console.log('files', event.currentTarget.files[0])
      const file = event.currentTarget.files[0]

      const fileReader = new FileReader()
      fileReader.onload = (event: any) => {
        const raw: ArrayBuffer = event.currentTarget.result

        // VRM 内の画像ファイルを置き換える
        VRMParser.replaceImage(img, raw)
          .then(() => {
            // TODO VRM情報が更新されている
            console.log('replaceImage success')
            VRMParser.createVRMFile()
              .then((file: File) => {
                // console.log('file', file)

                // VRMView 描画の更新
                if (this.drawVrm) {
                  this.drawVrm(file)
                }
              })
              .catch(e => {
                console.error('error', e)
              })
          })
          .catch( e => {
            console.error('error', e)
          })
      }
      fileReader.readAsArrayBuffer(file)
    }
    input.click()
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