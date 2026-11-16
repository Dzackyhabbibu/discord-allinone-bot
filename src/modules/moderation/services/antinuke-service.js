const { GatewayIntentBits, Client, Collection, Events, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const Database = require('../../core/database');

class AntiNuke {
  constructor(db) {
    this.db = db;
    this.channelTracker = new Map();
    this.roleTracker = new Map();
    this.banTracker = new Map();
  }

  inject(client) {
    this.client = client;
    client.on('channelDelete', this.onChannelDelete.bind(this));
    client.on('channelCreate', this.onChannelCreate.bind(this));
    client.on('guildDelete', this.onGuildDelete.bind(this));
    client.on('guildRoleDelete', this.onRoleDelete.bind(this));
    client.on('guildBanAdd', this.onGuildBanAdd.bind(this));
    client.on('guildUnbanAdd', this.onGuildUnbanAdd.bind(this));
  }

  onChannelDelete(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.channelTracker.has(channel.guild.id)) this.channelTracker.set(channel.guild.id, []);
    this.channelTracker.get(channel.guild.id).push({ id: channel.id, name: channel.name, timestamp: Date.now() });
    if (this.channelTracker.get(channel.guild.id).length >= 5) {
      this.bot?.logger?.warn?.(`[NUKE] Mass channel deletion detected in ${channel.guild.name}`);
      this.channelTracker.get(channel.guild.id).splice(0, this.channelTracker.get(channel.guild.id).length - 4);
      // Rollback via backup if enabled
    }
  }

  onChannelCreate(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.channelTracker.has(channel.guild.id)) this.channelTracker.set(channel.guild.id, []);
    this.channelTracker.get(channel.guild.id).push({ id: channel.id, name: channel.name, timestamp: Date.now() });
  }

  onGuildDelete(guild) {
    const cfg = this.db.getGuild(guild.id);
    if (cfg && cfg.anti_nuke_whitelist) {
      this.bot?.logger?.warn?.(`[NUKE] Guild ${guild.name} (${guild.id}) deleted! Rollback not possible - use cloud backup.`);
    }
  }

  onRoleDelete(role) {
    const cfg = this.db.getGuild(role.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.bot?.logger?.warn?.(`[NUKE] Role deleted: ${role.name} in ${role.guild.name}`);
  }

  onGuildBanAdd(guild, user) {
    const cfg = this.db.getGuild(guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.banTracker.has(guild.id)) this.banTracker.set(guild.id, []);
    this.banTracker.get(guild.id).push({ id: user.id, timestamp: Date.now() });
  }

  onGuildUnbanAdd(guild, user) {
    const cfg = this.db.getGuild(guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.bot?.logger?.info?.(`[NUKE] Unban: ${user.tag} in ${guild.name}`);
  }
}

module.exports = AntiNuke;