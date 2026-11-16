const { MessageFlags } = require('discord.js');

function sendRetry(interaction, content, options = {}) {
  return interaction.reply({ content, ...options, flags: options.flags || [MessageFlags.Ephemeral] });
}

function checkBool(str) {
  return ['y', 'yes', 'true', '1'].includes(str.toLowerCase());
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

module.exports = { sendRetry, checkBool, clamp };