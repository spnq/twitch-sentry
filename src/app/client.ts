import { Subject } from 'rxjs';
import { customMessages } from '../custom_messages';
import { periodics } from '../periodics';
import constants from '../constants';
import { Client as TmiClient } from 'tmi.js'
import { DataBase } from './data_base';
import { BetRecord, Interval, PeriodicMessage } from '../types';

export class Client {

    constructor(private client: TmiClient, private channel: string, private db: DataBase) {
        if (periodics.length > 0) this.periodicsInit();
        this.db.connect();
        this.messageEventInit();
        this.poolSubscriptionInit();
    }
    
    betting = false;
    _pool: Array<BetRecord> = [];
    readonly pool$ = new Subject();

    connect(): void {
        this.client.connect()
                   .then(() => {
                       console.log('Client Connected!'),
                       this.say('Connected!');
                    })
                   .catch( (err: string) => console.log('Connection Failed: ', err));
    }

    poolSubscriptionInit(): void {
        this.pool$.subscribe((newBet: any) => {
            let targetRecord: Array<BetRecord> = this._pool.filter(record => record.username === newBet.username);
            if (targetRecord.length > 0) {
                this._pool = this._pool.filter(record => record.username !== newBet.username)
                                       .concat(targetRecord.map(record => {
                                            this.db.changePoints(record.username, record.bet);
                                            return {username: newBet.username, bet: newBet.bet,guess: newBet.guess};
                        }));
            } else {
                this._pool.push(newBet);
            }
        });
    }

    say(message: string) {
        this.client.action(this.channel, message)
    }

    messageEventInit() {
        this.client.on('message', (_channel, userstate, message, self) => {
            if (self || !message.startsWith('!')) return;

            let username = userstate.username ? userstate.username.toLowerCase() : '';
            let isSub = userstate.subscriber ? true: false;
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
                this.say('Betting Ends ' + customMessages[message]);
            }
        });
    }

    periodicsInit() {
        periodics.forEach((message: PeriodicMessage) =>  setInterval(() => this.say(message.message), this.getIntervalTime(message.interval)));
    }

    getIntervalTime(interval: Interval) {
        return interval.hours * 3600 * 1000 + interval.minutes * 60 * 1000 + interval.seconds * 1000
    }

    redeem(username: string, isSub: boolean) {
        let redeemPoints = isSub ? constants.SUB_POINTS : constants.UNSUB_POINTS;
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

    isTheSameDay(username: string) {
        let now = new Date().toDateString();
        let lastRedeemed = this.db.get(username, 'redeem');
        return now === lastRedeemed;
    }

    result(message: string) {
        let result = parseInt(message.split(' ')[1]);
        let correctGuessedPool = [];
        let correctGuessedSum = 0;
        let wholePot = 0;
        let winnersArray: Array<{username: string, prize: number}> = [];

        if (this._pool.length === 1) {
            wholePot = this._pool[0].bet
        } else if (this._pool.length === 0) {
            wholePot = 0;
        } else {
            this._pool.forEach( record => wholePot += record.bet)
        }

        correctGuessedPool = this._pool.filter( record => record.guess === result)

        if (correctGuessedPool.length === 1) {
            correctGuessedSum = correctGuessedPool[0].bet
        } else if (correctGuessedPool.length === 0) {
            correctGuessedSum = 0;
        } else {
            correctGuessedPool.forEach( record => correctGuessedSum += record.bet)
        }

        correctGuessedPool.forEach( correctGuessedUserRecord => {
                let prize =  wholePot/(correctGuessedSum/correctGuessedUserRecord.bet);
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

    add(message: string) {
        if (message.split(' ').length !== 3) return;
        let addToUser = message.split(' ')[1].replace('@', '').toLowerCase();
        let addAmount = parseInt(message.split(' ')[2]);
        if (isNaN(addAmount) || addAmount < 0) addAmount = 0;
        if (!this.db.isUserInDB(addToUser)) this.db.pushNewUser(addToUser);

        this.db.changePoints(addToUser, addAmount)

        this.say( `${addAmount} where added to ${addToUser}. Points: ${this.db.getCurrentPoints(addToUser)}`)
    }

    bet(message: string, username: string) {
        if (message.split(' ').length !== 3) {
            this.say(`${username} illigal bet value.`);
            return;
        }
        let bettingAmount = parseInt(message.split(' ')[2]);
        let guess = parseInt(message.split(' ')[1]);
        if (bettingAmount < 0 || bettingAmount.toString() != message.split(' ')[2]) {
            this.say(`${username} illigal bet value.`);
            return;
        }
        if (guess < 0 || guess.toString() !== message.split(' ')[1]) {
           this.say(`${username} illigal guess value.`);
            return;
        }

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

    points(username: string) {
        if (!this.db.isUserInDB(username)) this.db.pushNewUser(username);
        this.say( `${username}, ${this.db.getCurrentPoints(username)}`);
    }
}
