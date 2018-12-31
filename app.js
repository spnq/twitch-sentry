const tmi = require('tmi.js')
const config = require('./config')
const channel = config.testChannel;
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('./db.json')
const db = low(adapter)


db.defaults({ users: [] }).write()

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
    if (self) return;
    if (message === '!bet') {
        db.read()
        if (db.get('users').find({username: userstate.username}).value()) {
            client.action(channel, `${userstate.username} is in the base`)
        } else {
            client.action(channel, `${userstate.username} is not the base`)
            db.get('users').push({username: userstate.username, point: '0'}).write()
        }
    }
  });
