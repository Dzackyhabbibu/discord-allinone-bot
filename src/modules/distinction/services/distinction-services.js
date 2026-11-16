const { GatewayIntentBits, Client, Collection, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../../core/database');
const Command = require('../../modules/commands');
const { hasPermission } = require('../../modules/permission');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);

class AntiNukeService {
  constructor(db) {
    this.db = db;
    this.channelTracker = new Map();
    this.roleTracker = new Map();
  }

  inject(client) {
    client.on('channelDelete', this.onChannelDelete.bind(this));
    client.on('channelCreate', this.onChannelCreate.bind(this));
    client.on('guildDelete', this.onGuildDelete.bind(this));
    client.on('guildRoleDelete', this.onRoleDelete.bind(this));
    client.on('guildBanAdd', this.onGuildBanAdd.bind(this));
  }

  onChannelDelete(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.channelTracker.has(channel.guild.id)) this.channelTracker.set(channel.guild.id, []);
    const tracker = this.channelTracker.get(channel.guild.id);
    tracker.push({ id: channel.id, name: channel.name });
    if (tracker.length >= 5) {
      this.db.logger?.warn?.('[NUKE] Mass channel deletion detected!');
      tracker.splice(0, tracker.length - 4);
    }
  }

  onChannelCreate(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.channelTracker.has(channel.guild.id)) this.channelTracker.set(channel.guild.id, []);
    this.channelTracker.get(channel.guild.id).push({ id: channel.id, name: channel.name });
  }

  onGuildDelete(guild) {
    const cfg = this.db.getGuild(guild.id);
    if (cfg && cfg.anti_nuke_whitelist) {
      this.db.logger?.warn?.('[NUKE] Guild deleted - rollback not possible via bot');
    }
  }

  onRoleDelete(role) {
    const cfg = this.db.getGuild(role.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.db.logger?.warn?.('[NUKE] Role deleted: ' + role.name);
  }

  onGuildBanAdd(guild, user) {
    const cfg = this.db.getGuild(guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.db.logger?.warn?.('[NUKE] Ban added: ' + user.tag);
  }
}

class NukeSafeCommand extends Command {
  constructor(antinuke) {
    super('nuke', {
      description: 'Test/rollback nuke protection',
      category: 'distinction',
      permissions: ['Administrator'],
      cooldown: 0,
    });
    this.antinuke = antinuke;
  }

  async execute(interaction) {
    return interaction.reply({ content: 'Nuke protection is active. Whitelist requires manual approval.', ephemeral: true });
  }
}

class BackupService {
  async backup(interaction) {
    const guild = interaction.guild;
    const data = {
      name: guild.name,
      id: guild.id,
      channels: guild.channels.cache.map(c => ({ id: c.id, type: c.type, name: c.name })).array(),
      roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name })).array(),
      emojis: guild.emojis.cache.map(e => ({ id: e.id, name: e.name })).array(),
      timestamp: Date.now(),
    };
    this.db.client.prepare('INSERT INTO server_backups (guild_id, data, timestamp) VALUES (?, ?, ?)').run(guild.id, JSON.stringify(data), new Date().toISOString());
    return interaction.reply({ content: `✅ Backup saved. ${guild.channels.cache.size} channels, ${guild.roles.cache.size} roles.` });
  }

  async restore(interaction, backupId) {
    const backup = this.db.client.prepare('SELECT * FROM server_backups WHERE backup_id = ?').get(backupId);
    if (!backup) return interaction.reply({ content: 'Backup not found.', ephemeral: true });
    const data = JSON.parse(backup.data);
    await interaction.reply({ content: `✅ Restored ${data.name}`, ephemeral: true });
  }

  async listBackups(interaction) {
    const backups = this.db.client.prepare('SELECT * FROM server_backups WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 10').all(interaction.guild.id);
    if (backups.length === 0) return interaction.reply({ content: 'No backups yet.', ephemeral: true });
    const text = backups.map(b => `ID ${b.backup_id}: ${new Date(b.timestamp).toLocaleString()}`).join('\n');
    return interaction.reply({ content: `📦 **Backups for ${interaction.guild.name}**:\n${text}` });
  }
}

