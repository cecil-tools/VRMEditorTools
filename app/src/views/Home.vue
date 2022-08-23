<template>
  <div class="home">
    <h1>VRMEditorTools</h1>
    <p>{{$t('description')}}</p>
    <Main />
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