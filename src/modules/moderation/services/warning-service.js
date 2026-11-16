const { EmbedBuilder, ActionsRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../../core/database');

class WarningService {
  constructor(db) {
    this.db = db;
  }

  async warn(interaction, userId, reason) {
    const guildId = interaction.guild.id;
    let user = this.db.getUser(guildId, userId);
    if (!user) {
      user = { id: userId, guild_id: guildId, username: '', discriminator: '', coins: 1000 };
      this.db.upsertUser(user, guildId);
    }
    const caseId = `warn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.db.logMod(guildId, caseId, userId, interaction.user.id, 'WARN', reason);
    const updated = { ...user, warn_points: (user.warn_points || 0) + 1 };
    this.db.upsertUser(updated, guildId);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('⚠️ User Warned')
      .addFields({ name: 'User', value: `${interaction.guild.members.cache.get(userId)?.user.tag || userId}`, inline: true }, { name: 'Case', value: caseId, inline: true }, { name: 'Points', value: (updated.warn_points || 1).toString(), inline: true }, { name: 'Reason', value: reason });
    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Log to mod log channel
    const logChannel = this.db.getGuild(guildId)?.log_channel;
    if (logChannel) {
      const ch = interaction.guild.channels.cache.get(logChannel);
      if (ch) await ch.send({ embeds: [embed] });
    }

    // Auto-punishment check
    const thresholds = { 3: '60s timeout', 5: '10m mute', 7: 'kick', 9: 'ban' };
    for (const [points, action] of Object.entries(thresholds)) {
      if ((updated.warn_points || 0) >= points) {
        await this.applyPunishment(interaction, userId, action, `Auto-punishment at ${points} warnings`);
        break;
      }
    }
    return updated.warn_points;
  }

  async applyPunishment(interaction, userId, action, reason) {
    const guild = interaction.guild;
    const member = guild.members.cache.get(userId);
    if (!member) return;
    const db = new Database();
    switch (action) {
      case '60s timeout':
        await member.timeout(60000, reason);
        db.logMod(guild.id, `timeout_${Date.now()}`, userId, interaction.user.id, 'TIMEOUT', reason);
        break;
      case '10m mute':
        // mute role
        const role = guild.roles.cache.find(r => r.name === 'Muted');
        if (role && !member.roles.cache.has(role.id))await member.roles.add(role);
        db.logMod(guild.id, `mute_${Date.now()}`, userId, interaction.user.id, 'MUTE', reason);
        break;
      case 'kick':
        if (member && !member.user.bot) await member.kick(reason);
        db.logMod(guild.id, `kick_${Date.now()}`, userId, interaction.user.id, 'KICK', reason);
        break;
      case 'ban':
        if (member && !member.user.bot) await member.ban({ reason });
        db.logMod(guild.id, `ban_${Date.now()}`, userId, interaction.user.id, 'BAN', reason);
        break;
    }
  }

  getCases(guildId, userId) {
    return this.db.client.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND user_id = ? AND active = 1 ORDER BY issued_at DESC').all(guildId, userId);
  }

  listAllCases(guildId) {
    return this.db.client.prepare('SELECT * FROM mod_logs WHERE guild_id = ? AND active = 1 ORDER BY issued_at DESC').all(guildId);
  }

  async closeCase(guildId, caseId) {
    return this.db.client.prepare('UPDATE mod_logs SET active = 0 WHERE guild_id = ? AND case_id = ?').run(guildId, caseId);
  }

  isBanned(guildId, userId) {
    const user = this.db.getUser(guildId, userId);
    return user?.ban_status === 'banned';
  }
}

module.exports = WarningService;