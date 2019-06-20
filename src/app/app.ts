import { client as tmi, Client as TmiClient } from 'tmi.js';
import { Client } from './client';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import { DataBase } from './data_base';
import { options, channel} from '../options';

const adapter = new FileSync('./db.json');
const tmiClient: TmiClient = new (tmi as any)(options)

const db = new DataBase(low(adapter), {users: []});
const client = new Client(tmiClient, channel, db);

client.connect();