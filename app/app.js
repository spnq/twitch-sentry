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

pool$.subscribe(next => {
    let targetRecord = _pool.filter(record => record.username === next.username);
    if (targetRecord.length > 0) {
        _pool = _pool.filter(record => record.username !== next.username)
                     .concat(targetRecord.map(val => val = {
                        username: next.username,
                        bet: val.bet + next.bet,
                        guess: next.guess
                     }));
    } else {
        _pool.push(next);
    }
    console.log(_pool);
});

db.defaults({users: []}).write();

let options = {
    options: {
        debug: true
    },
    connection: {
        cluster: 'aws',
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

client.on('message', (channel, userstate, message, self) => {
    if (self || !message.startsWith('!')) return;

    let username = userstate.username.toLowerCase();
    let isAdmin = userstate.badges && userstate.badges.broadcaster && userstate.badges.broadcaster === '1';

    if (message.startsWith('!bet') && betting) bet(message, username);
    if (message === '!points') points(username, channel);
    if (message.startsWith('!add') && isAdmin) add(message);
    if (message === '!startBet' && isAdmin && !betting) { 
        betting = true;
        client.action(channel, 'Start');
    }
    if (message === '!stopBet' && isAdmin && betting) {
        betting = false;
        client.action(channel, 'Stop');
    }
    if (message.startsWith('!result') && isAdmin && !betting) result(message);
});

function result(message) {
    let result = message.split(' ')[1];
    let correctGuessedPool = [];
    let correctGuessedSum = 0;
    let wholePot = _pool.reduce( (acc, val) =>  {
        if (acc.bet) return parseInt(acc.bet) + parseInt(val.bet);
        return parseInt(acc) + parseInt(val.bet);
    })

    correctGuessedPool = _pool.filter( record => parseInt(record.guess) === parseInt(result))

    correctGuessedSum = correctGuessedPool.reduce( (acc, val) => {
        if (acc.bet) return parseInt(acc.bet) + parseInt(val.bet);
        return parseInt(acc) + parseInt(val.bet);
    })

    correctGuessedPool.forEach( correctGuessedUserRecord => {
            let prize =  parseInt(wholePot/(correctGuessedSum/correctGuessedUserRecord.bet))
            changePoints(correctGuessedUserRecord.username.toLowerCase(), prize)
         })

    _pool = [];
}

function add(message) {
    if (message.split(' ').length !== 3) return;
    db.read();
    let addToUser = message.split(' ')[1].replace('@', '').toLowerCase();
    let addAmount = parseInt(message.split(' ')[2]);
    if (isNaN(addAmount) || addAmount < 0) addAmount = 0;
    if (!isUserInDB(addToUser)) pushNewUser(addToUser);

    changePoints(addToUser, addAmount)

    client.action(channel, `${addAmount} where added to ${addToUser}. Points: ${getCurrentPoints(addToUser)}`)
}

function bet(message, username) {
    if (message.split(' ').length !== 3) return;
    let bettingAmount = parseInt(message.split(' ')[2]);
    let guess = parseInt(message.split(' ')[1]);
    if (bettingAmount < 0 || bettingAmount != message.split(' ')[2]) {
        client.action(channel, `${username} illigal bet value.`);
        return;
    }
    if (guess < 0 || guess != message.split(' ')[1]) {
        client.action(channel, `${username} illigal guess value.`);
        return;
    }

    db.read();

    if (!isUserInDB(username)) pushNewUser(username);

    if (bettingAmount > getCurrentPoints(username)) {
        client.action(channel, `${username} don't have enougth points!`);
    } else {
        changePoints(username, -bettingAmount)

        client.action(channel, `${username} you just bet ${bettingAmount}.`);

        pool$.next({
            username: username,
            bet: bettingAmount,
            guess: guess
        });
    }
}

function points(username, channel) {
    db.read();
    if (!isUserInDB(username)) pushNewUser(username);
    client.action(channel, `${username}, ${getCurrentPoints(username)}`);
}

function isUserInDB(username) {
    if (db.get('users').find({username: username}).value()) return true;
    return false;
}

function changePoints(username, amount) {
    let currentPoints = getCurrentPoints(username)

    db.get('users')
    .find({ username: username })
    .assign({points: currentPoints + amount})
    .write();
}

function getCurrentPoints(username) {
    return db.get('users')
             .find({ username: username })
             .value().points;
}

function pushNewUser(username) {
    db.get('users')
      .push({username: username, points: 100})
      .write();
}

