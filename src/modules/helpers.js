const { EmbedBuilder, Colors } = require('discord.js');

function makeEmbed(data = {}, color = Colors.Blurple) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: config?.embedFooter || 'All-in-One Bot' });
  if (data.title) embed.setTitle(data.title);
  if (data.description) embed.setDescription(data.description);
  if (data.fields) embed.addFields(data.fields);
  if (data.author) embed.setAuthor(data.author);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  if (data.image) embed.setImage(data.image);
  if (data.timestamp) embed.setTimestamp(data.timestamp);
  return embed;
}

function parseDuration(str) {
  const unitMap = { s: 1, m: 60, h: 3600, d: 86400, w: 604800, mo: 2592000 };
  const match = str.match(/(\d+)([smhdwmo])/g);
  if (!match) return null;
  return match.reduce((acc, m) => {
    const [num, unit] = [parseInt(m), m[m.length - 1]];
    return acc + num * (unitMap[unit] || 1);
  }, 0);
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

module.exports = { makeEmbed, parseDuration, chunkArray };