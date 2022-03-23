<template>
  <v-container class="cyan lighten-5">
    <v-layout align-center justify-center column fill-height>
       <v-alert
        :value="avalon.confirmingEmailError"
        type="error"
       >
        {{ avalon.confirmingEmailError }} Please try logging in again.
        </v-alert>

        <div class='welcome'>
            <span class=display-2>Avalon: The Resistance <span class="font-weight-thin">Online</span></span>
            <p class='mt-3 pt-2'>
              <span class='subheading'>
                A game of social deduction for 5 to 10 people, now on desktop and mobile.
              </span>
            </p>
        </div>

        <template v-if='!emailSubmitted'>
          <v-text-field
           label="Email Address" 
           ref='userEmailField'
           v-model='emailAddr'
           type="email"
           browser-autocomplete="email"
           @keyup='clearErrorMessage()'
           @keyup.native.enter='submitEmailAddress()'
           :error-messages='errorMessage'
           autofocus />
          <v-btn
           @click='submitEmailAddress()' :loading="isSubmittingEmailAddr">
            Login
          </v-btn>
        </template>
        <template v-else>
          <v-card xs6 md3 class="blue-grey lighten-4">
            <v-card-text class="text-xs-center">
                <p>Check your email for the verification link</p>
            </v-card-text>
          </v-card>
          <v-btn class='mt-3'
           @click='resetForm()'>
            Try Again
          </v-btn>
        </template>
        </v-layout>
      <v-layout column align-end>
        <v-flex class='mt-3 pt-3'>
          <v-btn small href='mailto:support@avalongame.online' target="_blank" color='grey lighten-2'>
            <v-icon left small>
              fas fa-envelope-square
            </v-icon>
            <span>Email</span>
          </v-btn>
          <v-btn small href='https://discord.gg/HTdk68u' target='_blank' color='grey lighten-2'>
            <v-icon left small>
              fab fa-discord
            </v-icon>
            <span>Discord</span>
          </v-btn>
        </v-flex>
      </v-layout>
  </v-container>
</template>

<script>

export default {
  name: 'UserLogin',
  data() {
    return {
      emailAddr: '',
      errorMessage: '',
      isSubmittingEmailAddr: false,
      emailSubmitted: false
    };
  },
  props: {
    avalon: Object
  },
  mounted() {
    document.title = 'Avalon (Not Logged In)'
  },  
  methods: {
    clearErrorMessage() {
        this.errorMessage = '';
    },
    submitEmailAddress() {
        this.isSubmittingEmailAddr = true;
        this.clearErrorMessage();
        this.avalon.confirmingEmailError = ''; // this is not very clean but eh
        this.avalon.submitEmailAddr(this.emailAddr).then(function() {
            this.emailSubmitted = true;
        }.bind(this)).catch(function(err) {
            this.errorMessage = err.message;
        }.bind(this)).finally(function() {
            this.isSubmittingEmailAddr = false;
        }.bind(this));
    },
    resetForm() {
        this.emailSubmitted = false;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

.welcome {
  padding-top: 30px;
  padding-bottom: 30px;
  text-align: center;
}

</style>
