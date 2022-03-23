<template>
  <v-card class="blue-grey lighten-4">
    <v-card-title class="light-blue lighten-4">
      Mission in Progress
     </v-card-title>
     <v-card-text>
      <div v-if='needsToVote'>
        <v-layout align-center justify-space-between row fill-height>
        <v-btn @click='missionVote(true)'>
            <v-icon left color="green">fas fa-check-circle</v-icon>
                SUCCESS
            </v-btn>
        <v-btn @click='missionVote(false)'>
          <v-icon left color="red">fas fa-times-circle</v-icon>
            FAIL
        </v-btn>
        </v-layout>
       </div>
       <div v-else>
           <!-- need to make a more dramatic reveal at the end! -->
           {{ waitingForText }}
       </div>
     </v-card-text>
  </v-card>
</template>

<script>
import _ from 'lodash';

export default {
  name: 'MissionAction',
  props: [ 'avalon' ],
  data() {
      return {        
          needsToVote: this.avalon.game.currentProposal.team.includes(this.avalon.user.name)
      };
  },
  methods: {
      missionVote(vote) {
        // no loading state, we want to hide the results as fast as possible
        this.needsToVote = false;
        this.avalon.doMission(vote);
      }
  },
  computed: {
    stillWaitingFor() {
      return _.difference(this.avalon.game.currentProposal.team,
                          this.avalon.game.currentMission.team).filter(
                            n => n != this.avalon.user.name);
    },
    waitingForText() {
      if (this.stillWaitingFor.length > 0) {
        return 'Waiting for ' + this.stillWaitingFor.joinWithAnd();
      } else {
        return 'Waiting for results...';
      }
    }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>