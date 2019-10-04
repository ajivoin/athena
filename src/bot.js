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
  for (let i = 0; i < res.results.length; i++) {
    const { lexicalEntries } = res.results[i];
    for (let j = 0; j < lexicalEntries.length; j++) {
      const { pronunciations } = lexicalEntries[i];
      for (let k = 0; k < pronunciations.length; k++) {
        if (pronunciations[k].audioFile) {
          return pronunciations[k].audioFile;
        }
      }
    }
  }

  return null;
};

const findAndRemoveQueryFlag = (tokens) => {
  const queryFlagMatcher = /^-(n|v|adj|adv)$/;
  const index = tokens.findIndex(token => queryFlagMatcher.test(token));
  return index > -1 ? tokens.splice(index, 1) : null;
};

const randomArrayElement = array => array[Math.floor(Math.random() * array.length)];

const getExamples = (lexicalEntries) => {
  const examplesList = [];
  lexicalEntries.forEach((lexEntry) => {
    if ('entries' in lexEntry) {
      lexEntry.entries.forEach((entry) => {
        if ('senses' in entry) {
          entry.senses.forEach((sense) => {
            if ('examples' in sense) {
              sense.examples.forEach((example) => {
                if (example.text) {
                  examplesList.push(example.text);
                }
              });
            }
          });
        }
      });
    }
  });

  return examplesList;
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
            const randomExample = randomArrayElement(getExamples(lexicalEntries));
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
