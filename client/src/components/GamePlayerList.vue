<template>
  <v-list class="blue-grey lighten-4">
    <v-list-tile
     v-for="(playerName) in avalon.game.players"
      :key="playerName">
    <v-flex xs2> 
      <v-checkbox
       color="indigo darken-2"
       v-if="enableCheckboxes(playerName)"
       v-model="selectedPlayers" :value='playerName'></v-checkbox>
       <v-checkbox
        v-if="selectedForMission(playerName)"
        v-bind:input-value="true"
        v-bind:ripple='false'
        color="indigo lighten-1"
        readonly></v-checkbox>
    </v-flex>
    <v-flex xs2>
      <template v-if='avalon.game.currentProposer == playerName'>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <font-awesome-layers  v-on="on" style="font-size: 1.8em">
              <font-awesome-icon :color='crownColor' :icon='["fas", "crown"]'></font-awesome-icon>
              <font-awesome-layers-text style="font-size: 0.5em"
              :value="avalon.game.currentProposalIdx + 1" transform="down-4 right-4"></font-awesome-layers-text>
            </font-awesome-layers>
          </template>
          <span>{{ playerName }} is proposing the next team</span>
        </v-tooltip>
      </template>
      <template v-else-if='playerName == avalon.game.hammer'>
        <v-layout align-center justify-center row fill-height>
        <v-icon small left>
          fas fa-hammer
        </v-icon>
        </v-layout>
        <!-- commenting this out because I can't figure out how to get this to work reliably
             it works after refresh, but the entire element within the v-tooltip disappears after
             a mission gets sent. i cannot figure out why.
          <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-icon v-on="on">
              fas fa-hammer
            </v-icon>
          </template>
          <span>{{ playerName }} will be the last chance to send a team this round</span>
        </v-tooltip>         -->
      </template>
    </v-flex>
      <v-flex xs7>
        {{playerName}}
      </v-flex>
    <v-flex xs1>
        <div>
        <v-tooltip bottom v-if='tooltipText(playerName)'>
         <template v-slot:activator="{ on }">
          <font-awesome-layers style="font-size: 1.4em" v-on="on">
            <font-awesome-icon
             v-if="wasOnLastTeamProposed(playerName)"
             color="#629ec1"
             transform="grow-13"
             :icon='["far", "circle"]'></font-awesome-icon>
            <font-awesome-icon color="#4c4c4c" v-if='waitingOnVote(playerName)' :icon='["fas", "ellipsis-h"]'></font-awesome-icon>
            <font-awesome-icon color="#4c4c4c" v-else-if='hasVoted(playerName)'
             transform="left-2 up-1"
             :icon='["fas", "vote-yea"]'></font-awesome-icon>
            <font-awesome-icon v-else-if='approvedProposal(playerName)' transform="right-1"
             color='green' :icon='["far", "thumbs-up"]'>
            </font-awesome-icon>
            <font-awesome-icon v-else-if='rejectedProposal(playerName)' transform="right-1"
            color='#ed1515' :icon='["far", "thumbs-down"]'></font-awesome-icon>
          </font-awesome-layers>
         </template>
        <span>{{ tooltipText(playerName) }}</span>
        </v-tooltip>
        </div>
    </v-flex>
  </v-list-tile> 
  </v-list>
</template>

<script>
export default {
  name: 'GamePlayerList',
  props: [ 'avalon' ],
  data() {
      return {
          selectedPlayers: [],
          allowSelect: true
      };
    },
  watch: {
    selectedPlayers() {
      let maxSelected = 1;      
      if (this.avalon.game.phase == 'TEAM_PROPOSAL') {
        maxSelected = this.avalon.game.currentMission.teamSize;
      }

      if (this.selectedPlayers.length > maxSelected) {
        this.selectedPlayers.shift();
      }
      this.$emit('selected-players', this.selectedPlayers);
    },
    'avalon.game.phase': function() {
      // clear selected players from phase to phase
      this.selectedPlayers.splice(0);
    }
  },
  computed: {
    crownColor() {
      return (this.avalon.game.currentProposalIdx < 4) ? '#fcfc00' : '#cc0808';
    },
  },
  methods: {
    enableCheckboxes(name) {
      return (this.avalon.game.phase == 'TEAM_PROPOSAL' && this.avalon.game.currentProposer == this.avalon.user.name) ||
             (this.avalon.game.phase == 'ASSASSINATION' && this.avalon.lobby.role.assassin && (name != this.avalon.user.name));
    },
    selectedForMission(name) {
      return (this.avalon.game.phase == 'PROPOSAL_VOTE' || this.avalon.game.phase == 'MISSION_VOTE') &&
        this.avalon.game.currentProposal.team.includes(name);
    },
    hasVoted(name) {
      return (this.avalon.game.phase == "PROPOSAL_VOTE") &&
             (this.avalon.game.currentProposal.votes.includes(name));
    },
    waitingOnVote(name) {
      return (this.avalon.game.phase == "PROPOSAL_VOTE") &&
             (!this.avalon.game.currentProposal.votes.includes(name));
    },
    wasOnLastTeamProposed(name) {
      switch (this.avalon.game.phase) {
        case "TEAM_PROPOSAL":
        case "ASSASSINATION":
          return this.avalon.game.lastProposal && this.avalon.game.lastProposal.team.includes(name);
        case "PROPOSAL_VOTE":
        case "MISSION_VOTE":
          return this.avalon.game.currentProposal.team.includes(name);
        default:
          console.err("Unhandled game phase", this.avalon.game.phase);
          return false;
      }
    },
    approvedProposal(name) {
      if (this.avalon.game.phase == "TEAM_PROPOSAL" || this.avalon.game.phase == 'ASSASSINATION') {
        return this.avalon.game.lastProposal && this.avalon.game.lastProposal.votes.includes(name);
      } else if (this.avalon.game.phase == "MISSION_VOTE") {
        return this.avalon.game.currentProposal.votes.includes(name);
      }
    },
    rejectedProposal(name) {
      if (this.avalon.game.phase == "TEAM_PROPOSAL" || this.avalon.game.phase == 'ASSASSINATION') {
        return this.avalon.game.lastProposal && !this.avalon.game.lastProposal.votes.includes(name);
      } else if (this.avalon.game.phase == "MISSION_VOTE") {
        return !this.avalon.game.currentProposal.votes.includes(name);
      }
    },
    tooltipText(name) {
      const states = [];
      if (this.wasOnLastTeamProposed(name)) {
        states.push('was on the last proposed team');
      }

      if (this.waitingOnVote(name)) {
        states.push('is currently voting on the proposal');
      } else if (this.hasVoted(name)) {
        states.push('has submitted a vote for the proposed team');
      } else if (this.approvedProposal(name)) {
        states.push('approved the last team');
      } else if (this.rejectedProposal(name)) {
        states.push('rejected the last team');
      }

      if (states.length == 0) return null;

      return name + ' ' + states.joinWithAnd();
    }
  }
 }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
