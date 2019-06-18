const config = require('./config.json');
const channel = config.defaultChannel;

const options = {
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

module.exports.options = options;
module.exports.channel = channel;
