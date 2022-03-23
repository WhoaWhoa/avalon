<template>
  <v-container justify-center>

      <v-card class="cyan lighten-4" v-if='false && (avalon.user.stats.games >= 3)'>
        <v-card-title class="cyan lighten-2">
          <h3>Server Shutdown</h3>
        </v-card-title>
        <v-card-text>
          Due to mounting costs, we're asking for your donations to keep the server running.
          Please pitch in if you enjoy playing here. Every little bit helps.
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
 <v-layout align-center justify-center pt-2>
      <BuyButton :avalon='avalon' staticText="Donate" />
    </v-layout>          
        </v-card-actions>
      </v-card>    

  <v-layout align-start justify-center row wrap>
  <v-flex xs12 sm6>
    <v-container>
    <p class="cyan--text text--lighten-4">Players</p>
    <LobbyPlayerList v-bind:avalon='avalon' />
    <p v-if='avalon.isAdmin && avalon.config.playerList.length > 2'
      class="cyan--text text--lighten-4 caption">Drag names to specify seating order</p>
    </v-container>
  </v-flex>
   <v-flex v-show='validTeamSize' xs12 sm6>
     <v-container>
      <p class="cyan--text text--lighten-4">Special Roles Available</p>
      <RoleList
        v-bind:roles='avalon.config.selectableRoles'
        v-bind:allowSelect='avalon.isAdmin' />
    </v-container>
  </v-flex>
  </v-layout>
  <v-layout align-center justify-center row>
   <v-flex xs12 v-if='validTeamSize'>
     <v-layout align-center justify-center row fill-height>
      <p class="cyan--text text--lighten-4 title">
      {{ avalon.config.playerList.length }} players:
      {{ avalon.config.playerList.length - numEvilPlayers }} good, {{ numEvilPlayers }} evil
    </p>
     </v-layout>
  </v-flex>
  </v-layout>
  <!--                IN-GAME LOG CODE. DISABLED FOR NOW    --
  <v-layout align-center justify-center column>
    <v-flex xs12 sm6 v-if='canStartGame'>
      <v-container>
    <v-dialog v-model="showOptionGameLog" max-width='450'>
      <v-card class="cyan lighten-4">
        <v-card-title class="cyan lighten-2">
          <h3>Enable in-game log display</h3>
        </v-card-title>
        <v-card-text>
          Display the voting record of all players during the game.
          This may make the game less social and more analytical. It will also make
          it harder to hide as Merlin! Use at your own risk.
        </v-card-text>
      </v-card>
    </v-dialog>
 <v-list class="blue-grey lighten-4">
    <v-list-tile>
    <v-flex xs1>
      <v-checkbox v-model='options.inGameLog' color="black"></v-checkbox>
    </v-flex>
    <v-flex xs9 pl-2>
      Enable in-game log display
    </v-flex>
    <v-flex xs2>
      <v-btn icon @click='showOptionGameLog = true'><v-icon>info</v-icon>
      </v-btn>
    </v-flex>
  </v-list-tile> 
  </v-list>
  </v-container>
  </v-flex>
  </v-layout>

                     END IN-GAME LOG CODE SELECTION -->  
  <v-layout align-center justify-center pt-2>
    <v-btn
     v-if='canStartGame'
     :loading='startingGame'
     @click='startGame()'
    >
        <v-icon left>
          play_arrow
        </v-icon>
      Start Game
    </v-btn>
    <v-card v-else xs6 md3 class="blue-grey lighten-4">
      <v-card-text class="text-xs-center">
        {{ reasonToNotStartGame }}
      </v-card-text>
    </v-card>
  </v-layout>
    <v-layout align-center justify-center pt-2>
      <BuyButton :avalon='avalon' />
    </v-layout>
<v-layout pt-5 column align-end>
  <v-flex>
    <v-btn small block href='https://discord.gg/HTdk68u' target='_blank' color='grey lighten-1'>
      <v-icon left small>
        fab fa-discord
      </v-icon>
      <span>Discord Chat</span>
    </v-btn>
  </v-flex>
  <v-flex>
    <v-btn small block href='mailto:support@avalongame.online' target="_blank" color='grey lighten-1'>
      <v-icon left small>
        fas fa-envelope-square
      </v-icon>
       <span>Send feedback</span>
    </v-btn>
  </v-flex>
</v-layout>
  </v-container>
</template>

<script>
import { EventBus } from '@/main.js'
import avalonLib from '@/../../server/common/avalonlib.js'
import LobbyPlayerList from './LobbyPlayerList.vue'
import RoleList from './RoleList.vue'
import BuyButton from './BuyButton.vue'

export default {
  name: 'Lobby',
  components: {
    LobbyPlayerList,
    BuyButton,
    RoleList
  },
  props: [ 'avalon' ],
  data() {
    return {
      options: {
        inGameLog: false
      },
      showOptionGameLog: false,
      startingGame: false
    }
  },
  created() {
    EventBus.$on('evt', () => console.log("event in lobby", ...arguments));
  },
  computed: {
    reasonToNotStartGame: function() {
      if (this.avalon.config.playerList.length < 5) {
        return 'Need at least 5 players! Invite your friends to lobby ' + this.avalon.lobby.name;
      }
      if (this.avalon.config.playerList.length > 10) {
        return 'Cannot start game with more than 10 players';
      }
      if (!this.avalon.isAdmin) {
        return 'Waiting for ' + this.avalon.lobby.admin.name + ' to start game...';
      }

      return null;
    },
    canStartGame: function() {
      return this.reasonToNotStartGame == null;
    },
    validTeamSize() {
      return (this.avalon.config.playerList.length >= 5) && (this.avalon.config.playerList.length <= 10);
    },
    numEvilPlayers() {
      return avalonLib.getNumEvilForGameSize(this.avalon.config.playerList.length);
    }
  },
  methods: {
    startGame: function() {
      this.startingGame = true;
      this.avalon.startGame(this.options);
    }
  }
 }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
