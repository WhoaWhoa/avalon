<template>
  <div>
  <v-list class="blue-grey lighten-4">
    <v-list-tile
     v-for="(role, index) in roles"
      :key="index">
    <v-flex v-if="allowSelect" xs1>
      <v-checkbox
       color="black"
       v-model='role.selected'
       ></v-checkbox>
    </v-flex>
      <v-flex xs10>
        <!-- setting 'right' property if we allow select to give space between checkbox at the left -->
        <v-icon :right='allowSelect' v-if='role.team == "good"'>fab fa-old-republic</v-icon>
        <v-icon :right='allowSelect' v-else color="red">fas fa-khanda</v-icon>
        {{role.name}}
      </v-flex>
    <v-flex xs2>
      <v-btn icon @click='showRoleInfo(role)'><v-icon>info</v-icon>
      </v-btn>
    </v-flex>
  </v-list-tile> 
  </v-list>
  <v-dialog v-model="roleInfo" max-width='450'>
    <v-card class="cyan lighten-4">
        <v-card-title class="cyan lighten-2">
          <v-icon left v-if='selectedRole.team == "good"'>fab fa-old-republic</v-icon>
          <v-icon left v-else color="red">fas fa-khanda</v-icon>          
          <h3>{{ selectedRole.name }}</h3>
        </v-card-title>
        <v-card-text>
          {{ selectedRole.description }}
        </v-card-text>
    </v-card>
  </v-dialog>
  </div>
</template>

<script>
export default {
  name: 'RoleList',
  props: [ 'roles', 'allowSelect'],
  data() {
    return {
      roleInfo: false,
      selectedRole: 'blah'
    }
  },
  methods: {
    showRoleInfo(role) {
      this.roleInfo = true;
      this.selectedRole = role;
    }
  }
 }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
