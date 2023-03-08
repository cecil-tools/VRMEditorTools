<template>
      <div class="tabContents tabFirstPerson" v-if="selectTabType == 'tab_first_person'">
      <div class="title">{{$t('titleFirstPerson')}}</div>
      <table class="table">
        <!--
          <thead>
          <tr>
            <th>item</th>
            <th>value</th>
          </tr>
        </thead>
        -->
        <tbody>
          <tr>
            <th>X</th>
            <td><input type="number" step="0.01" v-model.number="firstPerson.firstPersonBoneOffset.x"></td>
          </tr>
          <tr>
            <th>Y</th>
            <td><input type="number" step="0.01" v-model.number="firstPerson.firstPersonBoneOffset.y"></td>
          </tr>
          <tr>
            <th>Z</th>
            <td><input type="number" step="0.01" v-model.number="firstPerson.firstPersonBoneOffset.z"></td>
          </tr>
        </tbody>
      </table>
      <div class="title">{{$t('titleScale')}}</div>
      <table class="table">
        <!--
        <thead>
          <tr>
            <th>item</th>
            <th>value</th>
          </tr>
        </thead>
        -->
        <tbody>
          <tr>
            <th>Scale</th>
            <td>
              <input type="number" step="0.01" v-model.number="vrmScale[0]" @change="changeScale">
            </td>
          </tr>
        </tbody>
      </table>      
      <div>
        <label for="btnUpdateFirstPerson">{{$t('updateFirstPerson')}}</label>
        <input id="btnUpdateFirstPerson" type='button' @click="clickUpdateFirstPerson" value="save">
      </div>
    </div>
</template>
<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

@Component
export default class TabFirstPerson extends Vue {
    @Prop() 
    drawVrm: (file: File) => void

    @Prop()
    selectTabType: string;

    @Prop()
    firstPerson: any;

    @Prop()
    vrmScale: any;

    clickUpdateFirstPerson() {
        console.log('firstPerson', this.firstPerson)
        VRMParser.setFirstPersonBoneOffset(this.firstPerson.firstPersonBoneOffset)
    }

    changeScale() {
      this.vrmScale[1] = this.vrmScale[0]
      this.vrmScale[2] = this.vrmScale[0]
      console.log('changeScale', this.vrmScale)

      VRMParser.setScale(this.vrmScale)
      .then(() => {
        VRMParser.createVRMFile()
                .then((file: File) => {
                    // VRMView 描画の更新
                    if (this.drawVrm) {
                      this.drawVrm(file)
                    }
                })
                .catch(e => {
                    console.error('error', e)
                })
      })
    }
}
</script>

<style scoped lang="scss">
  .tabFirstPerson {
    .title {
      text-align: left;
      font-size: large;
      font-weight: bold;
      color: black;
    }
    
    table {
      width: 100%;
      th {
        width: 75px;
      }
      th, td {
        text-align: left;
      }
    }

    thead {
      background-color: lightslategray;
      height: 60px;
    }

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
</style>