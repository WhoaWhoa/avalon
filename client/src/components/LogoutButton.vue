<template>
  <v-btn slot="activator" light :loading='loggingOut' @click='logoutButtonClicked()'>
    <v-icon left>exit_to_app</v-icon>
      Logout
  </v-btn>
</template>

<script>
export default {
  name: 'LogoutButton',
  props: [ 'avalon' ],
  data() {
      return {
          loggingOut: false
      };
  },
  methods: {
      logoutButtonClicked() {
          this.loggingOut = true;
          this.avalon.logout();
      }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>