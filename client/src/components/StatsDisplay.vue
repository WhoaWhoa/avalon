<template>
  <v-layout align-center column>
  <table>
    <thead>
      <tr class='stats-header font-weight-medium'>
        <td></td>
        <td>Good</td>
        <td>Evil</td>
        <td>Total</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class='font-weight-medium'>Games</td>
        <td>{{ good }}</td>
        <td>{{ evil }}</td>
        <td>{{ games }}</td>
       </tr>
       <tr>
         <td class='font-weight-medium'>Wins</td>
         <td>{{ good_wins }}</td>
         <td>{{ evil_wins }}</td>
         <td>{{ wins }}</td>
        </tr>
        <tr>
          <td class='font-weight-medium'>Losses</td>
          <td>{{ good - good_wins }}</td>
          <td>{{ evil - evil_wins }}</td>
          <td>{{ games - wins }}</td>
        </tr>
        <tr>
          <td class='font-weight-medium'>Win Rate</td>
          <td>{{ good_win_rate }}</td>
          <td>{{ evil_win_rate }}</td>
          <td>{{ win_rate }}</td>
        </tr>
        <tr v-if='globalStats'>
          <td class='font-weight-medium'>All Users</td>
          <td>{{ global_good_win_rate }}</td>
          <td>{{ global_evil_win_rate }}</td>
          <td></td>
        </tr>
    </tbody>
  </table>
  <v-flex pt-2>
    <div pt-5>Total Playtime: {{ playtime }} </div>
  </v-flex>
  </v-layout>
</template>
<script>
export default {
  name: 'StatsDisplay',
  props: [ 'stats', 'globalStats' ],
  computed: {
      games() { return this.stats.games ? this.stats.games : 0 },
      good() { return this.stats.good ? this.stats.good : 0 },
      evil() { return this.games - this.good },
      wins() { return this.stats.wins ? this.stats.wins : 0 },
      good_wins() { return this.stats.good_wins ? this.stats.good_wins : 0 },
      evil_wins() { return this.wins - this.good_wins },
      win_rate() { return this.games ? (100 * this.wins / this.games).toFixed(0)  + '%' : 'N/A' },
      good_win_rate() { return this.good ? (100 * this.good_wins / this.good).toFixed(0) + '%' : 'N/A' },
      evil_win_rate() { return this.evil ? (100 * this.evil_wins / this.evil).toFixed(0) + '%' : 'N/A' },
      global_good_win_rate() { return (100 * this.globalStats.good_wins / this.globalStats.games).toFixed(0) + '%' },
      global_evil_win_rate() { return (100 * (this.globalStats.games - this.globalStats.good_wins) / this.globalStats.games).toFixed(0) + '%' },
      playtime() {
        const hours = this.stats.playtimeSeconds / 60 / 60;
        if (hours > 1) {
          return hours.toFixed(1) + " hours";
        } else if (this.stats.playtimeSeconds > 60) {
          return (this.stats.playtimeSeconds / 60).toFixed(0) + " minutes";
        } else {
          return "Not enough";
        }
      }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

table {
    border-collapse: collapse;
}

td {
    text-align: right;
    padding-left: 1em;
    padding-right: 1em;
}

.stats-header {
  border-bottom: 2px solid;
}

</style>