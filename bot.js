const auth = require('./auth.json');
const config = require('./config.json');
const Discord = require('discord.io');
const wd = require('word-definition');

const TRIGGER = config.trigger;
const ENGLISH = config.lang;
const OPTIONS = config.wd_options;

const bot = new Discord.Client({
  token: auth.token,
  autorun: true
});

bot.on('ready', () => {
  console.log(`Logged in as ${bot.username}`);
})

bot.on('message', (user, userID, channelID, message, e) => {
  if (message.substr(0, TRIGGER.length) === TRIGGER) {
    wd.getDef(message.substr(TRIGGER.length + 1), ENGLISH, OPTIONS, (definition) => {
      if (definition.err) {
        bot.sendMessage({
          to: channelID,
          message: `No definition found for ${definition.word}`
        });
      } else {
        // Strips [[ ]] around linked words
        console.log(definition.definition);
        definition.definition = definition.definition.replace(/(\[\[|\]\])/g, '');
        bot.sendMessage({
          to: channelID,
          message: `${definition.word} (${definition.category}): ${definition.definition}`
        });
      }
    });
  }
});
