const { GatewayIntentBits, Client, Collection, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Database = require('../../core/database');

class ModerationEvents {
  constructor(client) {
    this.client = client;
    this.db = new Database();
  }

  init() {
    this.client.on(Events.GuildDelete, this.onGuildDelete.bind(this));
    this.client.on(Events.ChannelDelete, this.onChannelDelete.bind(this));
    this.client.on(Events.ChannelCreate, this.onChannelCreate.bind(this));
    this.client.on(Events.GuildRoleDelete, this.onRoleDelete.bind(this));
    this.client.on(Events.GuildBanAdd, this.onGuildBanAdd.bind(this));
    this.client.on(Events.GuildMemberAdd, this.onMemberAdd.bind(this));
    this.client.on(Events.GuildMemberRemove, this.onMemberRemove.bind(this));
    this.client.on(Events.MessageDelete, this.onMessageDelete.bind(this));
    this.client.on(Events.MessageUpdate, this.onMessageUpdate.bind(this));
  }

  async onGuildDelete(guild) {
    const cfg = this.db.getGuild(guild.id);
    if (cfg && cfg.anti_nuke_whitelist) {
      this.client.logger?.warn?.('Anti-nuke: guild deleted');
    }
  }

  async onChannelDelete(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.client.logger?.warn?.(`[NUKE] Channel deleted: ${channel.name}`);
  }

  async onChannelCreate(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.client.logger?.info?.(`[NUKE] Channel created: ${channel.name}`);
  }

  async onRoleDelete(role) {
    const cfg = this.db.getGuild(role.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.client.logger?.warn?.(`[NUKE] Role deleted: ${role.name}`);
  }

  async onGuildBanAdd(guild, user) {
    const cfg = this.db.getGuild(guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.client.logger?.warn?.(`[NUKE] Ban: ${user.tag}`);
  }

  async onMemberAdd(member) {
    const cfg = this.db.getGuild(member.guild.id);
    if (cfg && cfg.welcome_channel) {
      const channel = member.guild.channels.cache.get(cfg.welcome_channel);
      if (channel) {
        const embed = new this.client.EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🎉 Welcome!')
          .setDescription(`Welcome to **${member.guild.name}**, ${member.user.tag}!`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `ID: ${member.id}` });
        channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
    // Verifier check
    this.checkVerifier(member);
  }

  async onMemberRemove(member) {
    const cfg = this.db.getGuild(member.guild.id);
    if (cfg && cfg.log_channel) {
      const channel = member.guild.channels.cache.get(cfg.log_channel);
      if (channel) {
        const embed = new this.client.EmbedBuilder()
          .setColor(0x99AAB5)
          .setTitle('👋 Member Left')
          .setDescription(`${member.user.tag} left the server.`)
          .addFields({ name: 'ID', value: member.id }, { name: 'Joined', value: member.joinedAt ? member.joinedAt.toLocaleString() : 'N/A' })
          .setFooter({ text: `Server: ${member.guild.name}` });
        channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }

  async onMessageDelete(message) {
    const cfg = this.db.getGuild(message.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    const channel = message.guild.channels.cache.get(cfg.log_channel);
    if (!channel) return;
    const embed = new this.client.EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🗑️ Message Deleted')
      .addFields({ name: 'Author', value: `${message.author.tag} (#${message.author.discriminator})`, inline: true }, { name: 'Channel', value: message.channel.name, inline: true }, { name: 'Content', value: message.content || '(empty)', inline: true })
      .setFooter({ text: `ID: ${message.author.id}` });
    channel.send({ embeds: [embed] }).catch(() => {});
  }

  async onMessageUpdate(oldMessage, newMessage) {
    const cfg = this.db.getGuild(newMessage.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    const channel = newMessage.guild.channels.cache.get(cfg.log_channel);
    if (!channel) return;
    const embed = new this.client.EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle('✏️ Message Edited')
      .addFields({ name: 'Author', value: `${newMessage.author.tag} (#${newMessage.author.discriminator})`, inline: true }, { name: 'Channel', value: newMessage.channel.name, inline: true }, { name: 'New Content', value: newMessage.content || '(empty)', inline: true }, { name: 'Old Content', value: oldMessage.content || '(empty)', inline: true })
      .setFooter({ text: `ID: ${newMessage.author.id}` });
    channel.send({ embeds: [embed] }).catch(() => {});
  }

  checkVerifier(member) {
    // Basic verifier flow
  }
}

module.exports = ModerationEvents;