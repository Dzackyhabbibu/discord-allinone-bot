const Command = require('../../modules/commands');
const { hasPermission } = require('../../modules/permission');
const Database = require('../../core/database');

class WarnCommand extends Command {
  constructor() {
    super('warn', {
      description: 'Warn a user and add violation points',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildId = interaction.guild.id;
    const db = new Database();

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot warn yourself!', ephemeral: true });
    }

    if (!target.bot && target.id === interaction.client.user.id) {
      return interaction.reply({ content: 'You cannot warn the bot!', ephemeral: true });
    }

    let user = db.getUser(guildId, target.id);
    if (!user) {
      user = { id: target.id, guild_id: guildId, username: target.username, discriminator: target.discriminator, coins: 1000 };
      db.upsertUser(user, guildId);
    }

    const caseId = `warn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.logMod(guildId, caseId, target.id, interaction.user.id, 'WARN', reason);

    // increment warn points and check threshold
    user.warn_points = (user.warn_points || 0) + 1;
    db.upsertUser(user, guildId);

    const embed = new interaction.client.EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('⚠️ User Warned')
      .setDescription(`**User:** ${target.username}\n**Reason:** ${reason}\n**Case:** ${caseId}\n**Points:** ${user.warn_points}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Send to mod log channel if configured
    const logChannel = db.getGuild(guildId)?.log_channel;
    if (logChannel) {
      const channel = interaction.guild.channels.cache.get(logChannel);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  }
}

class MuteCommand extends Command {
  constructor() {
    super('mute', {
      description: 'Mute a user for a duration',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason';
    const guildId = interaction.guild.id;
    const db = new Database();

    if (!target) return interaction.reply({ content: 'Please provide a user.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot mute yourself!', ephemeral: true });

    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ content: 'Invalid duration. Use formats like: 1d, 2h, 30m, 15s', ephemeral: true });

    const role = interaction.guild.roles.cache.find(r => r.name === 'Muted');
    let roleId = null;
    if (!role) {
      const newRole = await interaction.guild.roles.create({ name: 'Muted', reason: 'Auto-mute role', permissions: [] });
      roleId = newRole.id;
    } else {
      roleId = role.id;
    }

    await interaction.member.roles.add(roleId);
    const interval = setInterval(async () => {
      const member = interaction.guild.members.cache.get(target.id);
      if (member) {
        await member.roles.remove(roleId);
        clearInterval(interval);
        // Log unmute
        const caseId = `mute_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.logMod(guildId, caseId, target.id, interaction.user.id, 'UNMUTE', reason);
      }
    }, 5000);

    // Log mute
    const caseId = `mute_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.logMod(guildId, caseId, target.id, interaction.user.id, 'MUTE', reason, `${duration}s`);

    const embed = new interaction.client.EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🔇 User Muted')
      .setDescription(`**User:** ${target.username}\n**Duration:** ${formatDuration(duration)}\n**Reason:** ${reason}\n**Case:** ${caseId}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    const logChannel = db.getGuild(guildId)?.log_channel;
    if (logChannel) {
      const channel = interaction.guild.channels.cache.get(logChannel);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  }
}

class UnmuteCommand extends Command {
  constructor() {
    super('unmute', {
      description: 'Unmute a user',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    if (!target) return interaction.reply({ content: 'Please provide a user.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot unmute yourself!', ephemeral: true });

    const role = interaction.guild.roles.cache.find(r => r.name === 'Muted');
    if (!role) return interaction.reply({ content: 'No Muted role found.', ephemeral: true });

    const member = interaction.guild.members.cache.get(target.id);
    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ content: `${target.username} is not muted.`, ephemeral: true });
    }

    await member.roles.remove(role.id);
    const guildId = interaction.guild.id;
    const db = new Database();
    const caseId = `unmute_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.logMod(guildId, caseId, target.id, interaction.user.id, 'UNMUTE', 'Manual unmute');

    const embed = new interaction.client.EmbedBuilder()
      .setColor(0x27AE60)
      .setTitle('🔊 User Unmuted')
      .setDescription(`**User:** ${target.username}\n**Case:** ${caseId}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    const logChannel = db.getGuild(guildId)?.log_channel;
    if (logChannel) {
      const channel = interaction.guild.channels.cache.get(logChannel);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  }
}

class KickCommand extends Command {
  constructor() {
    super('kick', {
      description: 'Kick a member',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildId = interaction.guild.id;
    const db = new Database();

    if (!target) return interaction.reply({ content: 'Please provide a user.', ephemeral: true });
    if (!interaction.guild.members.cache.has(target.id)) {
      return interaction.reply({ content: 'This user is not in the server.', ephemeral: true });
    }
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot kick yourself!', ephemeral: true });

    await interaction.guild.members.kick(target);
    const caseId = `kick_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.logMod(guildId, caseId, target.id, interaction.user.id, 'KICK', reason);

    const embed = new interaction.client.EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('👢 Member Kicked')
      .setDescription(`**User:** ${target.username}\n**Reason:** ${reason}\n**Case:** ${caseId}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    const logChannel = db.getGuild(guildId)?.log_channel;
    if (logChannel) {
      const channel = interaction.guild.channels.cache.get(logChannel);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  }
}

class BanCommand extends Command {
  constructor() {
    super('ban', {
      description: 'Ban a member',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildId = interaction.guild.id;
    const db = new Database();

    if (!target) return interaction.reply({ content: 'Please provide a user.', ephemeral: true });
    if (!interaction.guild.members.cache.has(target.id)) {
      return interaction.reply({ content: 'This user is not in the server.', ephemeral: true });
    }
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot ban yourself!', ephemeral: true });

    await interaction.guild.members.ban(target, { reason });
    const caseId = `ban_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.logMod(guildId, caseId, target.id, interaction.user.id, 'BAN', reason);

    const embed = new interaction.client.EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🔨 Member Banned')
      .setDescription(`**User:** ${target.username}\n**Reason:** ${reason}\n**Case:** ${caseId}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    const logChannel = db.getGuild(guildId)?.log_channel;
    if (logChannel) {
      const channel = interaction.guild.channels.cache.get(logChannel);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  }
}

class UnbanCommand extends Command {
  constructor() {
    super('unban', {
      description: 'Unban a member',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    if (!target) return interaction.reply({ content: 'Please provide a user.', ephemeral: true });

    await interaction.guild.members.unban(target);
    const guildId = interaction.guild.id;
    const db = new Database();
    const caseId = `unban_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.logMod(guildId, caseId, target.id, interaction.user.id, 'UNBAN', 'Manual unban');

    const embed = new interaction.client.EmbedBuilder()
      .setColor(0x27AE60)
      .setTitle('✅ Member Unbanned')
      .setDescription(`**User:** ${target.username}\n**Case:** ${caseId}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    const logChannel = db.getGuild(guildId)?.log_channel;
    if (logChannel) {
      const channel = interaction.guild.channels.cache.get(logChannel);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  }
}

class PurgeCommand extends Command {
  constructor() {
    super('purge', {
      description: 'Delete messages',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const count = interaction.options.getInteger('count') || 10;
    if (count > 100) return interaction.reply({ content: 'Maximum 100 messages.', ephemeral: true });

    const messages = await interaction.channel.messages.fetch();
    const toDelete = messages.filter(m => !m.author?.bot).slice(0, count);
    if (toDelete.size === 0) {
      return interaction.reply({ content: 'No messages to delete.', ephemeral: true });
    }
    await interaction.channel.bulkDelete(count, true);
    const embed = new interaction.client.EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('🗑️ Messages Purged')
      .setDescription(`Deleted ${toDelete.size} messages.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

class TimeoutCommand extends Command {
  constructor() {
    super('timeout', {
      description: 'Timeout a user for a duration',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const target = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason';
    const guildId = interaction.guild.id;
    const db = new Database();

    if (!target) return interaction.reply({ content: 'Please provide a user.', ephemeral: true });
    if (!interaction.guild.members.cache.has(target.id)) {
      return interaction.reply({ content: 'This user is not in the server.', ephemeral: true });
    }
    if (target.id === interaction.user.id) return interaction.reply({ content: 'You cannot timeout yourself!', ephemeral: true });

    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ content: 'Invalid duration. Use formats like: 1d, 2h, 30m, 15s', ephemeral: true });

    const member = interaction.guild.members.cache.get(target.id);
    await member.timeout(duration * 1000, reason);

    const caseId = `timeout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.logMod(guildId, caseId, target.id, interaction.user.id, 'TIMEOUT', reason, `${duration}s`);

    const embed = new interaction.client.EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('⏸️ User Timed Out')
      .setDescription(`**User:** ${target.username}\n**Duration:** ${formatDuration(duration)}\n**Reason:** ${reason}\n**Case:** ${caseId}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    const logChannel = db.getGuild(guildId)?.log_channel;
    if (logChannel) {
      const channel = interaction.guild.channels.cache.get(logChannel);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    }
  }
}

class CaseListCommand extends Command {
  constructor() {
    super('caselist', {
      description: 'List all active mod cases for a user',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    if (!target) return interaction.reply({ content: 'Please provide a user.', ephemeral: true });
    const guildId = interaction.guild.id;
    const db = new Database();

    const cases = db.client.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ? AND active = 1').all(guildId, target.id);

    if (cases.length === 0) {
      return interaction.reply({ content: `No active cases found for ${target.username}.`, ephemeral: true });
    }

    const embed = new interaction.client.EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('📋 Active Cases for ' + target.username)
      .setDescription(cases.map(c => `**${c.type}** - ${c.reason}\nCase: \`${c.case_id}\`\nIssued: ${new Date(c.issued_at).toLocaleString()}`).join('\n\n'));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

class PurgeCacheCommand extends Command {
  constructor() {
    super('purgecache', {
      description: 'Clear cached mod logs for a guild',
      permissions: ['Moderator'],
      category: 'moderation',
      cooldown: 0,
    });
  }

  async execute(interaction) {
    if (!hasPermission(interaction.user, 'Moderator', interaction.member)) {
      return interaction.reply({ content: 'You need the Moderator role to use this.', ephemeral: true });
    }
    const db = new Database();
    const stmt = db.client.prepare('DELETE FROM mod_logs WHERE active = 0');
    const info = stmt.run();
    return interaction.reply({ content: `✅ Cleared ${info.changes} deleted logs.` });
  }
}

module.exports = [WarnCommand, MuteCommand, UnmuteCommand, KickCommand, BanCommand, UnbanCommand, PurgeCommand, TimeoutCommand, CaseListCommand, PurgeCacheCommand];