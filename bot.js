const auth = require('./auth.json');
const config = require('./config.json');
const Discord = require('discord.io');
const Dictionary = require('oxford-dictionary');

const TRIGGER = config.trigger;

const bot = new Discord.Client({
  token: auth.discordBotToken,
  autorun: true
});

const dict = new Dictionary({
  app_id: auth.oxfordAppID,
  app_key: auth.oxfordAppKey,
  source_lang: config.lang
});

bot.on('ready', () => {
  console.log(`Logged in as ${bot.username}`);
})

bot.on('message', (user, userID, channelID, message, e) => {
  if (message.substr(0, TRIGGER.length) === TRIGGER) {
    const lookup = dict.definitions(encodeURI(message.substr(TRIGGER.length + 1)));
    lookup.then(
      (res) => {
        const entry = responseToWordObject(res);
        bot.sendMessage({
          to: channelID,
          message: `${entry.word} (${entry.category}): ${entry.definition}`
        });
      },
      (err) => {
        console.log(err);
        bot.sendMessage({
          to: channelID,
          message: `There was a problem finding a definition for ${message.substr(TRIGGER.length + 1)}.`
        });
      }
    );
  }
});

const responseToWordObject = (res) => {
  const lexicalEntry = res.results[0].lexicalEntries[0];
  return {
    category: lexicalEntry.lexicalCategory,
    definition: lexicalEntry.entries[0].senses[0].definitions[0],
    word: res.results[0].word
  };
}
