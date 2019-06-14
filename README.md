# TwitchSentry

Twitch bot, running Node.js using RxJS and tmi.

* Configurable throught config.js.
* Betting system.
* Storing user information in local JSON database.
* Event Based.

# Installation

```Shell
$ npm install twitch-sentry
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


