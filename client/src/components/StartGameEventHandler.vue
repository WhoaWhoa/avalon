<template>
     <v-dialog v-model="startGameDialog" persistent max-width='450'>
      <v-card class="cyan lighten-4">
        <v-card-title class="cyan lighten-2"><h3>Game Started</h3></v-card-title>
        <v-card-text>
            <p>A new game has started. When you are ready, view your secret role.</p>
            <p>You may also view your role anytime by clicking on your name in the toolbar.</p>        
        </v-card-text>
        <v-divider></v-divider>        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="startGameDialogClosed()">View Role</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<script>
import { EventBus } from '@/main.js'

export default {
  name: 'StartGameEventHandler',
  props: [ 'avalon' ],
  data() {
      return {
          startGameDialog: false
      }
  },
  methods: {
      startGameDialogClosed() {
          this.startGameDialog = false;
          EventBus.$emit('show-role');
      }
  },
  mounted() {
      EventBus.$on('GAME_STARTED', () => {
          this.startGameDialog = true;
      });
      EventBus.$on('GAME_ENDED', () => {
          this.startGameDialog = false;
      });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
