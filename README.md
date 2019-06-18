# TwitchSentry

Twitch bot, running Node.js using RxJS and tmi.

* Betting system.
* Storing user information in local JSON database.
* Event Based.
* Configure custom commands and responses.
* Configure custom periodic messages.

# 📖 Wiki 
For detailed information on installation and all the available commands go to [Wiki](https://github.com/spnq/twitch-sentry/wiki)

# 🖥 Installation

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


# ⚙️ Configuring the bot
 
Go to config.json and change it accordingly:
```json
{
    "auth": "",
    "botName": "",
    "channels": [""],
    "defaultChannel": ""
}
```
* auth - Oauth you got from twitchapps.com/tmi.
* botName - Bot's nickname from twitch.com.
* channels - Channels bot connects to.
* defaultChannel - Value with a channel, bot interacts with 

Then start Sentry with 
```Shell
npm start
```

You should see a message from your bot in the chat.

# 📮 Add custom commands and responses

Go to custom_messages.json and add you own messages:
```json
{
    "!github":"https://github.com/spnq/twitch-sentry",
    "!email":"spnq@riseup.net"
}
```

# ⌛️ Add custom periodic messages

Go to periodics.json and add your messages and intervals for them to appear with, for example: 
```json
{
    "messages": [
        {
            "message": "Give a Star @https://github.com/spnq/twitch-sentry",
            "interval": {
                "hours" : 0,
                "minutes": 0,
                "seconds": 10
            }
        }
    ]
}
```

# 🎲 Betting

* Once you want to start a betting cycle type `!startBet` in the chat.
* Then bet with `!bet` command. Guess value goes first, bet value goes second. 
* When all the bets are placed, stop betting process with `!stopBet` command.
* When you got your result type `!result` and it's value to determine the winners.

# 🔖 License

Licensed under MIT License. View the [file](https://github.com/spnq/twitch-sentry/blob/master/LICENSE) for the full text.
