import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import _ from 'lodash'
import avalonLib from '../../server/common/avalonlib';
import {AvalonApi} from './avalon-api-rest';
import firebaseConfig from './firebase-config';

const axios = require('axios');

const HOSTNAME = 'https://avalongame.online/';

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function onFirebaseError(err) {
  console.error(err);
}

class Game {
  constructor(game, config) {
    this.game = game;
    if (game.roles) {
      this.roleInfos = game.roles.sort(
        (a,b) => {
          let roleIndexOf = (name) => config.roles.findIndex(r => r.name == name);
          return roleIndexOf(a) - roleIndexOf(b);
        }).map(r => config.roleMap[r]);
    }
    Object.assign(this, game);

    if (this.state == 'INIT') {
      return;
    }
    this.numPlayers = this.game.players.length;
    this.currentMissionIdx = this.missions.findIndex(m => m.state == 'PENDING');
    if (this.currentMissionIdx < 0) {
      this.currentMission = null;
      this.currentProposalIdx = -1;
      this.currentProposal = null;
      this.currentProposer = null;
      this.hammer = null;
    } else {
      this.currentMission = this.missions[this.currentMissionIdx];
      this.currentProposalIdx = this.currentMission.proposals.findIndex(p => p.state == 'PENDING');
      if (this.currentProposalIdx < 0) {
        // no pending proposals, so must be latest one
        this.currentProposalIdx = this.currentMission.proposals.length - 1;
      }
      this.currentProposal = this.missions[this.currentMissionIdx].proposals[this.currentProposalIdx];
      this.currentProposer = (this.currentProposal ? this.currentProposal.proposer : null);

      if (this.currentProposal != null) {
        const proposerIdx = this.game.players.findIndex(p => p == this.currentProposer);
        const hammerIdx = (proposerIdx + (4 - this.currentProposalIdx)) % this.numPlayers;
        this.hammer = this.game.players[hammerIdx];
      } else {
        this.hammer = null;
      }
    }
  }

  get lastProposal() {
    if (this.currentProposalIdx > 0) {
      return this.missions[this.currentMissionIdx].proposals[this.currentProposalIdx - 1];
    }
    if (this.currentMissionIdx <= 0) {
      return null;
    }
    return this.missions[this.currentMissionIdx - 1].proposals.find(p => p.state == 'APPROVED');
  }

  getNumTeam(team) {
    return this.game.roles.filter(r => this.roleMap[r].team == team).length;
  }

  get numEvil() {
    return this.getNumTeam('evil');
  }

  get numGood() {
    return this.getNumTeam('good');
  }
}

class LobbySubscription {

  constructor(uid, lobbyName, config, eventHandler) {
    this.name = lobbyName;
    this._uid = uid;
    this._doc = null;
    this._roleDoc = null;    
    this._game = null;
    this._config = config;
    this.connected = false;
    this._eventHandler = eventHandler;
    this._subscriptions = { };
  }

  get data() {
    return this._doc;
  }

  get users() {
    return this.data.users;
  }

  get admin() {
    return this.data.admin;
  }

  get game() {
    return this._game;
  }

  get role() {
    return this._roleDoc;
  }

  start() {
    this._subscriptions.lobbyDoc =
      db.collection('lobbies').doc(this.name).onSnapshot(
        this._lobbyDocUpdated.bind(this),
        onFirebaseError);
    this._subscriptions.roleDoc =
      db.collection('lobbies').doc(this.name).collection('roles').doc(this._uid).onSnapshot(
        this._roleDocUpdated.bind(this));
  }

  stop() {
    if (this._subscriptions.lobbyDoc) {
      this._subscriptions.lobbyDoc();
    }

    if (this._subscriptions.roleDoc) {
      this._subscriptions.roleDoc();    
    }

    this._subscriptions = { };
    this.connected = false;
  }

  _roleDocUpdated(roleDoc) {
    this._roleDoc = roleDoc.data();
    // enhance role
    if (this._roleDoc) {
      this._roleDoc.role = this._config.roleMap[this._roleDoc.role];
    }
  }

