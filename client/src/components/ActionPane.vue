<template>
    <div>
    <TeamProposalAction v-if='teamProposal' :avalon='avalon' :playerList='selectedPlayers'></TeamProposalAction>
    <TeamVoteAction v-if='teamVote' :avalon='avalon'></TeamVoteAction>
    <MissionAction v-if='missionAction' :avalon='avalon'></MissionAction>
    <AssassinationAction v-if='assassinationPhase' :playerList='selectedPlayers' :avalon='avalon'></AssassinationAction>
    </div>
</template>

<script>
import TeamProposalAction from './TeamProposalAction.vue'
import TeamVoteAction from './TeamVoteAction.vue'
import MissionAction from './MissionAction.vue'
import AssassinationAction from './AssassinationAction.vue'

export default {
  name: 'ActionPane',
  components: {
    TeamProposalAction,
    TeamVoteAction,
    MissionAction,
    AssassinationAction
  },
  props: [ 'avalon', 'selectedPlayers' ],
  computed: {
    teamProposal() {
        return this.avalon.game.phase == 'TEAM_PROPOSAL'
    },
    teamVote() {
        return this.avalon.game.phase == 'PROPOSAL_VOTE'
    },
    missionAction() {
        return this.avalon.game.phase == 'MISSION_VOTE'
    },
    assassinationPhase() {
        return this.avalon.game.phase == 'ASSASSINATION'
    },
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
