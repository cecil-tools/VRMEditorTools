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
    <div class="tabContents" v-if="selectTabType == 'tab_images'">
      <table class="table">
        <thead>
          <tr>
            <th>No.</th>
            <th>
              <p>Name</p>
              <p>Image</p>
            </th>
            <th>File Size[byte]</th>
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
              <p><button @click="exportImage(img)">{{$t('exportImage')}}</button></p>
              <p><button @click="importImage(img)">{{$t('importImage')}}</button></p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="tabContents tabFirstPerson" v-if="selectTabType == 'tab_first_person'">
      <table class="table">
        <thead>
          <tr>
            <th>item</th>
            <th>value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>x</th>
            <td><input type="number" v-model.number="firstPerson.firstPersonBoneOffset.x"></td>
          </tr>
          <tr>
            <th>y</th>
            <td><input type="number" v-model.number="firstPerson.firstPersonBoneOffset.y"></td>
          </tr>
          <tr>
            <th>z</th>
            <td><input type="number" v-model.number="firstPerson.firstPersonBoneOffset.z"></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">
              <label for="btnUpdateFirstPerson">{{$t('updateFirstPerson')}}</label>
              <input id="btnUpdateFirstPerson" type='button' @click="clickUpdateFirstPerson" value="save">
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="tabContents tabVroid" v-if="selectTabType == 'tab_vroid'">
      <table class="table">
        <thead>
          <tr>
            <th>item</th>
            <th>value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>
              <p>VRM Spring Bone</p>
              <p>Name</p>
            </th>
            <td>
              <p>Gravity Power</p>
              <input type="number" step="0.1" v-model.number="firstPerson.firstPersonBoneOffset.x">
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">
              <label for="btnUpdateFirstPerson">{{$t('updateFirstPerson')}}</label>
              <input id="btnUpdateFirstPerson" type='button' @click="clickUpdateFirstPerson" value="save">
            </td>
          </tr>
        </tfoot>        
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
  @Prop() 
  drawVrm: (file: File) => void

  @Prop()
  drawFirstPerson: (vrmJson: any) => void

  vrmImages: any[] = []
  
  // タブ切り替え
  selectTabType = "tab_images"

  // 視点位置
  firstPerson: any

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

        resolve(VRMParser.json);      
      })
    });
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

  clickSelectTab(type: string) {
    console.log('clickSelectTab', type)
    this.selectTabType = type 
  }

  clickUpdateFirstPerson() {
    console.log('firstPerson', this.firstPerson)
    VRMParser.setFirstPersonBoneOffset(this.firstPerson.firstPersonBoneOffset)
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
        padding: 10px 20px;
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
  .tabFirstPerson, .tabVroid {
    label {
      font-size: large;
      border: solid 3px #AAAAAA;
      background-color: #F0F0F0;
      display: block;
      width: 90%;
      margin: 5px auto;
      transition: .3s;
    }
    label:hover {
      background-color: #AAAAAA;
    }

    input[type="button"] {
      display:none; 
    }
  }

  .tabVroid {

  }
</style>