<template>
  <div v-if="badges.length" class='pt-4'>
    <div class='display-1' style='text-align: center;'>Achievements</div>
    <div v-for="badge in badges" :key="badge.title" class="pt-2">
    <v-card class="blue-grey lighten-4" min-width='400' max-width='900'>
      <v-card-title class="cyan lighten-2">
        <v-icon left color="yellow">fas fa-trophy</v-icon>
        <div class='title'>{{ badge.title }}</div></v-card-title>
      <v-card-text>{{ badge.body }}</v-card-text>
    </v-card>
    </div>
  </div>
</template>
<script>
import GameAnalysis from "@/avalon-analysis.js";

export default {
  name: "Achievements",
  props: ["avalon"],
  computed: {
    badges() {
      if (this.avalon.lobby.game.outcome.state == 'CANCELED') return [];
      const gameAnalysis = new GameAnalysis(
        this.avalon.lobby.game,
        this.avalon.config.roleMap
      );
      return gameAnalysis.getBadges();
    }
  }
};
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
