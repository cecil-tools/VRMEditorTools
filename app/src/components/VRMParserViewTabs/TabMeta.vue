<template>
    <div class="tabContents tabMeta" v-if="selectTabType == 'tab_meta'">
      <table class="table">
        <thead>
          <tr>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody v-if="vrmVersion == 0">
          <!-- VRM 0 -->
          <tr>
            <td>{{$t('meta.title')}}</td>
            <td><input type="text" v-model="json.meta.title"></td>
          </tr>
          <tr>
            <td>{{$t('meta.version')}}</td>
            <td><input type="text" v-model="json.meta.version"></td>
          </tr>
          <tr>
            <td>{{$t('meta.author')}}</td>
            <td><input type="text" v-model="json.meta.author"></td>
          </tr>
          <tr>
            <td>{{$t('meta.contactInformation')}}</td>
            <td><input type="text" v-model="json.meta.contactInformation"></td>
          </tr>

          <tr>
            <td>{{$t('meta.reference')}}</td>
            <td><input type="text" v-model="json.meta.reference"></td>
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
              <select v-model="json.meta.allowedUserName">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.sexualUssageName')}}</td>
            <td>
              <select v-model="json.meta.sexualUssageName">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.violentUssageName')}}</td>
            <td>
              <select v-model="json.meta.violentUssageName">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.otherLicenseUrl')}}</td>
            <td><input type="text" v-model="json.meta.otherLicenseUrl"></td>
          </tr>

          <tr>
            <td>{{$t('meta.licenseName')}}</td>
            <td>
              <select v-model="json.meta.licenseName">
                <option v-for="value,i in licenseNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.otherPermissionUrl')}}</td>
            <td><input type="text" v-model="json.meta.otherPermissionUrl"></td>
          </tr>         
        </tbody>

        <tbody v-if="vrmVersion == 1">
          <tr>
            <td>{{$t('meta.title')}}</td>
            <td><input type="text" v-model="json.meta.name"></td>
          </tr>
          <tr>
            <td>{{$t('meta.version')}}</td>
            <td><input type="text" v-model="json.meta.version"></td>
          </tr>
          <tr>
            <td>{{$t('meta.author')}}</td>
            <td v-for="author,i in json.meta.authors" :key="i">
              <input type="text" v-model="json.meta.authors[i]">
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.contactInformation')}}</td>
            <td><input type="text" v-model="json.meta.contactInformation"></td>
          </tr>
          <tr>
            <td>{{$t('meta.reference')}}</td>
            <td><input type="text" v-model="json.meta.reference"></td>
          </tr>
          <tr>
            <th>{{$t('meta.licens')}}</th>
            <td></td>
          </tr>          
          <tr>
            <td>{{$t('meta.avatarPermission')}}</td>
            <td>
              <select v-model="json.meta.avatarPermission">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.allowedUserName')}}</td>
            <td>
              <select v-model="json.meta.creditNotation">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.sexualUssageName')}}</td>
            <td>
              <select v-model="json.meta.allowExcessivelySexualUsage">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.violentUssageName')}}</td>
            <td>
              <select v-model="json.meta.allowExcessivelyViolentUsage">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.allowRedistribution')}}</td>
            <td>
              <select v-model="json.meta.allowRedistribution">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>{{$t('meta.commercialUsage')}}</td>
            <td>
              <select v-model="json.meta.commercialUsage">
                <option v-for="value,i in userNames" :key="i" :value="value">{{value}}</option>
              </select>
            </td>
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
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

// モデル情報
// https://vrm.dev/univrm/meta/univrm_meta.html

@Component
export default class TabMeta extends Vue {
    @Prop()
    selectTabType: string;

    @Prop()
    json: any;

    // VRM バージョン
    vrmVersion = 0;

    // 許可一覧
    userNames = [
      'Disallow',
      'Allow',
      'No'
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

    @Watch('json')
    private changeJson(val: any[], oldVal: any[]) {
      this.vrmVersion = VRMParser.getVRMVersion().version;
      console.log('changeJson', this.vrmVersion);
    }

    clickChangeMeta(e: any) {
      console.log('clickChangeMeta', e);
      VRMParser.replaceMeta(this.json.meta);
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