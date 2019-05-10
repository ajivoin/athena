const _ = require('lodash');
const Dictionary = require('oxford-dictionary');
const Discord = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const auth = {
  discordBotToken: process.env.discordBotToken.toString(),
  oxfordAppID: process.env.oxfordAppID.toString(),
  oxfordAppKey: process.env.oxfordAppKey.toString()
};


const client = new Discord.Client();

const dict = new Dictionary({
  app_id: auth.oxfordAppID,
  app_key: auth.oxfordAppKey,
  source_lang: 'en'
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
        if (lexicalEntry.lexicalCategory.toLowerCase() === flagToLexicalCategory[queryFlag]) {
          return {
            category: lexicalEntry.lexicalCategory,
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
    category: lexicalEntry.lexicalCategory,
    definition: lexicalEntry.entries[0].senses[0].definitions[0],
    word: res.results[0].word
  } : null;
};

const responseToPronunciationURL = res => _.get(res, 'results[0].lexicalEntries[0].pronunciations[0].audioFile', null);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
  const messageContent = message.content;
  const splitIndex = messageContent.indexOf(' ');
  const trigger = messageContent.substring(0, splitIndex);
  switch (trigger) {
    case '!define': {
      const queryFlag = messageContent.split(' ')[1] in flagToLexicalCategory
        ? messageContent.split(' ')[1] : null;

      const lookup = dict.definitions({
        fields: 'definitions',
        word: encodeURI(
          queryFlag ? messageContent.substr(splitIndex + queryFlag.length + 2) : messageContent.substr(splitIndex + 1)
        )
      });
      lookup.then(
        (res) => {
          const entry = responseToWordObject(res, queryFlag);
          if (entry) {
            message.reply(`${entry.word} (${entry.category}): ${entry.definition}`);
          }
        },
        (err) => {
          console.error(err);
          message.reply(`There was a problem finding a definition for ${messageContent.substr(trigger.length + 1)}.`);
        },
      );
      break;
    }
    case '!say':
    case '!pronounce': {
      if (!message.guild) return;
      if (message.member.voiceChannel) {
        const lookup = dict.pronunciations(encodeURI(messageContent.substr(splitIndex + 1)));
        lookup.then(
          async (res) => {
            const pronunciationURL = responseToPronunciationURL(res);

            if (!pronunciationURL) {
              return message.reply(
                `There was a problem finding pronunciation for ${messageContent.substr(trigger.length + 1)}.`
              );
            }

            const download = fs.createWriteStream('temp.mp3');
            download.on('finish', () => {
              message.member.voiceChannel.join().then((connection) => {
                const dispatcher = connection.playFile('./temp.mp3');

                dispatcher.on('end', () => {
                  dispatcher.destroy();
                  connection.disconnect();
                });
              });
            });

            http.get(pronunciationURL, (resDownload) => {
              resDownload.pipe(download);
            });
          },
          (pronunciationError) => {
            console.error(pronunciationError);
            message.reply(
              `There was a problem finding pronunciation for ${messageContent.substr(trigger.length + 1)}.`
            );
          },
        );
      } else {
        message.reply('You must be in a voice channel to use this command.');
      }
      break;
    }
    default:
      break;
  }
});

client.login(auth.discordBotToken);
