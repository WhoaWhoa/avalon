const firebaseAdmin = require('firebase-admin');
const _ = require('lodash');
const avalonLib = require('./common/avalonlib');

const db = firebaseAdmin.firestore();
const FieldValue = firebaseAdmin.firestore.FieldValue;

const SECRET_STATE_DOC_NAME = 'SECRET_STATE_ARCHIVES__';

function proposalTemplate(currentProposer, playerList) {
  const currentProposerIdx = playerList.indexOf(currentProposer);

  return {
    proposer: playerList[(currentProposerIdx + 1) % playerList.length],
    state: 'PENDING',
    team: [],
    votes: []
  };
}

class AvalonError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
};

function validateName(userName) {
  if ((typeof userName != 'string') ||
      (!userName.match(/^[A-Z]+$/)) ||
      (userName.trim() != userName) ||
      (userName.length == 0) ||
      (avalonLib.ROLES.map(r => r.name).includes(userName))) {
    throw new AvalonError(400, 'Invalid username "' + userName + '"');
  }
}

function validateValue(value, desired, errMsg) {
  if (desired != value) {
    throw new AvalonError(400, `${errMsg} should be ${desired} but was ${value}`);
  }
}

function validateField(doc, field, value) {
  validateValue(doc.get(field), value, field);
}

exports.loginUser = function(data, uid) {
  const userDocRef = db.collection('users').doc(uid);
  const emailAddr = data.email;

  return db.runTransaction(function(txn) {
    return txn.get(userDocRef).then(function(userDoc) {
      if (userDoc.exists) {
        if (userDoc.get('email') != emailAddr) {
          throw new AvalonError(429, 'Mismatched emails: ' + userDoc.get('emails') + ' and ' + emailAddr);
        }
        const lobbyName = userDoc.get('lobby');
        if (lobbyName) {
          const lobbyDocRef = db.collection('lobbies').doc(lobbyName);
          return txn.get(lobbyDocRef).then(function (lobbyDoc) {
            if (!lobbyDoc.exists) {
              txn.update(userDocRef, {
                lobby: FieldValue.delete()
              });
            }
            txn.update(userDocRef, { 
                lastActive: FieldValue.serverTimestamp()
            });
          });
        }
      } else {
        console.log("Creating record for user", uid, 'with email', emailAddr);
        txn.set(db.collection('users').doc(uid), {
          uid,
          email: emailAddr,
          created: FieldValue.serverTimestamp(),
          lastActive: FieldValue.serverTimestamp()
        });
      }
   });
  });
}

// name, lobby
exports.joinLobby = function(data, uid) {
  validateName(data.name);

  const userDocRef = db.collection('users').doc(uid);
  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);

  return db.runTransaction(function(transaction) {
    return Promise.all([
      transaction.get(userDocRef),
      transaction.get(lobbyDocRef),
    ]).then(function([userDoc, lobbyDoc]) {
      if (!userDoc.exists) {
        throw new AvalonError(404, 'User ' + uid + ' does not exist');
      }

      const currentLobby = userDoc.get('lobby');
      if (currentLobby != null) {
        if (currentLobby != data.lobby) {
          console.log(uid, 'currently in', userDoc.get('lobby'), 'tried to join', data.lobby);
        }
        return {
          lobby: userDoc.get('lobby'),
          name: userDoc.get('name'),
        }
      }

      if (!lobbyDoc.exists) {
        throw new AvalonError(404, 'Lobby ' + data.lobby + ' does not exist');
      }

      if (lobbyDoc.get('users')[data.name]) {
        throw new AvalonError(429, 'Name taken');
      }

      if (lobbyDoc.get('game.state') == 'ACTIVE') {
        throw new AvalonError(429, "Cannot join while game is in progress");
      }

      transaction.update(lobbyDocRef, {
        ["users." + data.name]: {
          name: data.name,
          uid
        }
      }).update(userDocRef, {
        name: data.name,
        lobby: data.lobby,
        lastActive: FieldValue.serverTimestamp()
      });

      return {
        lobby: data.lobby,
        name: data.name
      };
    });
  });
}

