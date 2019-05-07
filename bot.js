const Discord = require('discord.io');
const Dictionary = require('oxford-dictionary');
const fs = require('fs');
const http = require('http');
const config = require('./config.json');
const auth = require('./auth.json');

const bot = new Discord.Client({
  token: auth.discordBotToken,
  autorun: true,
});

const dict = new Dictionary({
  app_id: auth.oxfordAppID,
  app_key: auth.oxfordAppKey,
  source_lang: config.lang,
});

const responseToWordObject = (res) => {
  const lexicalEntry = res.results[0].lexicalEntries[0];
  return {
    category: lexicalEntry.lexicalCategory,
    definition: lexicalEntry.entries[0].senses[0].definitions[0],
    word: res.results[0].word,
  };
};

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
      const lookup = dict.definitions(encodeURI(message.substr(splitIndex + 1)));
      lookup.then(
        (res) => {
          const entry = responseToWordObject(res);
          bot.sendMessage({
            to: channelID,
            message: `${entry.word} (${entry.category}): ${entry.definition}`,
          });
        },
        (err) => {
          console.error(err);
          bot.sendMessage({
            to: channelID,
            message: `There was a problem finding a definition for ${message.substr(trigger.length + 1)}.`,
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
            bot.joinVoiceChannel(channel, (joinError) => {
              if (joinError) return console.error(joinError);

              bot.getAudioContext(channel, (audioError, stream) => {
                if (audioError) return console.error(audioError);

                const pronunciationURL = res.results[0].lexicalEntries[0].pronunciations[0].audioFile;
                const download = fs.createWriteStream('temp.mp3');

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
          (err) => {
            console.error(err);
            bot.sendMessage({
              to: channelID,
              message: `There was a problem finding pronunciation for ${message.substr(trigger.length + 1)}.`,
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
