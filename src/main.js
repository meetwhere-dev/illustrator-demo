import Vue from 'vue'
import App from './App.vue'
// import router from './router'
// import store from './store'
import fabric from 'fabric'

Vue.config.productionTip = false

new Vue({
  fabric,
  // router,
  // store,
  render: h => h(App)
}).$mount('#app')