// name
exports.leaveLobby = function(data, uid) {
  const userDocRef = db.collection('users').doc(uid);
  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);
  const secretDocRef = lobbyDocRef.collection('roles').doc(SECRET_STATE_DOC_NAME);
  
  return db.runTransaction(function(txn) {
    return Promise.all([
      txn.get(userDocRef),
      txn.get(lobbyDocRef),
      txn.get(secretDocRef),
    ]).then(function([userDoc, lobbyDoc, secretDoc]) {
      if (!userDoc.exists || !lobbyDoc.exists) {
        throw new AvalonError(404, 'You are not in that lobby');
      }

      const myName = userDoc.get('name');

      if (lobbyDoc.get('game.state') == 'ACTIVE') {
        endGameTxn(txn, lobbyDoc, secretDoc, 'CANCELED', myName + ' left the game');
      }

      txn.update(lobbyDocRef, 'users.' + myName, FieldValue.delete());
      txn.update(userDocRef, {
        lobby: FieldValue.delete(),
        lastActive: FieldValue.serverTimestamp()
      });

      if (lobbyDoc.get('admin.uid') == uid) {
        console.log("Need to swap admin");

        const eligibleUsers = Object.keys(lobbyDoc.get('users')).filter(u => u != myName);

        if (eligibleUsers.length == 0) {
          console.log('No more users, will delete lobby', data.lobby);
          txn.delete(lobbyDocRef);
        } else {
          console.log('Making new admin', data.lobby, lobbyDoc.get('users')[eligibleUsers[0]]);
          txn.update(lobbyDocRef, {
            admin: {
              uid: lobbyDoc.get('users')[eligibleUsers[0]].uid,
              name: lobbyDoc.get('users')[eligibleUsers[0]].name
            }
          });
        }
      }      
      return true;
    });
  });
}

exports.kickPlayer = function(data, uid) {
  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);

  return db.runTransaction(function(txn) {
    return lobbyDocRef.get().then(function(lobbyDoc) {

      if (lobbyDoc.get('admin.uid') != uid) {
        throw new AvalonError(403, 'Not lobby admin');
      }

      if (lobbyDoc.get('game.state') == 'ACTIVE') {
        throw new AvalonError(429, "Cancel game first");
      }

      const user = lobbyDoc.get('users')[data.name];
      if (!user) {
        throw new AvalonError(404, 'No such user');
      }

      if (user.uid == uid) {
        throw new AvalonError(400, "Can't kick yourself");
      }

      txn.update(db.collection('users').doc(user.uid), {
        lobby: FieldValue.delete()
      });
      txn.update(lobbyDocRef, { ['users.' + user.name] : FieldValue.delete() } );

      return true;
    });
  }); // txn
}

exports.createLobby = function(data, uid) {
  validateName(data.name);

  const encodingString = "ABCDEFGHJKLMNPQRSTVWXYZ";
  const lobbyStrLength = 3;
  const maxId = Math.pow(encodingString.length, lobbyStrLength);

  function encodeId(id) {
    let encoding = '';
    id = Math.floor(id);

    while(encoding.length < lobbyStrLength) {
      let remainder = id % encodingString.length;
      id = Math.floor(id / encodingString.length);
      encoding += encodingString[remainder];
    }

    return encoding;
  }

  function runCreateLobbyTransaction(userName, userUid) {
    console.log("Creating lobby for " + userUid);

    class LobbyAlreadyExists extends Error {
      constructor(lobbyName) {
        super("Lobby " + lobbyName + " already exists");
        this.name = "LobbyAlreadyExists";
      }
    }

    const userDocRef = db.collection('users').doc(userUid);

    return db.runTransaction(function(transaction) {
      const lobbyName = encodeId(Math.floor(Math.random() * maxId));
      const lobbyDocRef = db.collection('lobbies').doc(lobbyName);

      return Promise.all([
        transaction.get(lobbyDocRef),
        transaction.get(userDocRef)
      ]).then(function([lobbyDoc, userDoc]) {
        if (!userDoc.exists) {
          throw new AvalonError(404, 'No such user');          
        }

        if (userDoc.get('lobby')) {
          transaction.update(userDocRef, { lastActive: FieldValue.serverTimestamp()});
          return {
            lobby: userDoc.get('lobby'),
            name: userDoc.get('name'),
          };
        }

        if (lobbyDoc.exists) {
          throw new LobbyAlreadyExists(lobbyName);
        }

        transaction.update(userDocRef, {
          lobby: lobbyName,
          name: userName
        }).set(lobbyDocRef, {
          admin: {
            uid: userUid,
            name: userName
          },
          timeCreated: FieldValue.serverTimestamp(),
          users: {
            [userName]: {
              name: userName,
              uid: userUid
            }
          },
          game: { state: 'INIT' }
        });

        return {
          lobby: lobbyName,
          name: userName,
        };
      });
    }).catch(function(err) {
      if (err instanceof LobbyAlreadyExists) {
        return runCreateLobbyTransaction(userName, userUid);
      } else {
        throw err;
      }
    });
  }

  return runCreateLobbyTransaction(data.name, uid);
}

