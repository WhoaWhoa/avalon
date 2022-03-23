<template>
  <div id="app">
    <v-app class="indigo darken-2">
      <EventHandler :avalon='avalon'></EventHandler>
      <v-container fill-height justify-center v-if='!avalon.initialized'>
        <v-progress-circular
               indeterminate
               :size="150"
               color="yellow"></v-progress-circular>
      </v-container>
      <template v-else>
        <v-container v-if='!avalon.isLoggedIn' fill-height justify-center>
          <UserLogin :avalon='avalon' />
        </v-container>
        <template v-else>
          <Toolbar :avalon='avalon'></Toolbar>
          <v-content>
            <v-container>          
              <v-layout align-center justify-center column fill-height>
                <Login
                  :avalon='avalon'
                  v-if="!avalon.isInLobby"
                />
                <Lobby
                  v-bind:avalon='avalon'
                  v-else-if='!avalon.isGameInProgress' />
                <Game :avalon='avalon' v-else />
              </v-layout>
            </v-container>
          </v-content>
        </template>
      </template>
    </v-app>
  </div>
</template>

<script>
import AvalonGame from './avalon.js'
import { EventBus } from './main.js'
import Toolbar from './components/Toolbar.vue'
import EventHandler from './components/EventHandler.vue'
import Login from './components/Login.vue'
import Lobby from './components/Lobby.vue'
import Game from './components/Game.vue'
import UserLogin from './components/UserLogin.vue'

export default {
  name: 'app',
  data() {
    return {
      avalon: new AvalonGame(this.eventCallback.bind(this)),
    }
  },
  created: function() {
    this.avalon.init();
  },
  components: {
    Login,
    Lobby,
    Toolbar,
    EventHandler,
    Game,
    UserLogin
  },
  methods: {
    eventCallback() {
      console.debug('event callback', ...arguments);
      EventBus.$emit(...arguments);
    },
  },
}
</script>
<style>

/* don't capitalize button text */
*{ text-transform: none !important; } 

</style>
