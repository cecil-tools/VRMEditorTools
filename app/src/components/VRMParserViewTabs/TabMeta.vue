<template>
    <div class="tabContents tabMeta" v-if="selectTabType == 'tab_meta'">
      <table class="table">
        <thead>
          <tr>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{$t('meta.title')}}</td>
            <td><input type="text" v-model="meta.title"></td>
          </tr>
          <tr>
            <td>{{$t('meta.version')}}</td>
            <td><input type="text" v-model="meta.version"></td>
          </tr>
          <tr>
            <td>{{$t('meta.author')}}</td>
            <td><input type="text" v-model="meta.author"></td>
          </tr>
          <tr>
            <td>{{$t('meta.contactInformation')}}</td>
            <td><input type="text" v-model="meta.contactInformation"></td>
          </tr>

          <tr>
            <td>{{$t('meta.reference')}}</td>
            <td><input type="text" v-model="meta.reference"></td>
          </tr>
          <!--
          <tr>
            <th>texture</th>
            <td><input type="text" v-model="meta.texture"></td>
          </tr>
          -->
          <tr>
            <th>{{$t('meta.licens')}}</th>
            <td></td>
          </tr>

          <tr>
            <td>{{$t('meta.allowedUserName')}}</td>
            <td>
              <select v-model="meta.allowedUserName">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.sexualUssageName')}}</td>
            <td>
              <select v-model="meta.sexualUssageName">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.violentUssageName')}}</td>
            <td>
              <select v-model="meta.violentUssageName">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.otherLicenseUrl')}}</td>
            <td><input type="text" v-model="meta.otherLicenseUrl"></td>
          </tr>

          <tr>
            <td>{{$t('meta.licenseName')}}</td>
            <td>
              <select v-model="meta.licenseName">
                <option v-for="value,i in licenseNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.otherPermissionUrl')}}</td>
            <td><input type="text" v-model="meta.otherPermissionUrl"></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">
              <div>
                <label for="btnUpdateMeta">{{$t('updateMeta')}}</label>
                <input id="btnUpdateMeta" type='button' @click="clickChangeMeta" value="save">
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

// モデル情報
// https://vrm.dev/univrm/meta/univrm_meta.html

@Component
export default class TabMeta extends Vue {
    @Prop()
    selectTabType: string;

    @Prop()
    meta: any;

    // 許可一覧
    userNames = [
      'Disallow',
      'Allow'
    ];

    // ライセンス タイプ一覧
    licenseNames = [
      'Redistribution_Prohibited',
      'CC0',
      'CC_BY',
      'CC_BY_NC',
      'CC_BY_SA',
      'CC_BY_NC_SA',
      'CC_BY_ND',
      'CC_BY_NC_ND',
      'Other'
    ];

    clickChangeMeta(e: any) {
      console.log('clickChangeMeta', e);
      VRMParser.replaceMeta(this.meta);       
    }
}
</script>

<style scoped lang="scss">
  .tabMeta {
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

    input[type="text"], select {
      width: 100%;
      text-align: left;
    }
  }

  .tabMeta {
    .placeholderGravityPower, .placeholderHitRadius {
      font-size: small;
    }
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
</style>