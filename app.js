const tmi = require('tmi.js')
const config = require('./config')
const channel = config.testChannel;
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const rx = require('rxjs');

const adapter = new FileSync('./db.json');
const db = low(adapter);

let betting = false;
let _pool = [];
const pool$ = new rx.Subject(_pool);

db.defaults({ users: [] }).write();

let options ={
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

client.on('connected', (address, port) => {
    client.action(channel, 'Connected')
});

client.on("message", function (channel, userstate, message, self) {
    let username = userstate.username;
    let currentPoints;
    switch (true) {
        case self:
            break;
        case (message.includes('!bet') && betting):
            let bettingAmount = parseInt(message.split(' ')[1]);

            if (bettingAmount < 0 || bettingAmount != message.split(' ')[1]) {
                client.action(channel, `${username} illigal bet value.`);
                break;
            }

            db.read();

            if (!isUserInDB(username)) {pushNewUser(username)}
            
            currentPoints = db.get('users').find({username: username}).value().points;
            if ( bettingAmount > currentPoints) {
                client.action(channel, `${username} don't have enougth points!`);
                break;
            } else {
                db.get('users').find({username: username})
                           .assign({points : currentPoints - bettingAmount})
                           .write();
                client.action(channel, `${username} you just bet ${bettingAmount}.`);
                pool$.next({username: username, bet: bettingAmount});
            }
        break;
        case message === '!points':
            db.read();
            if (!isUserInDB(username)) {
                pushNewUser(username);
            }
            client.action(channel, `${username}, ${(db.get('users')
                                      .find({username})
                                      .value().points)}`);
            break;
        case (message.includes('!add') && userstate.badges.broadcaster === '1'):
            if (message.split(' ').length !== 3) break;
            db.read();
            let addToUser = message.split(' ')[1];
            let addAmount = parseInt(message.split(' ')[2]);
            if (isNaN(addAmount) || addAmount < 0) { addAmount = 0}
            if (!isUserInDB(addToUser)) { pushNewUser(addToUser) }
            currentPoints = db.get('users').find({username: addToUser}).value().points;
            db.get('users').find({username: addToUser})
                           .assign({points : currentPoints + addAmount})
                           .write();
            break;
        case (message === '!start' && userstate.badges.broadcaster === '1' && !betting):
            client.action(channel, `Start`);
            betting = true;
            pool$.subscribe( next => {
                let targetRecord = _pool.filter(record => record.username === next.username);
                if (targetRecord.length > 0) {
                    _pool = _pool.filter(record => record.username !== next.username)
                                 .concat(targetRecord.map( val => val = {username: next.username, bet: val.bet + next.bet}));
                } else {
                    _pool.push(next);
                }
            });
            break;
        case (message === '!end' && userstate.badges.broadcaster === '1' && betting):
            client.action(channel, `Stop`);
            betting = false;
            pool$.complete();
            console.log(_pool);
            break;
    }

});

function isUserInDB (user) {
    if(db.get('users').find({username: user}).value()) return true;
    return false;
}

function pushNewUser (user) {
    db.get('users').push({username: user, points: 100}).write();
} 