  _lobbyDocUpdated(newDoc) {
    const oldDoc = this._doc;

    if (!newDoc.exists) {
      // shouldn't really happen
      console.error('lobby', this.name, 'disappeared from underneath us');
      this.stop();
      return;
    }

    this._doc = newDoc.data();
    this._game = new Game(this._doc.game, this._config);

    if ((oldDoc == null) ||
        (oldDoc.name != this._doc.name)) {
      this.connected = true;
      this._eventHandler('LOBBY_CONNECTED');

      /* -- debug -- view old log
      // const logName = '2020-04-07T02:08:27.212Z_TPB'; // five rejected in a row
      const logName = '2020-04-14T02:50:34.684Z_SQL'; // Actual Merlin achievement
      //const logName = '2020-03-26T01:56:50.603Z_CHR';
      db.collection('logs').doc(logName).get().then((doc) => {
        console.log('got ', doc.data());
        this._game = doc.data();
        this._game.players = this._game.players.map(p => p.name); // flatten it to just names
        this._eventHandler('GAME_ENDED');    
      }); /* */

      /* -- debug -- view random lobby
      const lobbyName = 'WDR';
      db.collection('lobbies').doc(lobbyName).get().then((lobbyDoc) => {
        this._game = lobbyDoc.get('game');
        
        this._eventHandler('GAME_ENDED');
      });
      */

      return;
    }

    if (oldDoc.admin.uid != newDoc.data().admin.uid) {
      this._eventHandler('LOBBY_NEW_ADMIN');
    }

    if ((_.keys(oldDoc.users).length != _.keys(newDoc.data().users).length) ||
        !_.keys(oldDoc.users).every(u => newDoc.data().users[u])) {
      this._eventHandler('PLAYER_LIST_CHANGED');
    }

    if (oldDoc.game.state != newDoc.data().game.state) {
      this._eventHandler(
        newDoc.data().game.state == 'ACTIVE' ? 'GAME_STARTED' : 'GAME_ENDED'
      );
    } else if (oldDoc.game.phase != newDoc.data().game.phase) {
      if (this.game.phase == 'TEAM_PROPOSAL') {
        if (this.game.currentProposalIdx > 0) {
          this._eventHandler('PROPOSAL_REJECTED');
        } else {
          this._eventHandler('MISSION_RESULT');
        }
      } else if (this.game.phase == 'ASSASSINATION') {
        this._eventHandler('MISSION_RESULT');
      } else if (this.game.phase == 'MISSION_VOTE') {
        this._eventHandler('PROPOSAL_APPROVED');
      } else if (this.game.phase == 'PROPOSAL_VOTE') {
        this._eventHandler('TEAM_PROPOSED');
      } else {
        console.warn('No mapped event for', this.game.phase);
      }
    }
  }
}

class GameConfig {

  constructor(notificationCallback) {
    this.playerList = [];
    this.setupRoles();
    this.notifyEvent = notificationCallback;
  }

  get selectedRoleList() {
    return this.roles.filter(r => r.selected).map(r => r.name);
  }

  sortList(newList) {
    console.assert(newList.length == this.playerList.length);
    this.playerList = newList;
  }

  roleDescription(role) {
    return this.roleMap[role];
  }

  updatePlayerList(newList, notifyForEachPlayer) {
    newList = _.values(newList).map(u => u.name);

    if (this.playerList.length == 0) {
      this.playerList = newList;
      return;
    }

    const removedPlayers = _.difference(this.playerList, newList);
    const newPlayers = _.difference(newList, this.playerList);

    removedPlayers.forEach(r => {
      this.playerList.splice(this.playerList.indexOf(r), 1);
      if (notifyForEachPlayer) this.notifyEvent('PLAYER_LEFT', r);
    });

    this.playerList = this.playerList.concat(newPlayers);
    if (notifyForEachPlayer) {
      newPlayers.forEach(p => this.notifyEvent('PLAYER_JOINED', p));
    }
  }

  updateRoles(roles) {
    this.roles.forEach(r => r.selected = false);
    roles.forEach(r => this.roleMap[r].selected = true);
  }

