const firebaseAdmin = require('firebase-admin');
const serviceAccount = require("./firebase-key.json");
const fs = require('fs');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://cloudtest-231519.firebaseio.com"
});

const db = firebaseAdmin.firestore();

const statsLib = require('../firebase/functions/common/stats');

function recursDeleteUsers(users) {
  console.log('Remaining', users.length);
  if (users.length == 0) return;
  let user = users.pop();
  if (!user.email) {
    return firebaseAdmin.auth().deleteUser(user.uid).then(function() {
      console.log("Deleted user", user.uid);
      return recursDeleteUsers(users);
    });
  } else {
    return recursDeleteUsers(users);
  }
}

function recursLookupUsers(users) {
  if (users.length == 0) return;
  const user = users.pop();
  const domain = user.email.split('@')[1];
  const WHITELIST = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  if (WHITELIST.includes(domain)) {
    return recursLookupUsers(users);
  }

  return new ValidatorPizzaClient().validate("domain", domain).then(response => {
    if (!response.valid()) {
      console.log(user.email, user.uid, domain);
    }
    return recursLookupUsers(users);
  });
}

function exportLogSnapshot(logSnapshot) {
    const data = logSnapshot.data();
    fs.writeFileSync(logSnapshot.id, JSON.stringify(data, null, ' '));
}

function exportLogs() {
  return db.collection('logs').get().then(snapshot => Promise.all(snapshot.docs.map(exportLogSnapshot)));
}

function exportLog(logId) {
  return db.collection('logs').doc(logId).get().then(exportLogSnapshot);
}

//exportLogs().then(() => 0);

function lookupUsers() {
 return firebaseAdmin.auth().listUsers(1000).then(function(users) {
    return recursLookupUsers(users.users);
  });
}

//lookupUsers().then(() => 0);

//db.collection('logs').doc('2020-04-08T16:26:17.145Z_HLW').get().then(doc => exports.computeStats(doc.data())).then(stats => exports.combineStats(stats, true));

//statsLib.recomputeAllStats(db);

function cleanupLobbies() {
  const batch = db.batch();
  const MAX_BATCH_SIZE = 300;
  let counter = 0;

  return db.collection('lobbies').get().then(
    function(querySnapshot) {
      querySnapshot.forEach(function(queryDocumentSnapshot) {
        if (counter >= MAX_BATCH_SIZE) return;

        const lobbyCreatedTimestamp = queryDocumentSnapshot.get("timeCreated").toMillis();
        const ageInDays = (Date.now() - lobbyCreatedTimestamp) / (1000 * 60 * 60 * 24);
        console.log(queryDocumentSnapshot.id, "is", ageInDays, "days old");
        if (((ageInDays > 2) && (queryDocumentSnapshot.get("game").state == 'INIT')) || (ageInDays > 7)) {
          counter++;
          console.log("Deleting lobby " + queryDocumentSnapshot.id);
          batch.delete(queryDocumentSnapshot.ref);
          // XXX this is bad since the user record will still point here
        }
      });
    }).then(function() {
      if (counter == 0) {
        console.log('Nothing to be done');
      } else {
        console.log("committing batch...");
        return batch.commit();
      }
    });
}

// XXX welp, this is an exact copy of the function above. Should probably extract it?
function cleanupLogs() {
  const batch = db.batch();
  const MAX_BATCH_SIZE = 300;
  let counter = 0;

  return db.collection('logs').get().then(
    function(querySnapshot) {
      querySnapshot.forEach(function(queryDocumentSnapshot) {
        if (counter >= MAX_BATCH_SIZE) return;

        const lobbyCreatedTimestamp = queryDocumentSnapshot.get("timeCreated").toMillis();
        const ageInDays = (Date.now() - lobbyCreatedTimestamp) / (1000 * 60 * 60 * 24);
        console.log(queryDocumentSnapshot.id, "is", ageInDays, "days old");
        if (ageInDays > 60) {
          counter++;
          console.log("Deleting log " + queryDocumentSnapshot.id);
          batch.delete(queryDocumentSnapshot.ref);
        }
      });
    }).then(function() {
      if (counter == 0) {
        console.log('Nothing to be done');
      } else {
        console.log("committing batch...");
        return batch.commit();
      }
    });
}

//cleanupLogs().then(() => 0);
//cleanupLobbies().then(() => 0);