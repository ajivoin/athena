const _ = require('lodash');
const Dictionary = require('oxford-dictionary');
const Discord = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');

const predefinedMessages = require('./predefinedMessages');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const config = {
  discordBotToken: process.env.discordBotToken.toString(),
  oxfordAppID: process.env.oxfordAppID.toString(),
  oxfordAppKey: process.env.oxfordAppKey.toString(),
  lang: 'lang' in process.env ? process.env.lang.toString() : 'en-us'
};


const client = new Discord.Client();

const dict = new Dictionary({
  app_id: config.oxfordAppID,
  app_key: config.oxfordAppKey,
  source_lang: config.lang
});

const flagToLexicalCategory = {
  '-n': 'noun',
  '-v': 'verb',
  '-adj': 'adjective',
  '-adv': 'adverb'
};

const responseToWordObject = (res, queryFlag) => {
  if (queryFlag) {
    for (let i = 0; i < res.results.length; i++) {
      for (let j = 0; j < res.results[i].lexicalEntries.length; j++) {
        const lexicalEntry = res.results[i].lexicalEntries[j];
        if (lexicalEntry.lexicalCategory.text.toLowerCase() === flagToLexicalCategory[queryFlag]) {
          return {
            category: lexicalEntry.lexicalCategory.text,
            definition: lexicalEntry.entries[0].senses[0].definitions[0],
            word: res.results[0].word
          };
        }
      }
    }
    return null;
  }

  const lexicalEntry = _.get(res, 'results[0].lexicalEntries[0]', false);
  return lexicalEntry ? {
    category: lexicalEntry.lexicalCategory.text,
    definition: lexicalEntry.entries[0].senses[0].definitions[0],
    word: res.results[0].word
  } : null;
};

const responseToPronunciationURL = (res) => {
  let url = null;
  res.results.forEach((result) => {
    if (url) return;
    result.lexicalEntries.forEach((lexEntry) => {
      if (url) return;
      lexEntry.pronunciations.forEach(({ audioFile }) => {
        if (url) return;
        if (audioFile) {
          url = audioFile;
        }
      });
    });
  });

  return url;
};

const findAndRemoveQueryFlag = (tokens) => {
  const queryFlagMatcher = /^-(n|v|adj|adv)$/;
  const index = tokens.findIndex(token => queryFlagMatcher.test(token));
  return index > -1 ? tokens.splice(index, 1) : null;
};

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
  const messageTokens = message.content.split(' ');
  const trigger = messageTokens.splice(0, 1)[0];
  const queryFlag = findAndRemoveQueryFlag(messageTokens);
  const word = messageTokens.join(' ');

  switch (trigger) {
    case '!def':
    case '!define': {
      message.channel.startTyping();
      const lookup = dict.find(encodeURIComponent(word));
      lookup.then(
        (res) => {
          const entry = responseToWordObject(res, queryFlag);
          if (entry) {
            message.reply(`${entry.word} (${entry.category}): ${entry.definition}`);
          } else {
            message.reply(
              `There was a problem finding a definition for ${word} (${queryFlag ? flagToLexicalCategory[queryFlag] : ''}).`
            );
          }
        },
        (err) => {
          console.error(err);
          message.reply(`There was a problem finding a definition for ${word}.`);
        },
      );
      message.channel.stopTyping();
      break;
    }
    case '!say':
    case '!pronounce': {
      if (!message.guild) return;
      if (message.member.voiceChannel) {
        const lookup = dict.pronunciations(encodeURI(word));
        lookup.then(
          async (res) => {
            const pronunciationURL = responseToPronunciationURL(res);

            if (!pronunciationURL) {
              return message.reply(
                `There was a problem finding pronunciation for ${word}.`
              );
            }

            const download = fs.createWriteStream('temp.mp3');
            download.on('finish', () => {
              message.member.voiceChannel.join().then((connection) => {
                const dispatcher = connection.playFile('./temp.mp3', { passes: 3 });
                dispatcher.on('end', () => {
                  dispatcher.destroy();
                  connection.disconnect();
                });
              });
              download.close();
            });

            http.get(pronunciationURL, (resDownload) => {
              resDownload.pipe(download);
            });
          },
          (pronunciationError) => {
            console.error(pronunciationError);
            message.reply(
              `There was a problem finding pronunciation for ${word}.`
            );
          },
        );
      } else {
        message.reply('You must be in a voice channel to use this command.');
      }
      break;
    }
    case '!ex':
    case '!example': {
      message.channel.startTyping();
      const lookup = dict.examples(encodeURIComponent(word));

      lookup.then(
        (res) => {
          const lexicalEntries = _.get(res, 'results[0].lexicalEntries', false);
          if (lexicalEntries) {
            const randomLexicalEntryIndex = lexicalEntries[Math.floor(Math.random() * lexicalEntries.length)];
            // TODO: Make all indices here random
            const randomExample = _.get(randomLexicalEntryIndex, 'entries[0].senses[0].examples[0].text', false);
            if (randomExample) {
              message.reply(randomExample);
            } else {
              message.reply(`no example found for ${word}.`);
            }
          } else {
            message.reply(`no example found for ${word}.`);
          }
        }
      );
      message.channel.stopTyping();
      break;
    }
    case '!help': {
      message.author.send(predefinedMessages.help);
      break;
    }
    default:
      break;
  }
});

client.login(config.discordBotToken);
