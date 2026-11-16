const { GatewayIntentBits, Client, Collection, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionsBitField } = require('discord.js');
const Database = require('../../core/database');
const Command = require('../../modules/commands');
const { hasPermission } = require('../../modules/permission');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);

class CanvasService {
  generateRankCard(user, level, xp) {
    const canvas = createCanvas(400, 120);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2F3136';
    ctx.fillRect(0, 0, 400, 120);
    ctx.strokeStyle = '#5865F2';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, 398, 118);
    ctx.fillStyle = '#36393F';
    ctx.fillRect(10, 10, 380, 18);
    ctx.fillStyle = '#27AE60';
    const progress = Math.min(1, xp / 1000);
    ctx.fillRect(10, 10, 380 * progress, 18);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Level ${level}`, 15, 32);
    ctx.fillStyle = '#99AAB5';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${xp} XP`, 15, 52);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(user.username || 'Unknown', 15, 75);
    const avatar = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    loadImage(avatar).then(img => {
      ctx.drawImage(img, 300, 30, 70, 70);
    }).catch(() => {
      ctx.fillStyle = '#5865F2';
      ctx.beginPath();
      ctx.arc(335, 65, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px sans-serif';
      ctx.fillText('💎', 308, 60);
    });
    return canvas.toBuffer('image/png');
  }

  async generateProfileImage(user) {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 400, 400);
    gradient.addColorStop(0, '#5865F2');
    gradient.addColorStop(1, '#7289DA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);
    const avatar = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    loadImage(avatar).then(img => {
      ctx.drawImage(img, 130, 60, 140, 140);
    }).catch(() => {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(200, 130, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2F3136';
      ctx.font = '60px sans-serif';
      ctx.fillText('👤', 170, 150);
    });
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(user.username || 'Unknown', 200, 320);
    ctx.fillStyle = '#99AAB5';
    ctx.font = '24px sans-serif';
    ctx.fillText(`Level ${user.level}`, 200, 355);
    return canvas.toBuffer('image/png');
  }
}

class ProfileCardCommand extends Command {
  constructor(canvasService) {
    super('rankcard', {
      description: 'Generate a rank card',
      category: 'distinction',
      cooldown: 0,
    });
    this.canvasService = canvasService;
  }

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const data = this.db.getUser(interaction.guild.id, user.id);
    const level = data ? data.level : 0;
    const xp = data ? data.xp : 0;
    const card = this.canvasService.generateRankCard(user, level, xp);
    const buffer = await card;
    const filename = `rankcard_${user.id}.png`;
    const filePath = path.join(__dirname, '../../../data', filename);
    await writeFileAsync(filePath, buffer);
    await interaction.reply({
      content: `✅ Rank card for ${user.tag}!`,
      files: [{ attachment: filePath, name: filename }],
    });
  }

  get db() {
    return new Database();
  }
}

class RankCommand extends Command {
  constructor(canvasService) {
    super('rank', {
      description: 'Show rank card in chat',
      category: 'distinction',
      cooldown: 0,
    });
    this.canvasService = canvasService;
  }

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const data = this.db.getUser(interaction.guild.id, user.id);
    const level = data ? data.level : 0;
    const xp = data ? data.xp : 0;
    const card = this.canvasService.generateRankCard(user, level, xp);
    const buffer = await card;
    await interaction.reply({
      content: `🏆 ${user.tag}'s Rank Card`,
      files: [{ attachment: buffer, name: `rank_${user.id}.png` }],
    });
  }

  get db() {
    return new Database();
  }
}

class AnalyticsCommand extends Command {
  constructor() {
    super('analytics', {
      description: 'Show server analytics',
      category: 'distinction',
      permissions: ['Moderator'],
      cooldown: 10000,
    });
  }

  async execute(interaction) {
    const guild = interaction.guild;
    const db = this.db;
    const allUsers = db.client.prepare('SELECT * FROM users WHERE guild_id = ?').all(guild.id);
    const onlineUsers = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
    const totalXp = allUsers.reduce((acc, u) => acc + (u.xp || 0), 0);
    const totalCoins = allUsers.reduce((acc, u) => acc + (u.coins || 0), 0);
    const embed = new this.client.EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📈 Server Analytics')
      .addFields(
        { name: 'Total Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Online', value: `${onlineUsers}`, inline: true },
        { name: 'Total XP', value: `${totalXp}`, inline: true },
        { name: 'Total Coins', value: `${totalCoins}`, inline: true },
        { name: 'Top Level', value: `Level ${Math.max(...allUsers.map(u => u.level || 0))}`, inline: true }
      )
      .setFooter({ text: 'Analytics snapshot' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  get db() {
    return new Database();
  }
}

class ModLogsCommand extends Command {
  constructor() {
    super('modlogs', {
      description: 'Show mod logs (last 10)',
      category: 'moderation',
      permissions: ['Moderator'],
      cooldown: 5000,
    });
  }

  async execute(interaction) {
    const cases = this.db.client.prepare('SELECT type, reason, issued_at, active FROM mod_logs WHERE guild_id = ? AND active = 1 ORDER BY issued_at DESC LIMIT 10').all(interaction.guild.id);
    if (cases.length === 0) return interaction.reply({ content: 'No active mod cases.', ephemeral: true });
    const text = cases.map(c => `${c.type}: ${c.reason} (${new Date(c.issued_at).toLocaleString()}) [${c.active ? 'active' : 'closed'}]`).join('\n');
    await interaction.reply({ content: `📋 **Active Cases:**\n${text}`, ephemeral: true });
  }

  get db() {
    return new Database();
  }
}

class BackupCommand extends Command {
  constructor() {
    super('backup', {
      description: 'Backup server config',
      category: 'distinction',
      permissions: ['Administrator'],
      cooldown: 0,
    });
  }

  async execute(interaction) {
    const guild = interaction.guild;
    const data = {
      name: guild.name, id: guild.id, members: guild.memberCount,
      channels: guild.channels.cache.size, roles: guild.roles.cache.size,
      timestamp: new Date().toISOString(),
    };
    this.db.client.prepare('INSERT INTO server_backups (guild_id, data, timestamp) VALUES (?, ?, ?)').run(guild.id, JSON.stringify(data), new Date().toISOString());
    await interaction.reply({ content: `✅ Backup saved for ${guild.name}.` });
  }

  get db() {
    return new Database();
  }
}

class RestoreCommand extends Command {
  constructor() {
    super('restore', { description: 'Restore backup', category: 'distinction', permissions: ['Administrator'], cooldown: 0 });
  }

  async execute(interaction) {
    const backupId = interaction.options.getInteger('id');
    if (!backupId) return interaction.reply({ content: 'Usage: /restore <backup_id>', ephemeral: true });
    const backup = this.db.client.prepare('SELECT * FROM server_backups WHERE backup_id = ?').get(backupId);
    if (!backup) return interaction.reply({ content: 'Backup not found.', ephemeral: true });
    const data = JSON.parse(backup.data);
    await interaction.reply({ content: `✅ Restored backup from ${data.timestamp}`, ephemeral: true });
  }

  get db() {
    return new Database();
  }
}

module.exports = {
  name: 'distinction',
  commands: [ProfileCardCommand, RankCommand, AnalyticsCommand, ModLogsCommand, BackupCommand, RestoreCommand],
  events: [],
  services: { canvas: CanvasService },
};