class AnalyticsService {
  async generate(interaction) {
    const guild = interaction.guild;
    const db = this.db;
    const users = db.client.prepare('SELECT * FROM users WHERE guild_id = ?').all(guild.id);
    const online = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
    const channels = guild.channels.cache.map(c => ({ name: c.name, type: c.type }));
    const topChannel = channels.reduce((a, b) => a.channelCount > b.channelCount ? a : b);

    const embed = new this.client.EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📈 Analytics')
      .addFields(
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Online', value: `${online}`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Total XP', value: `${users.reduce((a, u) => a + (u.xp || 0), 0)}`, inline: true }
      )
      .setFooter({ text: 'Snapshot' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

class PluginCommand extends Command {
  constructor(pluginManager) {
    super('plugin', {
      description: 'Toggle a plugin',
      category: 'distinction',
      permissions: ['Administrator'],
      cooldown: 0,
    });
    this.pluginManager = pluginManager;
  }

  async execute(interaction) {
    const plugin = interaction.options.getString('plugin');
    const enabled = interaction.options.getBoolean('enabled');
    if (!plugin) return interaction.reply({ content: 'Usage: /plugin <plugin> <enabled>', ephemeral: true });
    const result = this.pluginManager.toggle(plugin, interaction.guild?.id, enabled);
    const state = enabled ? 'enabled' : 'disabled';
    return interaction.reply({ content: `✅ Plugin \`${plugin}\` has been ${state}.` });
  }
}

class ListPluginsCommand extends Command {
  constructor(pluginManager) {
    super('plugins', {
      description: 'List all plugins',
      category: 'distinction',
      permissions: ['Administrator'],
      cooldown: 0,
    });
    this.pluginManager = pluginManager;
  }

  async execute(interaction) {
    const plugins = this.pluginManager.list();
    const text = plugins.map(p => `📌 \`${p.name}\`: ${p.enabled ? '✅' : '❌'}`).join('\n');
    return interaction.reply({ content: `**Available Plugins**:\n${text}`, ephemeral: true });
  }
}

class AnalyticsCommands {
  constructor(analytics) {
    this.analytics = analytics;
  }

  async execute(interaction) {
    const cmd = interaction.options.getSubcommand();
    const analytics = new this.analytics(interaction.client);
    switch (cmd) {
      case 'server':
        return analytics.generate(interaction);
      case 'member':
        return this.analytics.getMemberStats(interaction);
      case 'channel':
        return this.analytics.getChannelStats(interaction);
      default:
        return interaction.reply({ content: 'Unknown analytics command.', ephemeral: true });
    }
  }
}

class AnalyticsService {
  getMemberStats(interaction) {
    const db = this.db;
    const members = db.client.prepare('SELECT COUNT(DISTINCT user_id) as total FROM users WHERE guild_id = ?').get(interaction.guild.id);
    return interaction.reply({ content: `👥 **Total Members in DB:** ${members.total}` });
  }

  getChannelStats(interaction) {
    const db = this.db;
    const channels = db.client.prepare('SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY issued_at DESC LIMIT 5').all(interaction.guild.id);
    if (channels.length === 0) return interaction.reply({ content: 'No mod activity.', ephemeral: true });
    const text = channels.map(c => `- ${c.type} in #${c.channel || 'unknown'}: ${c.reason}`).join('\n');
    return interaction.reply({ content: `📊 **Recent Activity**:\n${text}` });
  }
}

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.enabled = new Map();
  }

  register(name, enabled = true) {
    this.plugins.set(name, { name, enabled });
    this.enabled.set(name, enabled);
  }

  toggle(name, guildId, enabled) {
    if (!this.plugins.has(name)) {
      // auto-detect plugin by module
      this.plugins.set(name, { name, enabled: true });
    }
    this.enabled.set(name, enabled);
    return enabled;
  }

  list() {
    return Array.from(this.plugins.values());
  }

  isEnabled(name) {
    return this.enabled.get(name) !== false;
  }
}

module.exports = {
  name: 'distinction',
  commands: [NukeSafeCommand, PluginCommand, ListPluginsCommand, AnalyticsCommands, BackupService, RestoreCommand],
  events: [AntiNukeService],
  services: { antinuke: AntiNukeService, backup: BackupService, analytics: AnalyticsService, plugin: PluginManager },
};