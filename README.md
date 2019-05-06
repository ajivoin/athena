# Athena
The Greek Goddess of wisdom takes on a new job as a definition-retrieving Discord Bot.

# Running the Bot

- Pre-requisites:

  - [Node.js](https://nodejs.org/en/)
  - [Discord Developer Application and Bot Account](https://discordapp.com/developers/applications/)
    - You must add the bot account to a server to use it.

- Clone this repository.

- In the root directory create `auth.json` with the following format, replacing `DISCORD_BOT_TOKEN_HERE` with your Bot's token:

  ```js
  {
    "token": "DISCORD_BOT_TOKEN_HERE"
  }
  ```


- Run `npm install` then `node bot.js`. Your bot should be online on all servers you added it to.
