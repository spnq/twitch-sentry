export class DataBase {
    constructor(private adapter: any, private defaults: Object) {}

    connect() {
        this.adapter.defaults(this.defaults).write()
        console.log('Database Connected!')
    }

    isUserInDB(username: string) {
        this.adapter.read()
        if (this.adapter.get('users').find({username: username}).value()) return true;
        return false;
    }
    
    changePoints(username: string, amount: number) {
        this.adapter.read()
        let currentPoints = this.getCurrentPoints(username)
    
        this.adapter.get('users')
            .find({ username: username })
            .assign({points: currentPoints + amount})
            .write();
    }
    
    changeRedeemDate(username: string, newDate: string) {
        this.adapter.read()
        this.adapter.get('users')
            .find({ username: username })
            .assign({redeem: newDate})
            .write();
    }

    getCurrentPoints(username: string) {
        this.adapter.read()
        return this.adapter.get('users')
                 .find({ username: username })
                 .value().points;
    }
    
    pushNewUser(username: string) {
        this.adapter.read()
        this.adapter.get('users')
          .push({username: username, points: 100, redeem: new Date().toDateString()})
          .write();
    }

    get(username: string, value: string) {
        this.adapter.read()
        return this.adapter.get('users')
                    .find({ username: username })
                    .value()[value]
    }
}
