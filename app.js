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
        case message === '!points':
            db.read();
            if (!isUserInDB(username)) {
                pushNewUser(username);
            }
            client.action(channel, (db.get('users')
                                      .find({username})
                                      .value().points));
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