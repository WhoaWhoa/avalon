<template>
  <v-dialog v-model="dialog" max-width='450'>
    <v-btn slot="activator" light :loading='quitting'>
      <v-icon left>exit_to_app</v-icon>
      Quit
    </v-btn>
    <v-card class="cyan lighten-4">
      <v-card-title class="cyan lighten-2">
          <h3>{{ actionDescription }}?</h3>
      </v-card-title>
      <v-card-text>
          {{ gameInProgressText }}
          Are you sure you want to proceed?
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click='quitButtonClicked()'>
            {{ actionDescription }}
        </v-btn>
        <v-btn color="secondary" @click='dialog = false'>
            Nevermind
        </v-btn>        
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'ToolbarQuitButton',
  props: [ 'avalon' ],
  data() {
      return {
          quitting: false,
          dialog: false
      };
  },
  computed: {
      actionDescription() {
        if (this.avalon.isGameInProgress) {
            return 'Cancel Game';
        }
        return 'Leave Lobby';
      },
      gameInProgressText() {
          if (this.avalon.isGameInProgress) {
              return 'The current game will be canceled!'
          } else {
              return '';
          }
      }
  },
  methods: {
      quitButtonClicked() {
          this.quitting = true;
          this.dialog = false;
          if (this.avalon.isGameInProgress) {
              this.avalon.cancelGame().finally(() => this.quitting = false);
          } else {
              this.avalon.leaveLobby();
          }
      }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>