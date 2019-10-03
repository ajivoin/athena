const _ = require('lodash');
const Discord = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');
const Dictionary = require('oxford-dictionary');

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
  source_lang: 'en-us'
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

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
  const messageContent = message.content;
  const splitIndex = messageContent.indexOf(' ');
  const trigger = messageContent.substring(0, splitIndex);
  switch (trigger) {
    case '!def':
    case '!define': {
      message.channel.startTyping();
      const queryFlag = messageContent.split(' ')[1] in flagToLexicalCategory
        ? messageContent.split(' ')[1] : null;
      const offset = queryFlag ? splitIndex + queryFlag.length + 2 : splitIndex + 1;

      const lookup = dict.find(encodeURIComponent(messageContent.substr(offset)));
      lookup.then(
        (res) => {
          console.log(JSON.stringify(res));
          const entry = responseToWordObject(res, queryFlag);
          if (entry) {
            message.reply(`${entry.word} (${entry.category}): ${entry.definition}`);
          } else {
            message.reply(
              `There was a problem finding a definition for ${messageContent.substr(offset)} (${queryFlag ? flagToLexicalCategory[queryFlag] : ''}).`
            );
          }
        },
        (err) => {
          console.error(err);
          message.reply(`There was a problem finding a definition for ${messageContent.substr(trigger.length + 1)}.`);
        },
      );
      message.channel.stopTyping();
      break;
    }
    case '!say':
    case '!pronounce': {
      if (!message.guild) return;
      if (message.member.voiceChannel) {
        const lookup = dict.pronunciations(encodeURI(messageContent.substr(splitIndex + 1)));
        lookup.then(
          async (res) => {
            console.log(JSON.stringify(res));
            const pronunciationURL = responseToPronunciationURL(res);

            if (!pronunciationURL) {
              return message.reply(
                `There was a problem finding pronunciation for ${messageContent.substr(trigger.length + 1)}.`
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
    case '!ex':
    case '!example': {
      message.channel.startTyping();
      const queryFlag = messageContent.split(' ')[1] in flagToLexicalCategory
        ? messageContent.split(' ')[1] : null;
      const offset = queryFlag ? splitIndex + queryFlag.length + 2 : splitIndex + 1;

      const lookup = dict.examples(encodeURIComponent(messageContent.substr(offset)));

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
              // TODO: More robust reply
              message.reply('No example found!');
            }
          } else {
            // TODO: More robust reply
            message.reply('No example found!');
          }
        }
      );
      message.channel.stopTyping();
      break;
    }
    default:
      break;
  }
});

client.login(auth.discordBotToken);
