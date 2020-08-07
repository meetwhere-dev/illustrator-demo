import Vue from 'vue'
import App from './App.vue'
// import router from './router'
// import store from './store'
import fabric from 'fabric'
// import Snap from 'snapsvg'
// eslint-disable-next-line import/no-webpack-loader-syntax
// import Snap from 'imports-loader?this=>window,fix=>module.exports=0!snapsvg/dist/snap.svg.js'
Vue.config.productionTip = false

new Vue({
  fabric,
  // Snap,
  // router,
  // store,
  render: h => h(App)
}).$mount('#app')
