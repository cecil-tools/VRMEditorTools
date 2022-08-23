<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link> | 
      <a v-if="htmlWebpackPlugin != null"
        href="https://twitter.com/share?ref_src=twsrc%5Etfw" 
        class="twitter-share-button" 
        data-show-count="true"
        :data-related="htmlWebpackPlugin.creator"
        :data-hashtags="htmlWebpackPlugin.hashtags" 
        :data-text="htmlWebpackPlugin.title + ' ' + htmlWebpackPlugin.description">Tweet</a>
    </div>
    <router-view/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class App extends Vue {
  htmlWebpackPlugin?: any = null

  mounted() {
    this.htmlWebpackPlugin = (window as any).htmlWebpackPlugin
    console.log('App', this.htmlWebpackPlugin)
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
