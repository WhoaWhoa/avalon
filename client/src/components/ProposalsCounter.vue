<template>
<v-container>
  <v-layout align-center justify-space-around row>
    <div v-for="n in 5" :key="n">
      <v-icon v-if='avalon.game.currentProposalIdx + 1 == n' class="fas fa-crown"></v-icon>
      <v-icon v-else small class="fas fa-circle"></v-icon>
    </div>
</v-layout>
</v-container>
</template>

<script>
export default {
  name: 'ProposalCounter',
  props: [ 'avalon' ],
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>