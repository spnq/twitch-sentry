const tmi = require('tmi.js')
const config = require('../config')
const channel = config.testChannel;
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const rx = require('rxjs');

const adapter = new FileSync('./db.json');
const db = low(adapter);

let betting = false;
let _pool = [];
const pool$ = new rx.Subject(_pool);

db.defaults({users: []}).write();

let options = {
    options: {
        debug: true
    },
    connection: {
        cluster: "aws",
        reconnect: true
    },
    identity: {
        username: config.botName,
        password: config.auth
    },
    channels: config.channels
};

const client = new tmi.client(options);

client.connect();

client.on('connected', () => client.action(channel, 'Connected'));

client.on("message", (channel, userstate, message, self) => {
    if (self) return;
    
    let username = userstate.username;
    let isAdmin = userstate.badges.broadcaster === '1';
    let currentPoints;

    if (message.startsWith('!bet') && betting) bet(message, username, currentPoints);
    if (message === '!points') points(username, channel);
    if (message.startsWith('!add') && isAdmin) add(message, currentPoints);
    if (message === '!startBet' && isAdmin && !betting) startBet(channel);
    if (message === '!stopBet' && isAdmin && betting) stopBet(channel);
    if (message.startsWith('!result') && isAdmin && !betting) currentPoints = result(message, currentPoints);
});

function result(message, currentPoints) {
    let result = message.split(' ')[1];
    _pool.forEach( rec => {
        currentPoints = db.get('users')
        .find({ username: rec.username })
        .value().points;
        if (rec.guess == result) db.get('users')
                        .find({ username: rec.username })
                        .assign({ points: rec.points + currentPoints })
                        .write();
    })
    return currentPoints;
}

function stopBet(channel) {
    client.action(channel, `Stop`);
    betting = false;
    pool$.complete();
    console.log(_pool);
}

function startBet(channel) {
    client.action(channel, `Start`);
    betting = true;
    pool$.subscribe(next => {
        let targetRecord = _pool.filter(record => record.username === next.username);
        if (targetRecord.length > 0) {
            _pool = _pool.filter(record => record.username !== next.username)
                .concat(targetRecord.map(val => val = {
                    username: next.username,
                    bet: val.bet + next.bet,
                    guess: next.guess
                }));
        }
        else {
            _pool.push(next);
        }
        console.log(_pool);
    });
}

function points(username, channel) {
    db.read();
    if (!isUserInDB(username)) pushNewUser(username);
    client.action(channel, `${username}, ${(db.get('users')
                                              .find({username})
                                              .value().points)}`);
}

function isUserInDB(user) {
    if (db.get('users')
          .find({username: user})
          .value()) return true;
    return false;
}

function pushNewUser(user) {
    db.get('users')
      .push({username: user, points: 100})
      .write();
}

function add(message, currentPoints) {
    if (message.split(' ').length !== 3) return;
    db.read();
    let addToUser = message.split(' ')[1];
    let addAmount = parseInt(message.split(' ')[2]);
    if (isNaN(addAmount) || addAmount < 0) addAmount = 0;
    if (!isUserInDB(addToUser)) pushNewUser(addToUser);

    currentPoints = db.get('users')
                      .find({username: addToUser})
                      .value().points;

    db.get('users')
      .find({username: addToUser})
      .assign({points: currentPoints + addAmount})
      .write();
}

function bet(message, username, currentPoints) {
    if (message.split(' ').length !== 3) return;
    let bettingAmount = parseInt(message.split(' ')[2]);
    let guess = parseInt(message.split(' ')[1]);
    if (bettingAmount < 0 || bettingAmount != message.split(' ')[2]) {
        client.action(channel, `${username} illigal bet value.`);
    }
    if (guess < 0 || guess != message.split(' ')[1]) {
        client.action(channel, `${username} illigal guess value.`);
    }
    db.read();

    if (!isUserInDB(username)) pushNewUser(username);

    currentPoints = db.get('users')
                      .find({username: username})
                      .value().points;

    if (bettingAmount > currentPoints) {
        client.action(channel, `${username} don't have enougth points!`);
    } else {
        db.get('users')
          .find({username: username})
          .assign({points: currentPoints - bettingAmount})
          .write();
        client.action(channel, `${username} you just bet ${bettingAmount}.`);
        pool$.next({
            username: username,
            bet: bettingAmount,
            guess: guess
        });
    }
}