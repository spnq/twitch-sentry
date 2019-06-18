const tmi = require('tmi.js')
const Client = require('./client')
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const DataBase = require('./data_base');
const adapter = new FileSync('./db.json');

const options = require('../options').options;
const channel = require('../options').channel;

const db = new DataBase(low(adapter), {users: []});
const client = new Client(tmi.client, options, channel, db);

client.connect();