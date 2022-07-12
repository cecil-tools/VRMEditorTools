<template>
  <div class="home">
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