/* { lobby, name } */
exports.cancelGame = function(data, uid) {
  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);
  const secretDocRef = lobbyDocRef.collection('roles').doc(SECRET_STATE_DOC_NAME)

  return db.runTransaction(function(txn) {
    return Promise.all([
      txn.get(lobbyDocRef),
      txn.get(secretDocRef),
    ]).then(function([lobbyDoc, secretDoc]) {
      validateField(lobbyDoc, 'game.state', 'ACTIVE');
      if (lobbyDoc.get('users')[data.name].uid != uid) {
        throw new AvalonError(404, 'You are not who you say you are');
      }
      endGameTxn(txn, lobbyDoc, secretDoc, 'CANCELED', 'Canceled by ' + data.name);
    })
  });
}

function makeMissions(playerList) {
  const missionSizes = new Map()
    .set(5,  [2, 3, 2, 3, 3])
    .set(6,  [2, 3, 4, 3, 4])
    .set(7,  [2, 3, 3, 4, 4])
    .set(8,  [3, 4, 4, 5, 5])
    .set(9,  [3, 4, 4, 5, 5])
    .set(10, [3, 4, 4, 5, 5])
    .get(playerList.length);

  const missionConfig = missionSizes.map(teamSize => {
    return { state: 'PENDING',
             teamSize,
             failsRequired: 1,
             team: [],
             proposals: []
            };
           });

  if (playerList.length >= 7) {
    missionConfig[3].failsRequired = 2;
  }

  missionConfig[0].proposals[0] = proposalTemplate(
      playerList[Math.floor(Math.random() * playerList.length)],
      playerList);

  return missionConfig;
}

function assignRoles(playerList, roles = [], oldRoles) {

  const makeTeam = function(teamList, team) {
    const teamRoles = avalonLib.ROLES.filter(r => r.team == team);
    const specialRoles = teamRoles.filter(r => roles.includes(r.name)).slice(0, teamList.length);
    const fillerRole = teamRoles.find(r => r.filler);
    return _.zip(teamList, specialRoles).map(
      ([name, role = fillerRole]) => {
        return { name, role: Object.assign({}, role) };
    });
  };

  const assignRolesImpl = function(playerList, roles) {
    playerList = _.shuffle(playerList);

    const numEvil = avalonLib.getNumEvilForGameSize(playerList.length);
    const evilPlayers = playerList.slice(0, numEvil);
    const goodPlayers = playerList.slice(numEvil);

    const evilAssignments = makeTeam(evilPlayers, 'evil');
    if (roles.includes('MERLIN')) {
      _.maxBy(evilAssignments, p => p.role.assassinationPriority).role.assassin = true;
    }
  
    const assignments = evilAssignments.concat(makeTeam(goodPlayers, 'good'));
  
    assignments.forEach(r => {
      r.sees =
          _.shuffle(
            _.flatten(
              r.role.sees.map(
                seenRole => assignments.filter(
                  r2 => r2.role.name == seenRole &&
                  r2.name != r.name).map(r2 => r2.name))));
    });
    return _.keyBy(assignments.map(player => {
      return { name : player.name,
               role: player.role.name,
               assassin: player.role.assassin ? player.role.assassin : false,
               team: player.role.team,
               sees: player.sees };
      }), (p) => p.name);
  };

  // how many special roles are assigned to the same people as last time?
  const measureSameness = function(newRoles, oldRoles) {
    if (!oldRoles) return 0;

    let sameness = 0;
    
    for (const player in newRoles) {
      const newRole = newRoles[player];
      const oldRole = oldRoles.find(r => r.name == player);
      if (!oldRole) continue;

      if ((newRole.role == oldRole.role) && !avalonLib.ROLES.find(r => r.name == newRole.role).filler) {
        sameness++;
      }
    }
    return sameness;
  };

  const weightedRandom = function(weights) {
    const totalWeight = weights.reduce((a,b) => a + b);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return i;
      }
    }
    return weights.length - 1;
  }

  const candidateAssignments = [];
  const sameness = [];
  do {
    const rolesAssignment = assignRolesImpl(playerList, roles);
    candidateAssignments.push(rolesAssignment);
    sameness.push(measureSameness(rolesAssignment, oldRoles));
    // keep generating candidates until we either have 5 or we generated one with no overlap to previous assignment
  } while ((sameness.length < 5) && (sameness[sameness.length - 1] > 0));

  const weights = sameness.map(s => 1 / (1 + s));
  return candidateAssignments[weightedRandom(weights)];
}

