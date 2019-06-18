const rx = require('rxjs');
const customMessages = require('../custom_messages.json');
const pereodics = require('../pereodics.json');
const constants = require('../constants.json');

class Client {

    constructor(client, options, channel, db) {
        this.options = options;
        this.client = new client(this.options);
        this.channel = channel;
        this.db = db;
        this.betting = false;
        this._pool = [];
        this.pool$ = new rx.Subject(this._pool);
        if (pereodics.messages.length > 0) this.pereodicsInit();
        this.db.connect();
        this.messageEventInit();
        this.poolSubscriptionInit();
    }

    connect() {
        this.client.connect(this.options)
                   .then(() => {
                       console.log('Client Connected!'),
                       this.say('Connected!');
                    })
                   .catch( err => console.log('Connection Failed: ', err));
    }

    poolSubscriptionInit() {
        this.pool$.subscribe(next => {
            let targetRecord = this._pool.filter(record => record.username === next.username);
            if (targetRecord.length > 0) {
                this._pool = this._pool.filter(record => record.username !== next.username)
                                       .concat(targetRecord.map(val => {
                                            this.db.changePoints(val.username, val.bet);
                                            return {username: next.username, bet: next.bet,guess: next.guess};
                        }));
            } else {
                this._pool.push(next);
            }
        });
    }

    say(message) {
        this.client.action(this.channel, message)
    }

    messageEventInit() {
        this.client.on('message', (channel, userstate, message, self) => {
            if (self || !message.startsWith('!')) return;

            let username = userstate.username.toLowerCase();
            let isSub = userstate.subscriber;
            let isAdmin = userstate.badges && userstate.badges.broadcaster && userstate.badges.broadcaster === '1';
        
            if (message.startsWith('!redeem')) this.redeem(username, isSub);
            else if (message.startsWith('!bet') && this.betting) this.bet(message, username);
            else if (message === '!points') this.points(username);
            else if (message.startsWith('!add') && isAdmin) this.add(message);
            else if (message === '!startBet' && isAdmin && !this.betting) { 
                this.betting = true;
                this.say('Betting Begins');
            }
            else if (message === '!stopBet' && isAdmin && this.betting) {
                this.betting = false;
                this.say('Betting Ends');
            }
            else if (message.startsWith('!result') && isAdmin && !this.betting) this.result(message);
            else if (customMessages[message]) {
                this.say('Betting Ends', customMessages[message]);
            }
        });
    }

    pereodicsInit() {
        pereodics.messages.forEach(msg =>  setInterval(() => this.say(msg.message), this.getIntervalTime(msg.interval)));
    }

    getIntervalTime(interval) {
        return interval.hours * 3600 * 1000 + interval.minutes * 60 * 1000 + interval.seconds * 1000
    }

    redeem(username, isSub) {
        this.db.pull()
        let redeemPoints = isSub ? constants.sub_points : constants.unsub_points;
        let now = new Date().toDateString();
        if (!this.db.isUserInDB(username)) this.db.pushNewUser(username);
        if (this.isTheSameDay(username)) {
           this.say(`${username}, you already redeemed free points today!`);
        } else {
            this.db.changePoints(username, redeemPoints);
            this.db.changeRedeemDate(username, now)
            this.say(`${username}, you got ${redeemPoints} points!`);
        }
    }

    isTheSameDay(username) {
        let now = new Date().toDateString();
        let lastRedeemed = this.db.get(username, 'redeem');
        return now === lastRedeemed;
    }

    result(message) {
        let result = message.split(' ')[1];
        let correctGuessedPool = [];
        let correctGuessedSum = 0;
        let wholePot = 0;
        let winnersArray = [];

        if (this._pool.length === 1) {
            wholePot = this._pool[0].bet
        } else if (this._pool.length === 0) {
            wholePot = 0;
        } else {
            wholePot = this._pool.reduce( (acc, val) =>  {
                if (acc.bet) return parseInt(acc.bet) + parseInt(val.bet);
                return parseInt(acc) + parseInt(val.bet);
            })
        }

        correctGuessedPool = this._pool.filter( record => parseInt(record.guess) === parseInt(result))

        if (correctGuessedPool.length === 1) {
            correctGuessedSum = correctGuessedPool[0].bet
        } else if (correctGuessedPool.length === 0) {
            correctGuessedSum = 0;
        } else {
            correctGuessedSum = correctGuessedPool.reduce( (acc, val) => {
                if (acc.bet) return parseInt(acc.bet) + parseInt(val.bet);
                return parseInt(acc) + parseInt(val.bet);
            })
        }

        correctGuessedPool.forEach( correctGuessedUserRecord => {
                let prize =  parseInt(wholePot/(correctGuessedSum/correctGuessedUserRecord.bet));
                winnersArray.push({username: correctGuessedUserRecord.username, prize: prize})
                this.db.changePoints(correctGuessedUserRecord.username.toLowerCase(), prize)
            })

        if (winnersArray.length > 0) {
           this.say(`The winners are: ${ winnersArray.map( record => ` ${record.username}, you got ${record.prize} points`)}.`)
        } else {
           this.say(`There were no winners this time.`)
        }

        winnersArray = [];
        this._pool = [];
    }

    add(message) {
        if (message.split(' ').length !== 3) return;
        this.db.pull();
        let addToUser = message.split(' ')[1].replace('@', '').toLowerCase();
        let addAmount = parseInt(message.split(' ')[2]);
        if (isNaN(addAmount) || addAmount < 0) addAmount = 0;
        if (!this.db.isUserInDB(addToUser)) this.db.pushNewUser(addToUser);

        this.db.changePoints(addToUser, addAmount)

        this.say( `${addAmount} where added to ${addToUser}. Points: ${this.db.getCurrentPoints(addToUser)}`)
    }

    bet(message, username) {
        if (message.split(' ').length !== 3) {
            this.say(`${username} illigal bet value.`);
            return;
        }
        let bettingAmount = parseInt(message.split(' ')[2]);
        let guess = parseInt(message.split(' ')[1]);
        if (bettingAmount < 0 || bettingAmount != message.split(' ')[2]) {
            this.say(`${username} illigal bet value.`);
            return;
        }
        if (guess < 0 || guess != message.split(' ')[1]) {
           this.say(`${username} illigal guess value.`);
            return;
        }

        this.db.pull();

        if (!this.db.isUserInDB(username)) this.db.pushNewUser(username);

        if (bettingAmount > this.db.getCurrentPoints(username)) {
           this.say(`${username} don't have enougth points!`);
        } else {
            this.db.changePoints(username, -bettingAmount)
            this.say(`${username} you just bet ${bettingAmount}.`);

            this.pool$.next({
                username: username,
                bet: bettingAmount,
                guess: guess
            });
        }
    }

    points(username) {
        this.db.pull();
        if (!this.db.isUserInDB(username)) this.db.pushNewUser(username);
        this.say( `${username}, ${this.db.getCurrentPoints(username)}`);
    }
}

module.exports = Client;