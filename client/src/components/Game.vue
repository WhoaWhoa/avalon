<template>
<div>
 <v-container>
  <Missions :avalon='avalon'></Missions>
 </v-container>
 <v-container>
  <GameParticipants v-on:selected-players='updateSelectedPlayers($event)' :avalon='avalon'></GameParticipants>
 </v-container>
 <v-container>
  <ActionPane :avalon='avalon' :selectedPlayers='selectedPlayers'></ActionPane>  
  </v-container>
  </div>
</template>

<script>
import Missions from './Missions.vue'
import GameParticipants from './GameParticipants.vue'
import ActionPane from './ActionPane.vue'

export default {
  name: 'Game',
  components: {
    Missions,
    GameParticipants,
    ActionPane,
  },
  props: [ 'avalon'],
  data() {
    return {
      selectedPlayers: []
    };
  },
  methods: {
    updateSelectedPlayers(newList) {
      this.selectedPlayers = newList;
    },
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