function endGameTxn(txn, lobbyDoc, secretDoc, state, message,
  { assassinated = null,
    game = lobbyDoc.get('game'),
    votes = secretDoc.get('votes.mission')
  } = {}) {

  validateValue(game.state, 'ACTIVE', 'Game state not active');
  game.state = 'ENDED';
  game.outcome = {
    state,
    message,
    assassinated,
    roles: Object.values(secretDoc.get('roles')).map(
      r => _.pick(r, ['name', 'role', 'assassin'])),
    votes,
  };

  const uids = game.players.map(name => lobbyDoc.get("users")[name].uid);

  uids.forEach(uid => txn.delete(lobbyDoc.ref.collection('roles').doc(uid)));
  txn.delete(lobbyDoc.ref.collection('roles').doc(SECRET_STATE_DOC_NAME));

  if (state != 'CANCELED') {
    // record for posterity  
    const logName = game.timeCreated.toDate().toISOString() + '_' + lobbyDoc.id;
    const gameObj = {
      missions: game.missions,
      outcome: game.outcome,
      players: game.players.map(name => {
        return {
          name,
          uid: lobbyDoc.get('users')[name].uid
        };
      }),
      options: game.options,
      timeCreated: lobbyDoc.get('game.timeCreated'),
      timeFinished: FieldValue.serverTimestamp()
    };
    txn.set(db.collection('logs').doc(logName), gameObj);
    uids.forEach(uid => txn.update(db.collection('users').doc(uid), "logs", FieldValue.arrayUnion(logName)));
  }
  txn.update(lobbyDoc.ref, "game", game);
}

/*
   data.lobby
   data.playerList
   data.roles
   data.options
*/
exports.startGame = function(data, uid) {

  if (!data.playerList || 
    data.playerList.length < 5  ||
    data.playerList.length > 10) {
    throw new AvalonError(400, 'Bad player list length' + playerList);
  }

  if (!data.roles || !data.roles.every(role => avalonLib.ROLES.find(r => r.name == role))) {
    throw new AvalonError(400, 'Bad roles ' + roles);
  }

  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);

  return db.runTransaction(function(txn) {
    return lobbyDocRef.get().then(function(lobbyDoc) {

      if (!lobbyDoc.exists) {
        throw new AvalonError(404, 'No such lobby: ' + data.lobby);
      }

      if (lobbyDoc.get('admin.uid') != uid) {
        throw new AvalonError(403, 'Not lobby admin');
      }

      const curGameState = lobbyDoc.get('game.state');

      if (curGameState == 'ACTIVE') {
        throw new AvalonError(429, 'Game already in progress');
      }

      /* check that all players in playerList exist */
      const lobbyUsers = lobbyDoc.get('users');      

      if ((data.playerList.length != Object.keys(lobbyUsers).length) ||
          !data.playerList.every(name => lobbyUsers[name])) {
        throw new AvalonError(400, 'Bad player list: ' + data.playerList.sort() +
          '. In lobby: ' + Object.keys(lobbyUsers).sort());
      }
      
      const roles = assignRoles(data.playerList, data.roles, lobbyDoc.get('game.outcome.roles'));

      txn.update(lobbyDocRef, {
        game : {
          state: 'ACTIVE',
          phase: 'TEAM_PROPOSAL',
          timeCreated: FieldValue.serverTimestamp(),
          missions: makeMissions(data.playerList),
          players: data.playerList,
          roles: Object.values(roles).map(r => r.role),
          options: data.options
        }});
      txn.set(lobbyDocRef.collection('roles').doc(SECRET_STATE_DOC_NAME), {
        roles,
        votes: { mission: [], proposal: {} }
      });

      // could add timestamp to make sure roles belong to same game, but meh
      Object.values(roles).forEach(role => {
        const player = lobbyUsers[role.name];
        txn.set(lobbyDocRef.collection('roles').doc(player.uid), {
          uid: player.uid,
          name: player.name,
          assassin: role.assassin,
          role: role.role,
          sees: role.sees,
        });
      });
      console.log('started game', data.lobby);
      return true;
    });
  });
}

