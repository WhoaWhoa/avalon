<template>
  <table>
    <tr v-for="player in players" :key="player">
      <td class='player-name'>
        <span class='font-weight-medium'>{{ player }}</span>
      </td>
      <td v-if='roles' class='role'>
        {{ roles.find(r => r.name == player).role }}
      </td>
      <template v-for='mission in missions'>
        <td v-for='proposal in mission.proposals.filter(p => p.team.length > 0)'
         :key='player + "_proposal" + missions.indexOf(mission) + "_" + mission.proposals.indexOf(proposal)'>
        <font-awesome-layers>
          <font-awesome-icon v-if='proposal.proposer == player'
           color="yellow" transform="grow-13" :icon='["fas", "circle"]' />
          <font-awesome-icon v-if='proposal.team.includes(player)'
           color="#629ec1" transform="grow-13" :icon='["far", "circle"]' />
          <template v-if='proposal.state != "PENDING"'>
          <font-awesome-icon v-if='proposal.votes.includes(player)'
           transform="right-1" color='green' :icon='["far", "thumbs-up"]' />
          <font-awesome-icon transform="right-1" v-else
           color='#ed1515' :icon='["far", "thumbs-down"]' />
          </template>
        </font-awesome-layers>
      </td>
      <td v-if='missionVotes' :key='player + "_mission" + missions.indexOf(mission)' class='mission-result'>
        <template v-if='mission.team.includes(player)'>
          <v-icon small v-if='missionVotes[missions.indexOf(mission)][player]'
            color='green'> fas fa-check-circle </v-icon>
          <v-icon small v-else color="red"> fas fa-times-circle </v-icon>
        </template>
      </td>
      </template>
    </tr>
  </table>
</template>

<script>
export default {
  name: 'MissionSummaryTable',
  props: [ 'players', 'missions', 'roles', 'missionVotes' ],
  data() {
      return {
      }
  },
  methods: {
      isCurrentProposal(mission, proposal) {
          return mission.state == 'PENDING' && mission.proposal.mission.proposals.indexOf(proposal) == mission.proposals.length - 1;
      }
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
