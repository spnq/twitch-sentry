const tmi = require('tmi.js')
const bot = require('./bot-settings')
const channel = bot.testChannel;

let options ={
    options: {
        debug: true
    },
    connection: {
        cluster: "aws",
        reconnect: true
    },
    identity: {
        username: bot.botName,
        password: bot.auth
    },
    channels: bot.channels
};

const client = new tmi.client(options);
client.connect();

client.on('connected', (address, port) => {
    client.action(channel, 'Hi, im a bot!')
})