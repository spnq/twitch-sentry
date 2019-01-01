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
    switch (true) {
        case self:
            break;
        case (message.includes('!bet') && betting):
            let bettingAmount = message.split(' ')[1];
            db.read();
            if (isUserInDB(username)) {
                client.action(channel, `${username} is in the base`);
                pool$.next(bettingAmount);
            } else {
                client.action(channel, `${username} is not the base`);
                pushNewUser(username)
            }
        break;
        case message === '!points':
            db.read();
            if (!isUserInDB(username)) {
                pushNewUser(username);
            }
            client.action(channel, (db.get('users')
                                      .find({username})
                                      .value().points));
            break;
        case (message.includes('!add') && userstate.badges.broadcaster === '1'):
            if (message.split(' ').length !== 3) break;
            db.read();
            let addToUser = message.split(' ')[1];
            let addAmount = parseInt(message.split(' ')[2]);
            if (isNaN(addAmount) || addAmount < 0) { addAmount = 0}
            if (!isUserInDB(addToUser)) { pushNewUser(addToUser) }
            let currentPoints = db.get('users').find({username: addToUser}).value().points;
            db.get('users').find({username: addToUser})
                           .assign({points : currentPoints + addAmount})
                           .write();
            break;
        case (message === '!start' && userstate.badges.broadcaster === '1' && !betting):
            client.action(channel, `Start`);
            betting = true;
            pool$.subscribe( next => _pool.push(next));
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
    db.get('users').push({username: user, points: 0}).write();
} 