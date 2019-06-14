# TwitchSentry

Twitch bot, running Node.js using RxJS and tmi.

* Configurable throught config.js.
* Betting system.
* Storing user information in local JSON database.
* Event Based.
* Add customs commands and responses.

# 📖 Wiki 
For detailed information on installation and all the available commands go to [Wiki](https://github.com/spnq/twitch-sentry/wiki)

# Installation

## npm
```Shell
$ npm install twitch-sentry
```

## Or build it yourself:
```Shell
$ git clone https://github.com/spnq/twitch-sentry.git
$ cd twitch-sentry
$ npm install
```


# Configuring the bot
 
Go to config.js and change it accordingly:
```javascript
exports.auth = ''; //Oauth you got from twitchapps.com/tmi
exports.botName = ''; //Bot's nickname from twitch.com
exports.channels = ['']; //Channels bot able to connect
exports.testChannel = ''; //Value with a channel, using for testing purposes 
```

Then start Sentry with 
```Shell
npm start
```

You should see a message from your bot in the chat.

# Add custom commands and responses

Go to messages.js and add you own messages:
```javascript
module.exports =  {
    "!github":"https://github.com/spnq/twitch-sentry",
    "!email":"spnq@riseup.net"
}
```

# Betting

* Once you want to start a betting cycle type `!startBet` in the chat.
* Then bet with `!bet` command. Guess value goes first, bet value goes second. 
* When all the bets are placed, stop betting process with `!stopBet` command.
* When you got your result type `!result` and it's value to determine the winners.

# License

Licensed under MIT License. View the [file](https://github.com/spnq/twitch-sentry/blob/master/LICENSE) for the full text.