// lobby: string, mission: int, proposal: int, team: [string]
exports.proposeTeam = function(data, uid) {
  data.team = _.uniq(data.team);

  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);

  return db.runTransaction(function(txn) {
    return lobbyDocRef.get().then(function(lobbyDoc) {
      validateField(lobbyDoc, 'game.state', 'ACTIVE');
      validateField(lobbyDoc, 'game.phase', 'TEAM_PROPOSAL');

      const game = lobbyDoc.get('game');
      const mission = game.missions[data.mission];
      const proposal = mission.proposals[data.proposal];

      validateValue(mission.state, 'PENDING', "Mission state");
      validateValue(proposal.state, 'PENDING', 'Proposal state');

      const proposerUid = lobbyDoc.get('users')[proposal.proposer].uid;

      if (uid != proposerUid) {
        throw new AvalonError(404, 'You are not the proposer');
      }

      if (data.team.length != mission.teamSize) {
        throw new AvalonError(400, 'Bad team size. Need ' + mission.teamSize);
      }

      if (!data.team.every(p => lobbyDoc.get('game.players').includes(p))) {
        throw new AvalonError(400, 'Bad team: ' + data.team);
      }

      proposal.team = data.team;
      game.phase = 'PROPOSAL_VOTE';
      
      txn.update(lobbyDocRef, 'game', game);
    });
  });
}

function recordVote(name, requestUid, lobby, missionIdx, proposalIdx, vote,
                    gamePhase, proposalState,
                    publicVotesListGetter,
                    secretVotesListGetter,
                    voteValidator) {

  const lobbyDocRef = db.collection('lobbies').doc(lobby);
  const secretDocRef = lobbyDocRef.collection('roles').doc(SECRET_STATE_DOC_NAME);

  return db.runTransaction(function(txn) {
    return Promise.all([
      txn.get(lobbyDocRef),
      txn.get(secretDocRef)]).then(function([lobbyDoc, secretDoc]) {
      validateField(lobbyDoc, 'game.state', 'ACTIVE');
      validateField(lobbyDoc, 'game.phase', gamePhase);

      const game = lobbyDoc.get('game');
      const mission = game.missions[missionIdx];
      const proposal = mission.proposals[proposalIdx];

      validateValue(mission.state, 'PENDING', "Mission state");
      validateValue(proposal.state, proposalState, 'Proposal state');

      const uid = lobbyDoc.get('users')[name].uid;

      if (requestUid != uid) {
        console.log(name, 'is', uid, 'but request came from', requestUid);
        throw new AvalonError(403, 'You are not who you say you are');
      }

      const publicVotes = publicVotesListGetter(game, mission, proposal);

      if (!publicVotes.includes(name)) {
        publicVotes.push(name);
      }

      if (voteValidator && !voteValidator(name, vote, secretDoc)) {
        console.log(name, 'is not allowed to vote', vote, ', switching to ', !vote);
        vote = !vote;
      }

      const votes = secretDoc.get('votes');
      secretVotesListGetter(votes)[name] = vote;

      txn.update(lobbyDocRef, "game", game);
      txn.update(secretDocRef, "votes", votes);
    });
  });
}

// lobby: string, mission: int, proposal: int, name: string, vote: boolean
exports.voteTeam = function(data, uid) {
  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);
  const secretDocRef = lobbyDocRef.collection('roles').doc(SECRET_STATE_DOC_NAME);

  return recordVote(data.name, uid, data.lobby, data.mission,
    data.proposal, data.vote, 'PROPOSAL_VOTE', 'PENDING',
    (game, mission, proposal) => proposal.votes,
    (secretVotes) => secretVotes.proposal).then(function() {
    // check all votes (note that another instance might've checked it already!)
    return db.runTransaction(function(txn) {
      return Promise.all([
        txn.get(lobbyDocRef),
        txn.get(secretDocRef)]).then(function([lobbyDoc, secretDoc]) {
        const game = lobbyDoc.get('game');
        const mission = game.missions[data.mission];
        const proposal = mission.proposals[data.proposal];  
        const votes = secretDoc.get('votes');

        if (proposal.state != 'PENDING') {
          // someone else already counted this
          return;
        }

        if (Object.keys(votes.proposal).length != game.players.length) {
          return; // wait
        }

        // all votes are in
        proposal.votes = Object.entries(votes.proposal).filter(([n, vote]) => vote).map(([name, v]) => name);
        console.log('approvers are', proposal.votes);

        if (proposal.votes.length < Math.floor(game.players.length / 2) + 1) {
          proposal.state = 'REJECTED';

          if (data.proposal == 4) {
            return endGameTxn(txn, lobbyDoc, secretDoc, 'EVIL_WIN', "Five team proposals in a row rejected", { game });
          } else {
            game.phase = 'TEAM_PROPOSAL';
            mission.proposals.push(proposalTemplate(proposal.proposer, game.players));
          }
        } else {
          proposal.state = 'APPROVED';
          game.phase = 'MISSION_VOTE';
          votes.mission.push({});
        }

        votes.proposal = {};
        txn.update(lobbyDocRef, "game", game);
        txn.update(secretDocRef, "votes", votes);
      });
    });
  });
}

