<template>
    <v-tabs fixed-tabs grow centered
      active-class="blue lighten-2">
      <v-tab class="light-blue lighten-4">
          Players
      </v-tab>
      <v-tab-item>
          <GamePlayerList :avalon='avalon' @selected-players='$emit("selected-players", $event)'></GamePlayerList>
      </v-tab-item>
      <v-tab class="light-blue lighten-4">
          Roles
      </v-tab>
      <v-tab-item>
          <RoleList
           :roles='avalon.lobby.game.roles.map(r => avalon.config.roleMap[r])'
           :allowSelect='false'></RoleList>
      </v-tab-item>
    </v-tabs>
</template>

<script>
import GamePlayerList from './GamePlayerList.vue'
import RoleList from './RoleList.vue'

export default {
  name: 'GameParticipants',
  props: [ 'avalon' ],
  components: { GamePlayerList, RoleList },
}
</script>