  setupRoles() {
    this.roles = avalonLib.ROLES;
    this.selectableRoles = this.roles.filter(r => r.selectable);
    this.roleMap = _.keyBy(this.roles, r => r.name);
  }
}

export default class AvalonGame {

  constructor(eventCallback) {
    // XXX TODO: find a better place for this:
    Array.prototype.joinWithAnd = function() {
      if (this.length == 0) return '';
      if (this.length == 1) return this[0];
      const arrCopy = this.slice(0);
      const lastElem = arrCopy.pop();
      return arrCopy.join(', ') + ' and ' + lastElem;
    };

    this.api = new AvalonApi();

    this._authStateInitialized = false;
    this.confirmingEmailError = null;
    this.lobby = null;
    this.user = null;
    this.userDocUnsubscribe = null;
    this.globalStats = null;
    this.hostname = process.env.NODE_ENV == 'development' ? 'http://localhost:8080/' : HOSTNAME;

    _.bindAll(this);

    this._eventCallback = eventCallback;
    this.config = new GameConfig(this.notifyEvent.bind(this));    
  }

  notifyEvent() {
    if (this._eventCallback) {
      this._eventCallback(...arguments);
    } else {
      console.warn("(no event callback)", ...arguments);
    }
  }

  joinLobbyImpl(joinLobbyPromise) {
    return joinLobbyPromise.then(function(resp) {
      this.subscribeToLobby(resp.data.lobby);
    }.bind(this));
  }

  joinLobby(name, lobby) {
    return this.joinLobbyImpl(this.api.joinLobby(name, lobby));
  }

  createLobby(name) {    
    return this.joinLobbyImpl(this.api.createLobby(name));
    //return new Promise((resolve, reject) => setTimeout(() => resolve(name), 3000));
  }

  leaveLobby() {
    return this.api.leaveLobby(this.lobby.name).then(() => this.unsubscribeFromLobby());
  }

  kickPlayer(name) {
    return this.api.kickPlayer(this.lobby.name, name);
  }

  cancelGame() {
    return this.api.cancelGame(this.lobby.name, this.user.name);
  }

  voteTeam(vote) {
    return this.api.voteTeam(
      this.lobby.name,
      this.user.name,      
      this.game.currentMissionIdx,
      this.game.currentProposalIdx,
      vote);
  }

  startGame(options) {
    return this.api.startGame(this.lobby.name, this.config.playerList, this.config.selectedRoleList, options);
  }

  proposeTeam(playerList) {
    return this.api.proposeTeam(
      this.lobby.name,
      this.user.name,
      this.game.currentMissionIdx,
      this.game.currentProposalIdx,
      playerList);
  }

  doMission(vote) {
    return this.api.doMission(
      this.lobby.name,
      this.user.name,
      this.game.currentMissionIdx,
      this.game.currentProposalIdx,
      vote);
  }

  assassinate(target) {
    return this.api.assassinate(
      this.lobby.name,
      this.user.name,
      target);
  }

  get initialized() {
    if (!this._authStateInitialized) {
      return false;
    }

    // either not logged in or if logged in, then we're not in lobby or we've loaded the lobby already
    return (this.user == null) || !this.user.lobby || this.isInLobby;
  }

  get isLoggedIn() {
    return (this.initialized && (this.user != null));
  }

  get isAdmin() {
    return this.isInLobby && (this.lobby.admin.uid == this.user.uid);
  }

  get isInLobby() {
    return this.user && this.user.lobby && this.lobby && this.lobby.connected;
  }

  get isGameInProgress() {
    return this.isInLobby && this.lobby.game.state == 'ACTIVE' && this.lobby.role;
  }

  get game() {
    return this.lobby.game;
  }

  userDocUpdated(userDoc) {
    this._authStateInitialized = true;

    if (!userDoc.exists) {
      console.warn('user doc does not exist');
      return;
    }

    this.user = userDoc.data();

    if (!this.user.lobby && (this.lobby != null)) {
      const oldLobby = this.lobby.name;      
      this.unsubscribeFromLobby();
      this.notifyEvent('DISCONNECTED_FROM_LOBBY', oldLobby);
    }

    if (this.user.lobby && (this.lobby == null)) {
      this.subscribeToLobby(this.user.lobby);
    }
  }

