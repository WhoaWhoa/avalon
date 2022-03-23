import firebase from 'firebase/app'
import 'firebase/auth'

const axios = require('axios');    

export class AvalonApi {
  constructor() {
    axios.defaults.baseURL = "/api";
  }

  post(endPoint, data) {
    return firebase.auth().currentUser.getIdToken(false).then(function(idToken) {
      console.debug("Calling", endPoint, 'with', data);
      return axios.post(endPoint, data, {
        headers: {'X-Avalon-Auth': idToken}
      }).catch(err => {
        if (err.response && err.response.data.message) {
          throw new Error(err.response.data.message);
        } else {
          throw err;
        }
      });
    });
  }

  login(emailAddr) {
    return this.post('login', {email: emailAddr});
  }

  joinLobby(name, lobby) {
    return this.post('joinLobby', { name, lobby});
  }

  createLobby(name) {
    return this.post('createLobby', { name } );
  }

  leaveLobby(lobby) {
    return this.post('leaveLobby', { lobby });
  }

  kickPlayer(lobby, name) {
    return this.post('kickPlayer', { lobby, name });
  }

  cancelGame(lobby, name) {
    return this.post('cancelGame', { lobby, name });
  }

  voteTeam(lobby, name, mission, proposal, vote) {    
    return this.post('voteTeam',
      {
        lobby,
        name,
        mission,
        proposal,
        vote
      });
  }

  startGame(lobby, playerList, roles, options) {
    return this.post('startGame', {lobby, playerList, roles, options });
  }

  proposeTeam(lobby, name, mission, proposal, team) {
    return this.post('proposeTeam', { lobby, name, mission, proposal, team });
  }

  doMission(lobby, name, mission, proposal, vote) {
    return this.post('doMission', { lobby, name, mission, proposal, vote });
  }

  assassinate(lobby, name, target) {
    return this.post('assassinate', { lobby, name, target });
  }
}