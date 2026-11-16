const database = require('../../core/database');
const { GatewayIntentBits, Client, Collection, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Command = require('../../modules/commands');
const Database2 = require('../../core/database');

class LevellingEvents {
  constructor(client) {
    this.client = client;
    this.db = new Database();
    this.lastMsgTime = new Map();
  }

  init() {
    this.client.on(Events.MessageCreate, this.onMessage.bind(this));
    this.client.on(Events.VoiceStateUpdate, this.onVoiceStateUpdate.bind(this));
  }

  async onMessage(message) {
    if (message.author?.bot || !message.guild) return;
    const user = this.db.getUser(message.guild.id, message.author.id);
    if (!user) return;
    user.last_msg = new Date().toISOString();
    this.db.upsertUser(user, message.guild.id);
    // XP from message
  }

  async onVoiceStateUpdate(oldState, newState) {
    const member = newState.member;
    if (!member) return;
    const user = this.db.getUser(newState.guild.id, member.id);
    if (!user) return;
    if (newState.channelId && !oldState.channelId) {
      user.last_voice = new Date().toISOString();
      this.db.upsertUser(user, newState.guild.id);
    }
  }
}

class EconomyService {
  constructor(db) {
    this.db = db;
  }

  async giveCoins(guildId, userId, amount) {
    const user = this.db.getUser(guildId, userId);
    if (!user) return;
    user.coins = (user.coins || 0) + amount;
    this.db.upsertUser(user, guildId);
  }

  async showRewards(interaction) {
    const embed = new interaction.client.EmbedBuilder()
      .setColor(0x27AE60)
      .setTitle('💰 Economy Rewards')
      .addFields({ name: 'Daily', value: '500 coins (24h)', inline: true }, { name: 'Weekly', value: '2000 coins (7d)', inline: true }, { name: 'Work', value: '250 coins (12h)', inline: true });
    await interaction.reply({ embeds: [embed] });
  }
}

module.exports = { LevellingEvents, EconomyService };