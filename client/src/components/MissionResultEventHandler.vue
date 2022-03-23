<template>
     <v-dialog v-model="missionDialog" max-width='450px'>
      <v-card v-if='missionDialog' class="cyan lighten-4">
        <v-card-title class="cyan lighten-2">
            <div class='headline'>
                <span v-if="mission.state == 'SUCCESS'">
                    <v-icon left color="green">fas fa-check-circle</v-icon>
                    Mission Succeeded!
                </span>
                <span v-else>
                    <v-icon left color="red">fas fa-times-circle</v-icon>
                    Mission Failed!
                </span>
            </div>
        </v-card-title>
        <v-card-text>
            {{ mission.team.joinWithAnd() }} had
            <span class='font-weight-bold'>
                {{ numFails > 0 ? numFails : "no" }}
            </span>
            failure
                {{ numFails == 1 ? "vote." : "votes." }}</v-card-text>
      </v-card>
    </v-dialog>
</template>

<script>
import { EventBus } from '@/main.js'

export default {
  name: 'MissionResultEventHandler',
  props: [ 'avalon' ],
  data() {
      return {
          missionDialog: false
      }
  },
  computed: {
      mission() {
        const curMissionIdx = (this.avalon.lobby.game.currentMissionIdx < 0) ?
            this.avalon.lobby.game.missions.length : this.avalon.lobby.game.currentMissionIdx;
          return this.avalon.lobby.game.missions[curMissionIdx - 1];
      },
      numFails() {          
          return this.mission.numFails;
      }
  },
  mounted() {
      EventBus.$on('GAME_STARTED', () => {
          this.missionDialog = false;
      });
      EventBus.$on('GAME_ENDED', () => {
          this.missionDialog = false;
      });
      EventBus.$on('MISSION_RESULT', () => {
          this.missionDialog = true;
      });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
