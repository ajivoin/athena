# Athena
The Greek Goddess of wisdom takes on a new job as a definition-retrieving Discord Bot.

## Usage

- Define a word with `!define <word>`
  - Sends a message containing the word, part of speech, and definition.
  - Define a word with a specific part of speech using query flags: `!define <flag> <word>` will return the noun definition of the word.
  - Flags:
    - `-n`: noun
    - `-v`: verb
    - `-adj`: adjective
    - `-adv`: adverb
- Play pronunciation of a word with `!pronounce <word>`
  - Joins the voice channel the user who sent this message is in and plays the word's pronunciation.
  - Alias: `!say <word>`

## Hosting the Bot

- Pre-requisites:

  - [Node.js](https://nodejs.org/en/)
  - [Discord Developer Application and Bot Account](https://discordapp.com/developers/applications/)
    - You must add the bot account to a server to use it.
  - [Oxford Dictionaries API Account](https://developer.oxforddictionaries.com/) for accessing the dictionary API
  - [ffmpeg](https://ffmpeg.org/) for playing word pronunciations

- Clone this repository.

- In the root directory create `.env` with the following format, replacing placeholders with corresponding tokens:

  ```
  discordBotToken=DISCORD_BOT_TOKEN_HERE
  oxfordAppID=OXFORD_APP_ID_HERE
  oxfordAppKey=OXFORD_APP_KEY_HERE
  ```


- Run `npm install` then `npm start`. Congratulations, your bot is online!

## Contributing

If you want to develop a feature or bug fix, please [create a pull request](https://github.com/ajivoin/athena/compare). Before creating a pull request, please read the following:

- Verify that your new code actually works.
- Make sure you didn't break existing code.
- Ensure your code is linted. This project has two commands you can run for linting: `npm run lint` and `npm run lint:fix`. `lint` will report errors, and `lint:fix` will automatically correct some errors.
- Please describe your changes in your pull request.
