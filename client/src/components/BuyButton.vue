<template>
  <div v-if='avalon.user.stats.games >= 3'>
  <v-btn @click="buttonClicked()">
    <v-icon left>fas fa-donate</v-icon>
    {{ buttonText }}
  </v-btn>
  <v-dialog v-model="dialog"  persistent hide-overlay max-width='450px'>
      <v-card class="cyan lighten-2">
        <v-card-title>
            <v-layout align-center justify-center row fill-height>
                <h2 style='text-align: center'>Turns out servers cost money</h2>
            </v-layout>
        </v-card-title>
        <v-card-text>
          <p>This site is completely free to use, but if you enjoy playing here, please consider making a donation to keep it running.</p>
          <p>So far, you have played for {{ playtime }} over {{ avalon.user.stats.games }} games.</p>
        <v-layout align-center pt-3 column fill-height>
        <v-slider
          v-model="donationAmount"
          thumb-label="always"
          min='0'
          max='50'
        ></v-slider>
            <v-btn :disabled='donationAmount < 1' @click='donateStripe(donationAmount)'>Donate ${{ donationAmount }} via Stripe</v-btn>
            <v-btn :disabled='donationAmount < 1' :href='payPalLink' target='_blank'>Donate ${{ donationAmount }} via PayPal</v-btn>
            </v-layout>
            <v-layout pt-5 mt-5 align-end justify-end row fill-height>
            <v-btn @click='dialog=false'>lol no</v-btn>
            </v-layout>
        </v-card-text>
      </v-card>
  </v-dialog>
  </div>
</template>

<script>
const seedrandom = require('seedrandom');
const DEFAULT_DONATE_AMOUNT = 7;

export default {
  name: 'BuyButton',
  props: ['avalon', 'staticText'],
  data() {
    return {
        stripeKey: (process.env.NODE_ENV == 'development') ?
            'pk_test_Ju7cE8JHU5TPhaPQ7TmYsQbV00cW6feTSO' : 'pk_live_jfHHyeAArZwh2h1IihvxWaSA00hov2WnFh',
        donationSku: (process.env.NODE_ENV == 'development') ? 'sku_H4HXHuZC9Nhvl3' : 'sku_H4HX7IPOfz1p4h',
        dialog: false,
        donationAmount: DEFAULT_DONATE_AMOUNT
    }
  },
  methods: {
      buttonClicked() {
          this.dialog = true;
          // eslint-disable-next-line
          gtag('event', 'buyButtonClick');
      },
      donateStripe(amount) {
          // eslint-disable-next-line
          gtag('event', 'begin_checkout'); // might not work because stripe redirects immediately?
          // eslint-disable-next-line
          const stripe = Stripe(this.stripeKey);
          stripe.redirectToCheckout({
              items: [{sku: this.donationSku, quantity: amount}],
              //customerEmail: this.avalon.user.email,
              clientReferenceId: this.avalon.user.uid + '_donation_' + amount + '_' + Date.now(),
              successUrl: this.avalon.hostname + '?purchaseSuccess',
              cancelUrl: this.avalon.hostname + '?purchaseCanceled',
          }).then(function (result) {
              this.dialog = false;
              if (result.error) {
                // If `redirectToCheckout` fails due to a browser or network
                // error
                console.log('Big Error');
              }
          }.bind(this));
    }
  },
  computed: {
      payPalLink() {
          const params = new URLSearchParams();
          params.set('cmd', '_donations');
          params.set('business', 'support@avalongame.online');
          params.set('item_number', 'Keep AvalonGame Online running');
          params.set('amount', this.donationAmount);
          params.set('currency_code', 'USD');
          return 'https://www.paypal.com/cgi-bin/webscr?' + params.toString();
      },
      playtime() {
        const hours = this.avalon.user.stats.playtimeSeconds / 60 / 60;
        if (hours > 1) {
          return hours.toFixed(1) + " hours";
        } else {
          return (this.avalon.user.stats.playtimeSeconds / 60).toFixed(0) + " minutes";
        }
      },
      buttonText() {
          const labels = [
              'Admin access',
              'Advanced roles',
              'Add bot player',
              'Add avocado',
              'Boost XP',
              'Boost Merlin',
              'Bribe the RNG',
              'Buy us a beer',
              'Buy us a coffee',
              'Buy a magic hat',
              'Buy us lunch',
              'Buy strategy guide',
              'Checkout',
              'Claim prize',
              'Click here',
              'Click me!',
              'Collect bounty',
              'Custom theme',
              'Customize Avatar',
              'Change Lobby Name',
              'Deposit funds',
              'Disable Ads',
              'Disable Tracking',
              'Donate',
              'Donate now',
              'Double your win rate',
              'Edit your stats',
              'Enable video chat',
              'Enable hardware acceleration',
              'Enter lottery',
              'Expand inventory',
              'Expedited shipping',
              'Extra cheese',
              'Find horny singles in your area',
              'Free hamster',
              'Get personalized advice',
              'Gold subscription',
              'Help this site',
              'Lady of the Lake',
              'Level Up',
              'Make $$$ working from home',
              'Merlinate the Game',
              'Maximum Graphics Settings',
              'Offline mode',
              'One-year membership',
              'Pick your role',
              'Play minigame',
              'Play tutorial',
              'Premium membership',
              'Premium lounge access',
              'Premium support',
              'Personalized coaching',
              'Quick Mode',
              'Referral bonus',
              'Reset settings',
              'Request new features',
              'Rewards Program Signup',
              'Save checkpoint',
              'Select team',
              'Special Merlin diet plan',
              'Start',
              'Start premium game',
              'Subscribe and save',
              'Supersize your order',
              'Shopping cart',
              'Single-Player Mode',
              'Toss us some coins',
              'Turn on lie detector',
              'Undo last game',
              'Upload profile photo',
              'Unlock secret levels',
              'Unlock custom roles',
              'Unlock rare cosmetics',
              'Upgrade your account',
              'Upgrade Merlin',
              'Upgrade Percival',
              'XP Boost'
          ];

          if (this.staticText) {
            return this.staticText;
          }

          // can vary button label no more often than every 30 seconds
          const seed = this.avalon.user.uid + Math.floor(Date.now() / 30000);
          const rng = seedrandom(seed);
          return labels[Math.floor(rng() * labels.length)];
      }
    }
 }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
