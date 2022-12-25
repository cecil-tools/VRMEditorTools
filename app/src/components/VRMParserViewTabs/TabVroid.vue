<template>
    <div class="tabContents tabVroid" v-if="selectTabType == 'tab_vroid'">
      <table class="table">
        <thead>
          <tr>
            <th>Spring Bone</th>
            <th>value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="springBoneSkirt">
            <th>
              <p>{{springBoneSkirt.comment}}</p>
              <p>Gravity Power</p>
            </th>
            <td>
              <input type="number" step="0.01" v-model.number="springBoneSkirt.gravityPower">
              <p class="placeholderGravityPower">{{$t('placeholderGravityPower') }}</p>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr v-if="springBoneSkirt">
            <td colspan="2">
              <label for="btnUpdateVroid">{{$t('updateVroid')}}</label>
              <input id="btnUpdateVroid" type='button' @click="clickUpdateVroid" value="save">
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
export default class TabVroid extends Vue {
    @Prop()
    selectTabType: string;

    @Prop()
    springBoneSkirt: any;

    clickUpdateVroid() {
    if (this.springBoneSkirt == null){
      return;
    }

    const springBoneGroups: any = VRMParser.getSecondaryAnimationBoneGroups()
    springBoneGroups.forEach((v: any) => {
      if (v.comment == 'Skirt') {
        // gravityPower を更新
        v.gravityPower = this.springBoneSkirt.gravityPower
      }
    });
    console.log('clickUpdateVroid', springBoneGroups)
    VRMParser.setSecondaryAnimationBoneGroups(springBoneGroups)    
  }
}
</script>

<style scoped lang="scss">
  .tabVroid {
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
    .placeholderGravityPower {
      font-size: small;
    }
  }
</style>