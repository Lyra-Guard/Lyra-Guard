const fetch = require('node-fetch');
const { tenorAPI } = require('../../config.json');
const { Command } = require('discord.js-commando');

// Skips loading if not found in config.json
if (!tenorAPI) return;

module.exports = class AnimegifCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'animegif',
      group: 'gifs',
      aliases: ['anime-gif', 'anime-gifs'],
      memberName: 'animegif',
      description:
        'Provide a name of an anime show or character and I will return a gif!',
      throttling: {
        usages: 1,
        duration: 4
      }
    });
  }

  run(message) {
    fetch(`https://api.tenor.com/v1/random?key=${tenorAPI}&q=anime&limit=1`)
      .then(res => res.json())
      .then(json => message.channel.send(json.results[0].url))
      .catch(function onError() {
        message.reply(':x: Failed to find a gif!');
        return;
      });
  }
};
