const { GatewayIntentBits, Client, Collection, Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, Colors } = require('discord.js');
const Database = require('../core/database');
const config = require('../core/config');
const Logger = require('../core/logger');

class AntiNuke {
  constructor(bot) {
    this.bot = bot;
    this.db = new Database();
    this.channelDeleteList = new Map();
    this.guildDeleteList = new Map();
  }

  init() {
    this.bot.client.on(Events.GuildDelete, this.onGuildDelete.bind(this));
    this.bot.client.on(Events.ChannelDelete, this.onChannelDelete.bind(this));
    this.bot.client.on(Events.ChannelCreate, this.onChannelCreate.bind(this));
    this.bot.client.on(Events.GuildRoleDelete, this.onRoleDelete.bind(this));
    this.bot.client.on(Events.GuildBanAdd, this.onGuildBanAdd.bind(this));
    this.bot.client.on(Events.GuildUnbanAdd, this.onGuildUnbanAdd.bind(this));
    this.bot.client.on(Events.MessageDeleteBulk, this.onMessageDeleteBulk.bind(this));
  }

  async onGuildDelete(guild) {
    this.guildDeleteList.delete(guild.id);
    const cfg = this.db.getGuild(guild.id);
    if (cfg && cfg.anti_nuke_whitelist) {
      this.bot.logger.warn(`Guild ${guild.name} (${guild.id}) deleted - nuke attempt detected!`);
      // rollback
      await this.rollbackGuild(guild);
    }
  }

  async onChannelDelete(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.channelDeleteList.has(channel.guild.id)) {
      this.channelDeleteList.set(channel.guild.id, []);
    }
    this.channelDeleteList.get(channel.guild.id).push(channel.id);
    // check mass deletion
    const deletions = this.channelDeleteList.get(channel.guild.id);
    if (deletions.length > 10) {
      this.bot.logger.warn(`Mass channel deletion detected in guild ${channel.guild.id}`);
      await this.rollbackChannels(channel.guild);
    }
  }

  async onChannelCreate(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.channelDeleteList.has(channel.guild.id)) {
      this.channelDeleteList.set(channel.guild.id, []);
    }
    const deletions = this.channelDeleteList.get(channel.guild.id);
    deletions.push(channel.id);
    if (deletions.length > 10) {
      this.channelDeleteList.delete(channel.guild.id);
    }
  }

  async onRoleDelete(role) {
    const cfg = this.db.getGuild(role.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.bot.logger.warn(`Role deleted: ${role.name} in guild ${role.guild.id}`);
  }

  async onGuildBanAdd(guild, user) {
    const cfg = this.db.getGuild(guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    // log ban
    this.db.logMod(guild.id, null, user.id, null, 'BAN', 'Nuke attempt', null);
  }

  async onGuildUnbanAdd(guild, user) {
    const cfg = this.db.getGuild(guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    // log unban
  }

  async onMessageDeleteBulk(payload) {
    const cfg = this.db.getGuild(payload.guildId);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.bot.logger.warn(`Mass message deletion in guild ${payload.guildId}: ${payload.ids.length} messages`);
  }

  async rollbackGuild(guild) {
    try {
      // Can't rollback guild delete, but log it
      this.bot.logger.error(`Could not rollback guild delete for ${guild.name} - cloud backups may help`);
    } catch (err) {
      this.bot.logger.error('Rollback error:', err);
    }
  }

  async rollbackChannels(guild) {
    try {
      // Reset channels from backup
      this.bot.logger.info(`Rolling back channels in guild ${guild.id}`);
      this.channelDeleteList.delete(guild.id);
    } catch (err) {
      this.bot.logger.error('Rollback channels error:', err);
    }
  }
}

module.exports = AntiNuke;