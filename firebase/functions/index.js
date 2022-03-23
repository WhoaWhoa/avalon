const functions = require('firebase-functions');
const firebaseAdmin = require('firebase-admin');
const statsLib = require('./common/stats')

firebaseAdmin.initializeApp();

const db = firebaseAdmin.firestore();

exports.onLogCreate = functions.firestore.document('/logs/{logId}').onCreate(async (snapshot, context) => {
    console.log("New game", context.params.logId);

    const docSnapshot = await db.collection('logs').doc(context.params.logId).get();
    const data = docSnapshot.data();

    console.log(data);

    const stats = statsLib.computeStats(data);

    return statsLib.combineStats(db, stats, false);
});
