<template>
    <v-card class="blue-grey lighten-4">
      <v-card-title class="light-blue lighten-4">
          Team Proposal Vote ({{ this.avalon.game.currentProposalIdx + 1 }}/5)
      </v-card-title>
      <v-card-text>
        <div>Voting for {{ proposer }} team of {{ this.avalon.game.currentProposal.team.joinWithAnd() }}</div>
        <v-layout align-center justify-space-between row fill-height>
        <v-btn @click='teamVote(true)'
         v-bind:loading='loadingState.yes'
         v-bind:disabled='disabledState.yes'>
            <v-icon v-if='votedState.yes' left color='green'>fas fa-vote-yea</v-icon>
            <v-icon v-else left color="green">far fa-thumbs-up</v-icon>
            Approve
        </v-btn>
        <v-btn @click='teamVote(false)'
         v-bind:loading='loadingState.no'
         v-bind:disabled='disabledState.no'>
          <v-icon v-if='votedState.no' left color='red'>fas fa-vote-yea</v-icon>
          <v-icon v-else left color="red">far fa-thumbs-down</v-icon>
            Reject
        </v-btn>
        </v-layout>
    </v-card-text>
    </v-card>
</template>

<script>
export default {
  name: 'TeamVoteAction',
  props: [ 'avalon' ],
  data() {
      const hasVoted = this.avalon.game.currentProposal.votes.includes(this.avalon.user.name);
      return {
          // TODO: can use simple array as long as you use Vue.set (not direct assignment)
          // see: https://vuejs.org/v2/guide/list.html#Caveats
          loadingState: { yes: false, no: false } ,
          disabledState: { yes: hasVoted, no: hasVoted },
          votedState: { yes: false, no: false }          
      };
  },
  computed: {
      proposer() {
          return (this.avalon.game.currentProposer == this.avalon.user.name) ?
            'your' : this.avalon.game.currentProposer + "'s ";
      },
  },
  methods: {
      teamVote(vote) {
          const myState = vote ? 'yes' : 'no';
          const otherState = vote ? 'no' : 'yes';
          this.loadingState[myState] = true;
          this.disabledState[otherState] = true;
          this.avalon.voteTeam(vote).finally(() => {
              this.loadingState[myState] = false;
              this.disabledState[myState] = true;
              this.disabledState[otherState] = false;
              this.votedState[myState] = true;
              this.votedState[otherState] = false;
          });
      }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>