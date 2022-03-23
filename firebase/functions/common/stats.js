const avalonLib = require('./avalonlib');

exports.computeStats = function(game) {
    const stats =  {
        users: { },
        global: { }
     };

     stats.global.games = 1;
     stats.global.good_wins = game.outcome.state === 'GOOD_WIN' ? 1 : 0;
     stats.global.playtimeSeconds = (game.timeFinished.toMillis() - game.timeCreated.toMillis()) / 1000;

     for(player of game.players) {
         const userStats = {
             games: 1,
             good: 0,
             evil: 0,
             wins: 0,
             good_wins: 0,
             evil_wins: 0,
             playtimeSeconds: 0
         };

         const role = game.outcome.roles.find(r => r.name === player.name).role;
         const team = avalonLib.ROLES.find(r => role === r.name).team;

         if (team === 'good') {
            userStats.good = 1;
            userStats.wins = (game.outcome.state === 'GOOD_WIN') ? 1 : 0;
            userStats.good_wins = (game.outcome.state === 'GOOD_WIN') ? 1 : 0;
         } else {
            userStats.evil = 1;
            userStats.wins = (game.outcome.state === 'GOOD_WIN') ? 0 : 1;
            userStats.evil_wins = (game.outcome.state === 'GOOD_WIN') ? 0 : 1;
         }

         userStats.playtimeSeconds = stats.global.playtimeSeconds;

         stats.users[player.uid] = userStats;
     }
    return stats;
}


async function resetStatsBatch(db, startAfter) {
    const batch = db.batch();
    let query = db.collection('users').limit(300);
    if (startAfter) {
        query = query.startAfter(startAfter);
    }
    const userSnapshots = await query.get();
    userSnapshots.forEach(async userSnapshot => {
        batch.update(userSnapshot.ref, "stats", {});
    });
    return batch.commit().then(() => console.log("Batch done")).then(() => userSnapshots.size > 0 ? userSnapshots.docs[userSnapshots.size - 1] : null);
}

exports.resetStats = async function(db) {
    console.log("Resetting all stats");
    await db.collection('stats').doc('global').delete();

    let startAfter = null;
    do {
        startAfter = await resetStatsBatch(db, startAfter); // eslint-disable-line no-await-in-loop
    } while(startAfter !== null);

    console.log("All stats reset");
}

async function combineGlobalStats(db, stats, overwrite) {
    return db.runTransaction(txn => txn.get(db.collection('stats').doc('global')).then(doc => {
        let globalData = { };
        if (!overwrite && doc.exists) {
            globalData = doc.data();
        }
        globalData = combineStatEntries(globalData, stats);
        txn.set(doc.ref, globalData);
        return true;
    }));
}

async function combineUserStats(db, stats, overwrite) {
    return db.runTransaction(txn => txn.getAll(...Object.keys(stats).map(user => db.collection('users').doc(user))).then(arr => {
                for(doc of arr) {
                    if (!doc.exists) {
                        console.log("Skipping non-existent user", doc.id);
                        continue;
                    }
                    let userStatRecord = doc.get('stats');
                    if (!userStatRecord || overwrite) {
                        userStatRecord = { };
                    }
                    userStatRecord = combineStatEntries(userStatRecord, stats[doc.id]);
                    txn.update(doc.ref, "stats", userStatRecord);
                }
                return Promise.resolve(true);
            }));
}

exports.combineStats = async function(db, stats, overwrite) {
    await combineGlobalStats(db, stats.global, overwrite);

    // slice into chunks to stay within transaction limits
    const SLICE_SIZE = 300;
    for(let sliceBegin = 0; sliceBegin < Object.keys(stats.users).length; sliceBegin += SLICE_SIZE) {
        const userStatSlice = Object.keys(stats.users).slice(sliceBegin, sliceBegin + SLICE_SIZE);
        // Object.fromEntries only in node >=12
        const userStats = userStatSlice.reduce((obj, user) => { obj[user] = stats.users[user]; return obj; }, new Object() );
        await combineUserStats(db, userStats, overwrite); // eslint-disable-line no-await-in-loop
    }
}

exports.recomputeAllStats = async function(db) {
    await exports.resetStats(db);

    const logSnapshots = await db.collection('logs').get();

    let stats = [];

    logSnapshots.forEach(async logSnapshot => {
        stats.push(exports.computeStats(logSnapshot.data()));
    });

    console.log('Computed', stats.length, 'stats objects');

    stats = stats.reduce((accum, curStats) => {
        accum.global = combineStatEntries(accum.global, curStats.global);

        for (const user of Object.keys(curStats.users)) {
            accum.users[user] = combineStatEntries(accum.users[user], curStats.users[user]);
        }
        return accum;
    });

    console.log('Recombining...');
    await exports.combineStats(db, stats, true);
    console.log('Done');
}

function combineStatEntries(oldValue, deltas) {
    if (!oldValue) {
        return deltas;
    }
    for (const [statName, statDelta] of Object.entries(deltas)) {
        oldValue[statName] = statDelta + (oldValue[statName] ? oldValue[statName] : 0);
    }
    return oldValue;
}
