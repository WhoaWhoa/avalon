<template>
  <v-bottom-sheet v-model="sheet">
    <v-btn slot="activator" light>
      <v-icon left>
        perm_identity
        <!-- person -->
      </v-icon>
      {{ avalon.user.name }}        
    </v-btn>
    <v-card v-if='!avalon.isGameInProgress' class="cyan lighten-4">
      <v-card-title>
        <v-layout align-center column justify-center>
          <div class="font-weight-bold">When the game starts, you will see your role here.</div>
        </v-layout>
      </v-card-title>
      <v-card-text>
        <v-layout align-center column justify-center>
          <p class='subheading'>Your Stats</p>
          <StatsDisplay :stats='avalon.user.stats' :globalStats='avalon.globalStats' />
        </v-layout>
      </v-card-text>
    </v-card>
    <v-card v-else class="cyan lighten-4">
      <v-card-title class="cyan lighten-2">
          <v-icon left v-if='avalon.lobby.role.role.team == "good"'>fab fa-old-republic</v-icon>
          <v-icon left v-else color="red">fas fa-khanda</v-icon>          
          <span class='headline'>{{ avalon.lobby.role.role.name }}</span>
      </v-card-title>
      <v-card-text>
           <p>Your role is <span class='font-weight-medium'>{{ avalon.lobby.role.role.name}}</span>.</p>
           <p>You are on the <span class='font-weight-medium'>{{ avalon.lobby.role.role.team }}</span> team.</p>
           <p>{{ avalon.lobby.role.role.description }}</p>
           <p v-if='avalon.lobby.role.assassin'>
             You are also the <span class='font-weight-medium'>ASSASSIN</span>!
             It will be up to you to identify MERLIN if the good team succeeds 3 missions.
           <p>
           <div v-if='avalon.lobby.role.sees.length'>
               <p>You see <span class='font-weight-bold'>{{ avalon.lobby.role.sees.joinWithAnd() }}</span>.</p>
           </div>
           <p v-else>
             You do not see anyone.
           </p>
      </v-card-text>
    </v-card>    
  </v-bottom-sheet>
</template>

<script>
import { EventBus } from '../main.js'
import StatsDisplay from './StatsDisplay.vue'

export default {
  name: 'ViewRoleButton',
  components: {
    StatsDisplay
  },
  props: [ 'avalon' ],
  mounted() {
      EventBus.$on('show-role', () => this.sheet = true);
      EventBus.$on('GAME_ENDED', () => this.sheet = false);
  },
  data() {
      return {
          sheet: false,
      };
  },
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>