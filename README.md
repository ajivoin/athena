# Athena
The Greek Goddess of wisdom takes on a new job as a definition-retrieving Discord Bot.

## Running the Bot

- Pre-requisites:

  - [Node.js](https://nodejs.org/en/)
  - [Discord Developer Application and Bot Account](https://discordapp.com/developers/applications/)
    - You must add the bot account to a server to use it.
  - [Oxford Dictionaries API Account](https://developer.oxforddictionaries.com/) for accessing the dictionary API
  - [ffmpeg](https://ffmpeg.org/) for playing word pronunciations

- Clone this repository.

- In the root directory create `auth.json` with the following format, replacing placeholders with corresponding tokens:

  ```js
  {
    "discordBotToken": "DISCORD_BOT_TOKEN_HERE",
    "oxfordAppID": "OXFORD_APP_ID_HERE",
    "oxfordAppKey": "OXFORD_APP_KEY_HERE"
  }
  ```


- Run `npm install` then `node bot.js`. Your bot should be online on all servers you added it to.
