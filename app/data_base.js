class DataBase {
    constructor(adapter, defaults) {
        this.adapter = adapter;
        this.defaults = defaults;
    }

    connect() {
        this.adapter.defaults(this.defaults).write()
        console.log('Database Connected!')
    }

    pull() {
        this.adapter.read()
    }

    isUserInDB(username) {
        if (this.adapter.get('users').find({username: username}).value()) return true;
        return false;
    }
    
    changePoints(username, amount) {
        let currentPoints = this.getCurrentPoints(username)
    
        this.adapter.get('users')
            .find({ username: username })
            .assign({points: currentPoints + amount})
            .write();
    }
    
    changeRedeemDate(username, newDate) {
        this.adapter.get('users')
            .find({ username: username })
            .assign({redeem: newDate})
            .write();
    }

    getCurrentPoints(username) {
        return this.adapter.get('users')
                 .find({ username: username })
                 .value().points;
    }
    
    pushNewUser(username) {
        this.adapter.get('users')
          .push({username: username, points: 100, redeem: new Date().toDateString()})
          .write();
    }

    get(username, value) {
        return this.adapter.get('users')
                    .find({ username: username })
                    .value()[value]
    }
}

module.exports = DataBase;