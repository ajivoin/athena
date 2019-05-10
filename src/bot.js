const _ = require('lodash');
const Dictionary = require('oxford-dictionary');
const Discord = require('discord.io');
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const auth = {
  discordBotToken: process.env.discordBotToken.toString(),
  oxfordAppID: process.env.oxfordAppID.toString(),
  oxfordAppKey: process.env.oxfordAppKey.toString(),
};


const bot = new Discord.Client({
  autorun: true,
  token: auth.discordBotToken,
});

const dict = new Dictionary({
  app_id: auth.oxfordAppID,
  app_key: auth.oxfordAppKey,
  source_lang: 'en',
});

const responseToWordObject = (res) => {
  const lexicalEntry = _.get(res, 'results[0].lexicalEntries[0]', false);
  return lexicalEntry ? {
    category: lexicalEntry.lexicalCategory,
    definition: lexicalEntry.entries[0].senses[0].definitions[0],
    word: res.results[0].word,
  } : null;
};

const responseToPronunciationURL = res => _.get(res, 'results[0].lexicalEntries[0].pronunciations[0].audioFile', null);

/* eslint-disable */
const findChannel = (userID) => {
  for (const chan in bot.channels) {
    if (bot.channels[chan].type === 2 && userID in bot.channels[chan].members) {
      return chan;
    }
  }
  return null;
};
/* eslint-enable */

bot.on('ready', () => {
  console.log(`Logged in as ${bot.username}`);
});

bot.on('message', (user, userID, channelID, message) => {
  const splitIndex = message.indexOf(' ');
  const trigger = message.substring(0, splitIndex);
  switch (trigger) {
    case '!define': {
      const lookup = dict.definitions({
        fields: 'definitions',
        word: encodeURI(message.substr(splitIndex + 1)),
      });
      lookup.then(
        (res) => {
          const entry = responseToWordObject(res);
          if (entry) {
            bot.sendMessage({
              message: `${entry.word} (${entry.category}): ${entry.definition}`,
              to: channelID,
            });
          }
        },
        (err) => {
          console.error(err);
          bot.sendMessage({
            message: `There was a problem finding a definition for ${message.substr(trigger.length + 1)}.`,
            to: channelID,
          });
        },
      );
      break;
    }
    case '!say':
    case '!pronounce': {
      const channel = findChannel(userID);
      if (channel) {
        const lookup = dict.pronunciations(encodeURI(message.substr(splitIndex + 1)));
        lookup.then(
          (res) => {
            const pronunciationURL = responseToPronunciationURL(res);

            if (!pronunciationURL) {
              const msg = `There was a problem finding pronunciation for ${message.substr(trigger.length + 1)}.`;
              console.error(msg);
              bot.sendMessage({
                message: msg,
                to: channelID,
              });
              return;
            }

            const download = fs.createWriteStream('temp.mp3');

            bot.joinVoiceChannel(channel, (joinError) => {
              if (joinError) return console.error(joinError);

              bot.getAudioContext(channel, (audioError, stream) => {
                if (audioError) return console.error(audioError);

                stream.on('fileEnd', () => {
                  stream.stop();
                  bot.leaveVoiceChannel(channel);
                });

                download.on('finish', () => {
                  stream.playAudioFile('temp.mp3');
                });

                http.get(pronunciationURL, (resDownload) => {
                  resDownload.pipe(download);
                });
              });
            });
          },
          (pronunciationError) => {
            const msg = `There was a problem finding pronunciation for ${message.substr(trigger.length + 1)}.`;
            console.error(pronunciationError, msg);
            bot.sendMessage({
              message: msg,
              to: channelID,
            });
          },
        );
      }
      break;
    }
    default:
      break;
  }
});
