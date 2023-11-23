<template>
  <div class="home">
    <h1>VRMEditorTools</h1>
    <p>{{$t('description')}}</p>
    <Main />

    <div>
      <h2>他のVRMツール</h2>
      <p><a href="https://vrmeditor.tools/">VRMEditorTools</a></p>
      <p><a href="https://tfuru.github.io/vrma-loader-sample/">VRMA, BVHをアップロードして VRMを動かすやつ</a></p>
      <p><a href="https://avatar-reduce.an.r.appspot.com/">VRoid Studio 1.1.0 ,VRoid Mobile 1.15.1 で作られたVRMを cluster 用に変換する</a></p>  
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import HelloWorld from '@/components/HelloWorld.vue'; // @ is an alias to /src
import Main from '@/components/Main.vue'

@Component({
  components: {
    HelloWorld,
    Main
  },
})
export default class Home extends Vue {}
</script>

<style scoped lang="scss">
  h1 {
    margin: 5px auto;
  }
  p {
    margin: 5px auto;
  }
</style>