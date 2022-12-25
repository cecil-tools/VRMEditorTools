<template>
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
            <td><input type="number" step="0.01" v-model.number="firstPerson.firstPersonBoneOffset.x"></td>
          </tr>
          <tr>
            <th>y</th>
            <td><input type="number" step="0.01" v-model.number="firstPerson.firstPersonBoneOffset.y"></td>
          </tr>
          <tr>
            <th>z</th>
            <td><input type="number" step="0.01" v-model.number="firstPerson.firstPersonBoneOffset.z"></td>
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
</template>
<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

@Component
export default class TabFirstPerson extends Vue {
    @Prop()
    selectTabType: string;

    @Prop()
    firstPerson: any;

    clickUpdateFirstPerson() {
        console.log('firstPerson', this.firstPerson)
        VRMParser.setFirstPersonBoneOffset(this.firstPerson.firstPersonBoneOffset)
    }
}
</script>

<style scoped lang="scss">
  .tabFirstPerson {
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