// lobby: string, mission: int, proposal: int, name: string, vote: boolean
exports.doMission = function(data, uid) {
  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);
  const secretDocRef = lobbyDocRef.collection('roles').doc(SECRET_STATE_DOC_NAME);

  return recordVote(data.name, uid, data.lobby, data.mission,
    data.proposal, data.vote, 'MISSION_VOTE', 'APPROVED',
    (game, mission, proposal) => mission.team,
    (secretVotes) => secretVotes.mission[data.mission],
    // only evil people are allowed to vote evil
    ((name, vote, secretDoc) => vote || secretDoc.get('roles')[name].team == 'evil')
    ).then(function() {
    // check all votes
    return db.runTransaction(function(txn) {
      return Promise.all([
        txn.get(lobbyDocRef),
        txn.get(secretDocRef)]).then(
          function([lobbyDoc, secretDoc]) {
      const game = lobbyDoc.get('game');
      const mission = game.missions[data.mission];
      const proposal = mission.proposals[data.proposal];
      const votes = secretDoc.get('votes');

      if (mission.state != 'PENDING') {
        // someone else already counted this
        return;
      }

      if (Object.keys(votes.mission[data.mission]).length != mission.teamSize) {
        return; // wait
      }
      // all votes are in!

      mission.team = proposal.team;

      mission.numFails = Object.values(votes.mission[data.mission]).filter(v => !v).length;

      if (mission.numFails < mission.failsRequired) {
        mission.state = 'SUCCESS';
      } else {
        mission.state = 'FAIL';
      }

      const failedMissions = game.missions.filter(m => m.state == 'FAIL').length;
      const succeededMissions = game.missions.filter(m => m.state == 'SUCCESS').length;

      if (failedMissions == 3) {
        endGameTxn(txn, lobbyDoc, secretDoc, 'EVIL_WIN', 'Three failed missions', { game });
      } else if (succeededMissions == 3) {
        if (game.roles.includes('MERLIN')) {
          game.phase = 'ASSASSINATION';
        } else {
          endGameTxn(txn, lobbyDoc, secretDoc, 'GOOD_WIN', 'Three missions succeeded', { game });
        }
      } else {
        game.phase = 'TEAM_PROPOSAL';
        game.missions[data.mission + 1].proposals.push(proposalTemplate(proposal.proposer, game.players));        
      }
      txn.update(lobbyDocRef, 'game', game);
    });
  });
});
}

// lobby: string, name: string, target: string
exports.assassinate = function(data, uid) {
  const lobbyDocRef = db.collection('lobbies').doc(data.lobby);
  const secretDocRef = lobbyDocRef.collection('roles').doc(SECRET_STATE_DOC_NAME);

  return db.runTransaction(function(txn) {
    return Promise.all([
      txn.get(lobbyDocRef),
      txn.get(secretDocRef)]).then(function([lobbyDoc, secretDoc]) {

      validateField(lobbyDoc, 'game.state', 'ACTIVE');
      validateField(lobbyDoc, 'game.phase', 'ASSASSINATION');

      if (uid != lobbyDoc.get('users')[data.name].uid) {
        console.warn(data.name, 'is', lobbyDoc.get('users')[data.name].uid, 'but request came from', uid);
        throw new AvalonError(403, 'You are not who you say you are');
      }

      const roles = secretDoc.get('roles');
      if (!roles[data.name].assassin) {
        console.warn(data.name, 'is', secretDoc.get('roles')[data.name]);
        throw new AvalonError(403, 'You are not the assassin');
      }

      if (roles[data.target].role == 'MERLIN') {
        endGameTxn(txn, lobbyDoc, secretDoc, 'EVIL_WIN', 'Merlin assassinated', { assassinated: data.target });
      } else {
        endGameTxn(txn, lobbyDoc, secretDoc, 'GOOD_WIN', 'Three successful missions', { assassinated: data.target });
      }      
      return true;
    });
  });
}
