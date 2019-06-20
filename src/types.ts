export interface UserRecord {
    username: string;
    points:   number;
    redeem:   string;
}

export interface BetRecord {
    username: string;
    bet:   number;
    guess:   number;
}

export interface CustomMessages {[key: string]: string}

export interface PeriodicMessage {
    message:  string;
    interval: Interval;
}

export interface Interval {
    hours:   number;
    minutes: number;
    seconds: number;
}
