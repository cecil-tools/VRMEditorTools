import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

Vue.config.productionTip = false

import vb from 'vue-babylonjs'
Vue.use(vb)

import i18n from '@/languages'

import analytics from '@/analytics'

new Vue({  
  i18n,
  router,
  store,
  render: h => h(App)
}).$mount('#app')
