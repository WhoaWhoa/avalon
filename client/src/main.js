import Vue from 'vue'
import Vuetify from 'vuetify'
import App from './App.vue'
import 'vuetify/dist/vuetify.min.css'
import Toasted from 'vue-toasted';
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon, FontAwesomeLayers, FontAwesomeLayersText} from '@fortawesome/vue-fontawesome'

// importing icons which we need for layering and manipulations
import { faCrown, faCircle as faSolidCircle, faEllipsisH, faVoteYea } from '@fortawesome/free-solid-svg-icons'
import { faCircle, faTimesCircle, faCheckCircle, faThumbsUp, faThumbsDown } from '@fortawesome/free-regular-svg-icons'

Vue.component('font-awesome-icon', FontAwesomeIcon); // Register component globally
Vue.component('font-awesome-layers', FontAwesomeLayers);
Vue.component('font-awesome-layers-text', FontAwesomeLayersText);

library.add(faCrown, faSolidCircle, faCircle,
  faTimesCircle, faCheckCircle, faThumbsDown, faThumbsUp,
  faEllipsisH, faVoteYea);
// the line below would add EVERYTHING, so would bloat the size
//library.add(far, fas);

Vue.use(Vuetify, {
  // iconfont: 'faSvg', <-- use default font instead for now
})

export const EventBus = new Vue();

Vue.config.productionTip = false

Vue.use(Toasted,
  { position: 'top-center',
    fullWidth: true,
    duration: 2000 });

new Vue({
  render: h => h(App),
}).$mount('#app')
