const firebaseAdmin = require('firebase-admin');
const serviceAccount = require("./firebase-key.json");
const _ = require('lodash');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://cloudtest-231519.firebaseio.com"
});

const db = firebaseAdmin.firestore();
const SECRET_STATE_DOC_NAME = 'SECRET_STATE_ARCHIVES__';

const avalon = require('./avalon-server.js');
let lobby = '';
let roles = {};

function randomAction(game) {
  game.currentMissionIdx = game.missions.findIndex(m => m.state == 'PENDING');
  if (game.currentMissionIdx >= 0) {
    game.currentMission = game.missions[game.currentMissionIdx];

    game.currentProposalIdx = game.currentMission.proposals.findIndex(p => p.state == 'APPROVED');
    if (game.currentProposalIdx < 0) {
      game.currentProposalIdx = game.currentMission.proposals.findIndex(p => p.state == 'PENDING');
    }
    game.currentProposal = game.currentMission.proposals[game.currentProposalIdx];
  }

  switch (game.phase) {
    case 'TEAM_PROPOSAL': return proposeTeam(game);
    case 'PROPOSAL_VOTE': return voteProposal(game);
    case 'MISSION_VOTE': return missionVote(game);
    case 'ASSASSINATION': return assassinate(game);
  }
}

function randomActionLoop() {
  return db.collection('lobbies').doc(lobby).get().then(lobbyDoc => {
    const game = lobbyDoc.data().game;

    if (game.state == 'ENDED') {
      return game;
    }

    return randomAction(game).then(
      () => randomActionLoop()
    );
  });
}

function pickPlayersAtRandom(game, n) {
  return _.shuffle(game.players).slice(0, n);
}

function proposeTeam(game) {
  //lobby: string, mission: int, proposal: int, team: [string]
  return avalon.proposeTeam({
    lobby,
    mission: game.currentMissionIdx,
    proposal: game.currentProposalIdx,
    team: pickPlayersAtRandom(game, game.currentMission.teamSize),
  }, game.currentProposal.proposer);
}

function voteProposal(game) {
  return _.reduce(['JIMMY', 'USERONE', 'USERTWO', 'USERTHREE', 'USERFOUR', 'USERFIVE'], (promise, name) =>
    promise.then(() => avalon.voteTeam({
      lobby,
      mission: game.currentMissionIdx,
      proposal: game.currentProposalIdx,
      name,
      vote: (game.currentProposalIdx == 4) || _.random(1) == 1
    }, name)),
    Promise.resolve(true)
  );
}

function missionVote(game) {
  // lobby: string, mission: int, proposal: int, name: string, vote: boolean  
  return Promise.all(game.currentProposal.team.map(name => 
    avalon.doMission({
      lobby,
      mission: game.currentMissionIdx,
      proposal: game.currentProposalIdx,
      name,
      vote: _.random(1) == 1
    }, name)    
  ));
}

function assassinate(game) {
  const target = pickPlayersAtRandom(game, 1)[0];
  const name = Object.values(roles).find(r => r.assassin).name;

  return avalon.assassinate({ lobby, name, target }, name);
}

avalon.createLobby({name: 'JIMMY'}, 'JIMMY').then(r => {
  lobby = r.lobby;

  return Promise.all([
    avalon.joinLobby({ name: 'USERONE', lobby}, 'USERONE'),
    avalon.joinLobby({ name: 'USERTWO', lobby}, 'USERTWO'),
    avalon.joinLobby({ name: 'USERTHREE', lobby}, 'USERTHREE'),
    avalon.joinLobby({ name: 'USERFOUR', lobby}, 'USERFOUR'),
    avalon.joinLobby({ name: 'USERFIVE', lobby}, 'USERFIVE'),
  ]);
}).then(() => {
  return avalon.cancelGame({ lobby, name: 'JIMMY' }, 'JIMMY');
}).catch(err => /* ignore */ false)
.then(() => {
  return avalon.startGame(
    { playerList: ['JIMMY', 'USERONE', 'USERTWO', 'USERTHREE', 'USERFOUR', 'USERFIVE'],
      roles: ['MERLIN', 'MORGANA', 'PERCIVAL'],
      lobby}, 'JIMMY');
  }).then(() => db.collection('lobbies').doc(lobby).collection('roles').doc(SECRET_STATE_DOC_NAME).get())
  .then((roleDoc) => {
    roles = roleDoc.data().roles;
  })
/* }).then(() => {
  return db.collection('lobbies').doc(lobby).collection('roles').doc(SECRET_STATE_DOC_NAME).update('roles', {
    JIMMY: {
      assassin: false,
      role: 'MERLIN',
      name: 'JIMMY',
      sees: [ 'USERTHREE', 'USERTWO' ],
      team: 'good' },
    USERONE: {
      assassin: false,
      role: 'PERCIVAL',
      name: 'USERONE',
      sees: [ 'JIMMY', 'USERTWO' ],
      team: 'good' },
    USERTWO:
      { name: 'USERTWO',
        sees: [ 'USERTHREE' ],
        team: 'evil',
        assassin: false,
        role: 'MORGANA' },  
     USERTHREE:
      { name: 'USERTHREE',
        sees: [ 'USERTWO'],
        team: 'evil',
        assassin: true,
        role: 'EVIL MINION' },
     USERFOUR:
      { assassin: false,
        role: 'LOYAL FOLLOWER',
        name: 'USERFOUR',
        sees: [],
        team: 'good' },
     USERFIVE:
      { assassin: false,
        role: 'LOYAL FOLLOWER',
        name: 'USERFOUR',
        sees: [ ],
        team: 'good' }
    }); */
.then(() => {
  return db.collection('lobbies').doc(lobby).get();
}).then(lobbyDoc => {
  game = lobbyDoc.data().game;
  game.missions[0].proposals[0].proposer = 'JIMMY';
  return db.collection('lobbies').doc(lobby).update('game', game);
}).then(() => randomActionLoop()).then(game => {
  console.log(game.outcome);
});
