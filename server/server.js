const express = require('express');
const firebaseAdmin = require('firebase-admin');
const serviceAccount = require("./firebase-key.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://cloudtest-231519.firebaseio.com"
});

const avalon = require('./avalon-server.js');
const app = express();
app.use(express.json());

const router = require('express-promise-router')();

router.use(function(req, res, next) {
  const idToken = req.get('X-Avalon-Auth');
  if (!idToken) {
    throw new Error(`No auth info in request: ${req.method} ${req.path}`);
  }

  firebaseAdmin.auth().verifyIdToken(idToken).then(function(decodedToken) {
    req.uid = decodedToken.uid;
    console.log('Request', req.method, req.path, req.uid, JSON.stringify(req.body));
    next();
  });
});

router.post('/login', (req, res) => {
  return avalon.loginUser(req.body, req.uid).then(r => res.end());
});

router.post('/createLobby', (req, res) => {
  return avalon.createLobby(req.body, req.uid).then(r => res.json(r));
});

router.post('/joinLobby', (req, res) => {
  return avalon.joinLobby(req.body, req.uid).then(r => res.json(r));
});

router.post('/leaveLobby', (req, res) => {
  return avalon.leaveLobby(req.body, req.uid).then(() => res.end());
});

router.post('/kickPlayer', (req, res) => {
  return avalon.kickPlayer(req.body, req.uid).then(() => res.end());
});

router.post('/startGame', (req, res) => {
  return avalon.startGame(req.body, req.uid).then(() => res.end());
});

router.post('/cancelGame', (req, res) => {
  return avalon.cancelGame(req.body, req.uid).then(() => res.end());
});

router.post('/proposeTeam', (req, res) => {
  return avalon.proposeTeam(req.body, req.uid).then(() => res.end());
});

router.post('/voteTeam', (req, res) => {
  return avalon.voteTeam(req.body, req.uid).then(() => res.end());
});

router.post('/doMission', (req, res) => {
  return avalon.doMission(req.body, req.uid).then(() => res.end());
});

router.post('/assassinate', (req, res) => {
  return avalon.assassinate(req.body, req.uid).then(() => res.end());
});

router.use((err, req, res, next) => {
  res.status(err.statusCode ? err.statusCode : 500);
  res.json({ message: err.message });
});

app.use('/api', router);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

