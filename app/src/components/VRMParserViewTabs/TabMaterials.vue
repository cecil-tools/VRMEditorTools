<template>
    <div class="tabContents tabMaterials" v-if="selectTabType == 'tab_materials'">
      <table class="table">
        <thead>
          <tr>
            <th>
              <p>Name</p>
              <p>Material</p>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="img,i in vrmMaterials" :key="i">
            <td class="tableDetail">
              <p>{{img.name}}</p>
              <table>
                <tbody>
                  <tr v-if="img.baseColorTexture.img">
                    <td class="title">baseColor</td>
                    <td>
                      <img class="src_thumbnail" :src="img.baseColorTexture.img.src" :alt="img.baseColorTexture.img.name"/>
                    </td>
                    <td>
                      <p><button @click="exportImage(img.baseColorTexture.img)">{{$t('exportImage')}}</button></p>
                      <p><button @click="importImage(img.baseColorTexture.img)">{{$t('importImage')}}</button></p>
                    </td>
                  </tr>
                  <tr v-if="img.normalTexture.img">
                    <td class="title">normal</td>
                    <td>
                      <img class="src_thumbnail" :src="img.normalTexture.img.src" :alt="img.normalTexture.img.name"/>
                    </td>
                    <td>
                        <p><button @click="exportImage(img.normalTexture.img)">{{$t('exportImage')}}</button></p>
                        <p><button @click="importImage(img.normalTexture.img)">{{$t('importImage')}}</button></p>
                    </td>
                  </tr>                  
                </tbody>
              </table>    
            </td>
          </tr>
        </tbody>        
      </table>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

@Component
export default class TabMaterials extends Vue {
  @Prop() 
  drawVrm: (file: File) => void

  @Prop()
  selectTabType: string;
  
  @Prop()
  vrmImages: any;

  vrmMaterials: any[] = []

  @Watch('vrmImages')
  private changeVrmImages(val: any[], oldVal: any[]) {
    this.vrmMaterials = this.reloadVrmMaterials()
  }

  reloadVrmMaterials() {
    const materials: any[] = []
    const images = VRMParser.images
    console.log("TabMaterials materials", VRMParser.json.materials)
    console.log("TabMaterials images", images)
    // name
    // baseColorTexture.index
    VRMParser.json.materials.forEach((elem: any, i: number) => {
      console.log('elem', elem)
      materials.push({
        index: i,
        name: elem.name,
        normalTexture: {
          img: (elem.normalTexture) ? images[elem.normalTexture.index]: null
        },
        baseColorTexture : {
          img: (elem.pbrMetallicRoughness.baseColorTexture) ? images[elem.pbrMetallicRoughness.baseColorTexture.index] : null
        }
      })
    })

    return materials
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
              // VRM情報が更新されている
              console.log('replaceImage success')

              VRMParser.createVRMFile()
              .then((file: File) => {
                  // console.log('file', file)

                  //画像一覧の更新
                  VRMParser.parse(file, (json: any, images: any[]) => {
                    this.vrmImages.splice(0, this.vrmImages.length)
                    this.vrmImages.push(...images)
                    console.log('vrmImages', this.vrmImages)
                  })
                  
                  // VRMView 描画の更新
                  if (this.drawVrm) {
                    this.drawVrm(file)
                  }
                  
                  // マテリアル 一覧の更新
                  this.vrmMaterials = this.reloadVrmMaterials()
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
}
</script>

<style scoped lang="scss">

.table {
  margin: 0 auto;
  width: 100%;
  /* border: 1px black solid; */
}
.table thead {
  background-color: lightslategray;
  height: 60px;
}

.table thead p, .table tbody p {
  margin: 5px auto;
  text-align: left;
}

.src_thumbnail {
  display: block;
  width: 60px;
  margin: 0 auto;
}

.tableDetail {
  border-bottom: 1px black solid;
  .title {
    width: 80px;
  }
}

</style>