  unsubscribeFromLobby() {
    if (this.lobby != null) {
      this.lobby.stop();
      this.lobby = null;
    }
  }

  subscribeToLobby(lobby) {
    if (this.lobby != null) {
      // want to avoid double-subscriptions (from user doc and create/join func calls)
      return;
    }
    this.lobby = new LobbySubscription(this.user.uid, lobby, this.config,
      function(evt) {
        switch(evt) {
          case 'LOBBY_CONNECTED':
            this.lobbyConnected();
            break;            
          case 'GAME_STARTED':
            this.config.updateRoles(this.lobby.game.roles);
            break;
          case 'PLAYER_LIST_CHANGED':
            this.config.updatePlayerList(this.lobby.users, true);
            break;
          default:
            console.debug('received', evt, 'in avalon game engine');
        }
        this.notifyEvent(evt);
      }.bind(this)
    );
    this.lobby.start();
  }

  lobbyConnected() {
    this.config.updatePlayerList(this.lobby.users, false);
    if (this.lobby.game.roles) {
      this.config.updateRoles(this.lobby.game.roles);
    }
  }

  logout() {
    firebase.auth().signOut();
  }

  async validateEmailAddr(email) {
    // best-effort email address parsing
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Not a valid email address");
    } else {
      const components = email.split('@');
      const domain = components[1];
      // short-circuit common domains
      const WHITELIST = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com'];
      if (WHITELIST.includes(domain)) {
        return true;
      }

      const response = await axios.get('https://api.mailcheck.ai/domain/' + domain);
      if (response.status != 200) {
        throw new Error('Cannot verify email. Try again later');
      }

      return response.data.mx && !response.data.disposable;
    }
  }

  async submitEmailAddr(emailAddr) {
    const isValidAddr = await this.validateEmailAddr(emailAddr);
    if (!isValidAddr) return;
    return firebase.auth().sendSignInLinkToEmail(emailAddr, {
      url: encodeURI(this.hostname + '?confirmEmail=' + emailAddr),
      handleCodeInApp: true
    });
  }

  init() {
    let urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("purchaseSuccess")) {
      alert('Thank you. Your support means a lot.');
    } else if (urlParams.has('purchaseCanceled')) {
      alert('Maybe next time?');
    }

    firebase.auth().onAuthStateChanged(function (userCred) {
      if (userCred == null) {
        // not logged in
        // maybe there's an email link?
        let urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("confirmEmail")) {
          const emailAddr = urlParams.get("confirmEmail");
          return firebase.auth().signInWithEmailLink(emailAddr, window.location.href).then(function() {
            this.confirmingEmailError = null;
          }.bind(this)).catch(function(err) {
            this.confirmingEmailError = err.message;
            this._authStateInitialized = true;
          }.bind(this)).finally(function() {
            // strip params from URL
            window.history.replaceState(null, null, window.location.pathname);
          }.bind(this));
        } else {
          // no email link, so we are not logged in for real
          this._authStateInitialized = true;
        }
    
        if (this.userDocUnsubscribe != null) {
          this.userDocUnsubscribe();
          this.userDocUnsubscribe = null;
        }
        this.user = null;
      } else {
        // we have user credentials
        console.debug('I am', userCred.uid);
        gtag('set', {'user_id': userCred.uid}); // eslint-disable-line
        gtag('event', 'login');     // eslint-disable-line
        this.api.login(userCred.email).then(function() {
          this.userDocUnsubscribe = db.collection('users').doc(userCred.uid).onSnapshot(
            this.userDocUpdated.bind(this),
            onFirebaseError);
          }.bind(this));

          db.collection('stats').doc('global').get().then(doc => {
            this.globalStats = doc.data();
          });

          // strip params from URL (if we followed a confirmEmail link but we're already logged in)
          window.history.replaceState(null, null, window.location.pathname);
        }
    }.bind(this));
  }
}