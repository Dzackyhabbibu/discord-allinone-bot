require('dotenv').config();

module.exports = {
  bot: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID || null,
    prefix: process.env.BOT_PREFIX || '!',
  },
  dashboard: {
    url: process.env.DASHBOARD_URL || 'http://localhost:3000',
    sessionSecret: process.env.SESSION_SECRET || 'super-secret-change-me',
    clientSecret: process.env.CLIENT_SECRET,
  },
  music: {
    lavalinkHost: process.env.LAVALINK_HOST || null,
    lavalinkPass: process.env.LAVALINK_PASS || null,
  },
  db: {
    path: process.env.DB_PATH || 'data/bot.sqlite',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  embedColor: 0x2F3136,
  embedFooter: 'All-in-One Discord Bot',
  ownerIds: [''], // isi user ID owner bot
};