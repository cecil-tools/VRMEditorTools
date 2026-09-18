<template>
      <div class="tabContents tabFirstPerson" v-if="selectTabType == 'tab_first_person'">
      <div class="title">{{$t('titleFirstPerson')}}</div>
      <table class="table" v-if="firstPerson != null">
        <tbody v-if="vrmVersion && vrmVersion.version == 0">
          <tr>
            <td class="label">X</td>
            <td><input type="number" step="0.005" v-model.number="firstPerson.firstPersonBoneOffset.x" @input="onInputChange"></td>
          </tr>
          <tr>
            <td class="label">Y</td>
            <td><input type="number" step="0.005" v-model.number="firstPerson.firstPersonBoneOffset.y" @input="onInputChange"></td>
          </tr>
          <tr>
            <td class="label">Z</td>
            <td><input type="number" step="0.005" v-model.number="firstPerson.firstPersonBoneOffset.z" @input="onInputChange"></td>
          </tr>
        </tbody>
        <tbody v-if="vrmVersion && vrmVersion.version == 1">
          <tr>
            <td class="label">X</td>
            <td><input type="number" step="0.005" v-model.number="firstPerson.offsetFromHeadBone[0]" @input="onInputChange"></td>
          </tr>
          <tr>
            <td class="label">Y</td>
            <td><input type="number" step="0.005" v-model.number="firstPerson.offsetFromHeadBone[1]" @input="onInputChange"></td>
          </tr>
          <tr>
            <td class="label">Z</td>
            <td><input type="number" step="0.005" v-model.number="firstPerson.offsetFromHeadBone[2]" @input="onInputChange"></td>
          </tr>
        </tbody>        
      </table>

      <div class="focus-btn-container" v-if="firstPerson != null">
        <button type="button" class="btn-focus" @click="clickFocusFirstPerson">
          {{$t('btnFocusFirstPerson')}}
        </button>
      </div>

      <div class="title">{{$t('titleScale')}}</div>
      <table class="table">
        <tbody>
          <tr>
            <td class="label">Scale</td>
            <td>
              <input type="number" step="0.01" v-model.number="vrmScale[0]" @change="changeScale">
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">
              <div>
                <label for="btnUpdateFirstPerson">{{$t('updateFirstPerson')}}</label>
                <input id="btnUpdateFirstPerson" type='button' @click="clickUpdateFirstPerson" value="save">
              </div>
              <div v-if="updateMessage" class="update-message">{{ updateMessage }}</div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
</template>
<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
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

    @Prop()
    vrmVersion: any;

    updateMessage = '';

    clickFocusFirstPerson() {
      this.$emit('focus-first-person');
    }

    onInputChange() {
      if (!this.firstPerson) return;
      let offset = { x: 0, y: 0.06, z: 0 };
      if (this.vrmVersion && this.vrmVersion.version === 1) {
        const arr = this.firstPerson.offsetFromHeadBone || [0, 0.06, 0];
        offset = {
          x: parseFloat(arr[0]) || 0,
          y: parseFloat(arr[1]) || 0,
          z: parseFloat(arr[2]) || 0
        };
      } else {
        const obj = this.firstPerson.firstPersonBoneOffset || { x: 0, y: 0.06, z: 0 };
        offset = {
          x: parseFloat(obj.x) || 0,
          y: parseFloat(obj.y) || 0,
          z: parseFloat(obj.z) || 0
        };
      }
      this.$emit('change-first-person-offset', offset);
    }

    updateOffsetFromGizmo(offset: { x: number, y: number, z: number }) {
      if (!this.firstPerson) return;
      if (this.vrmVersion && this.vrmVersion.version === 1) {
        if (this.firstPerson.offsetFromHeadBone) {
          this.$set(this.firstPerson.offsetFromHeadBone, 0, offset.x);
          this.$set(this.firstPerson.offsetFromHeadBone, 1, offset.y);
          this.$set(this.firstPerson.offsetFromHeadBone, 2, offset.z);
        }
      } else {
        if (this.firstPerson.firstPersonBoneOffset) {
          this.$set(this.firstPerson.firstPersonBoneOffset, 'x', offset.x);
          this.$set(this.firstPerson.firstPersonBoneOffset, 'y', offset.y);
          this.$set(this.firstPerson.firstPersonBoneOffset, 'z', offset.z);
        }
      }
    }

    clickUpdateFirstPerson() {
        VRMParser.setFirstPersonBoneOffset(this.firstPerson)
          .then(() => {
            this.updateMessage = (this as any).$t('updatedFirstPersonMessage');
            setTimeout(() => {
              this.updateMessage = '';
            }, 3000);
          })
          .catch(e => {
            console.error('error', e);
          });
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
      /* width: 100%; */
      td.label {
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

    .focus-btn-container {
      margin: 8px 0;
      text-align: left;
      .btn-focus {
        padding: 6px 14px;
        font-size: 13px;
        font-weight: bold;
        background-color: #2196f3;
        color: #ffffff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        &:hover {
          background-color: #1976d2;
        }
      }
    }

    .update-message {
      margin-top: 6px;
      color: #2e7d32;
      font-weight: bold;
      font-size: 14px;
      text-align: center;
    }

    label {
      text-align: center;
      font-size: large;
      border: solid 3px #AAAAAA;
      background-color: #F0F0F0;
      display: block;
      width: 90%;
      margin: 5px auto;
      transition: .3s;
      cursor: pointer;
    }

    label:hover {
      background-color: #AAAAAA;
    }

    input[type="button"] {
      display:none; 
    }
  }
</style>