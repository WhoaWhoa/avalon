<template>
  <v-card class="blue-grey lighten-4">
    <v-card-title class="light-blue lighten-4">
      Team Proposal ({{ this.avalon.game.currentProposalIdx + 1}}/5)
    </v-card-title>
    <v-card-text>
      <v-layout align-center justify-center column fill-height>
     <div v-if='avalon.game.currentProposer == avalon.user.name'>
        <v-flex xs12>
        <div class="text-xs-center">Propose a team of {{ this.avalon.game.currentMission.teamSize }}</div>
        </v-flex>
        <v-flex xs12>
      <v-btn
        v-bind:disabled='!isValidSelection'
        v-bind:loading='isProposing'
        v-on:click='proposeTeam()'>Propose Team</v-btn>
        </v-flex>
     </div>
     <div v-else class="text-xs-center">
       Waiting for {{ avalon.game.currentProposer }} to propose a team of {{ this.avalon.game.currentMission.teamSize }}
     </div>
      </v-layout>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'TeamProposalAction',
  props: [ 'avalon', 'playerList' ],
  data() {
      return {
          isProposing: false
      };
  },
  computed: {
      isValidSelection() {
          return this.playerList.length == this.avalon.game.currentMission.teamSize;
      }
  },
  methods: {
      proposeTeam() {
        this.isProposing = true;
        this.avalon.proposeTeam(this.playerList);
      }
  }
}

</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>