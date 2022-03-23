<template>
     <v-dialog v-model="endGameDialog" fullscreen persistent>
      <v-card v-if='endGameDialog && avalon.game && avalon.game.outcome' class="cyan lighten-4">
        <v-card-title class="cyan lighten-2 endGameTitle">
            <v-layout align-center justify-center row fill-height>
                <span class='display-1 font-weight-bold'>{{title}}</span>
            </v-layout>
        </v-card-title>
        <v-card-text>
            <v-layout align-center column justify-center>            
            <div class='headline font-weight-bold'> {{ avalon.game.outcome.message }}</div>
            <p v-if='avalon.game.outcome.assassinated'>
                {{ avalon.game.outcome.assassinated}} was assassinated by
                {{ avalon.game.outcome.roles.find(r => r.assassin ).name }}
            </p>
            <v-container style='overflow-x: auto; width: 100%;'>
              <MissionSummaryTable
               :players='avalon.game.players'
               :missions='missions'
               :roles='roleAssignments'
               :missionVotes='avalon.game.outcome.votes' />
            </v-container>
            <Achievements :avalon='avalon' />
            </v-layout>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn light @click="endGameDialogClosed()">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<script>
import { EventBus } from '@/main.js'
import Achievements from './Achievements.vue'
import MissionSummaryTable from './MissionSummaryTable.vue'

export default {
  name: 'EndGameEventHandler',
  props: [ 'avalon' ],
  components: {
      Achievements,
      MissionSummaryTable
  },
  data() {
      return {
          endGameDialog: false,
      }
  },
  computed: {
      title() {
          switch (this.avalon.game.outcome.state) {
              case 'GOOD_WIN': return 'Good wins!';
              case 'EVIL_WIN': return 'Evil wins!';
              case 'CANCELED': return 'Game Canceled';
              default: return this.avalon.game.outcome.state;
          }
      },
      roleAssignments() {
        return this.avalon.game.outcome.roles.slice(0).sort((a,b) => {
          let roleIndexOf = (name) => this.avalon.config.roles.findIndex(r => r.name == name);
          return roleIndexOf(a.role) - roleIndexOf(b.role);
        });
      },
      missions() {
          return this.avalon.game.missions.filter(m => m.proposals.filter(p => p.state != 'PENDING').length > 0);
      }
  },
  methods: {
      endGameDialogClosed() {
          this.endGameDialog = false;
      }
  },
  mounted() {
      EventBus.$on('GAME_ENDED', () => {
          this.endGameDialog = true;
      });
      EventBus.$on('GAME_STARTED', () => {
          // time to start new game!
          this.endGameDialog = false;
      });      
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

 table { 
    border-collapse: collapse;
 }

 tr {
    height: 2.3em;
 }

 td {
     width: 1.7em;     
     padding-left: 6px;
     padding-right: 4px;
 }

  tr:nth-child(even) { 
     background-color: Gainsboro;
  } 

  tr:nth-child(odd) {
      background-color: bisque;
  }

  td.role {
    border-right: 2px solid;
    white-space: nowrap;
  }

  td.player-name {
      border-left: 2px solid;
  }

  td.mission-result {
    border-right: 2px solid;  
  }

  .endGameTitle {
      padding-left: 30px;
      text-align: center;
  }
</style>
