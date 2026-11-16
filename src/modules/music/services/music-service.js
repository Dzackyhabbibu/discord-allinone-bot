// Music services
const Command = require('../../modules/commands');
const { hasPermission } = require('../../modules/permission');
const { GatewayIntentBits, Client, Collection, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Database = require('../../core/database');
const ytdl = require('ytdl-core');
const { Player } = require('discord-player');

class MusicService {
  constructor(client) {
    this.client = client;
    this.db = new Database();
    this.player = new Player(client, { searchTimeout: 10000 });
  }

  async play(message, args) {
    const guildId = message.guild.id;
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply({ content: 'You need to be in a voice channel!', ephemeral: true });
    const query = args.join(' ');
    try {
      const connection = await this.player.joinVoiceChannel({ channelId: voiceChannel.id, guildId });
      const results = await this.player.search(query, { requestedBy: message.author });
      const track = results.result;
      if (!track) return message.reply({ content: 'Song not found.', ephemeral: true });
      await this.player.addTrack(results, connection);
      const embed = new message.client.EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('▶️ Now Playing')
        .setDescription(track.title)
        .addFields({ name: 'Requested by', value: track.author?.tag || 'Unknown' }, { name: 'Duration', value: `${track.duration}` }, { name: 'Volume', value: `${this.player.getVolume(connection)}%` });
      await message.reply({ embeds: [embed], fetchReply: false });
      this.player.play(connection, track);
      return { success: true, track: track.title };
    } catch (err) {
      this.client.logger?.error?.(err);
      return message.reply({ content: 'Failed to play. Invalid URL?', ephemeral: true });
    }
  }

  async pause(message) {
    const connection = this.client.player.voiceConnections.get(message.guild.id);
    if (!connection) return message.reply({ content: 'Not connected.', ephemeral: true });
    connection.setPaused(true);
    return message.reply({ content: '⏸️ Paused.' });
  }

  async resume(message) {
    const connection = this.client.player.voiceConnections.get(message.guild.id);
    if (!connection) return message.reply({ content: 'Not connected.', ephemeral: true });
    connection.setPaused(false);
    return message.reply({ content: '▶️ Resumed.' });
  }

  async skip(message) {
    const connection = this.client.player.voiceConnections.get(message.guild.id);
    if (!connection) return message.reply({ content: 'Not connected.', ephemeral: true });
    this.player.stop(connection);
    return message.reply({ content: '⏭️ Skipped.' });
  }

  async stop(message) {
    const connection = this.client.player.voiceConnections.get(message.guild.id);
    if (!connection) return message.reply({ content: 'Not connected.', ephemeral: true });
    this.player.stop(connection);
    return message.reply({ content: '⏹️ Stopped.' });
  }

  async queue(message) {
    const connection = this.client.player.voiceConnections.get(message.guild.id);
    if (!connection) return message.reply({ content: 'Not connected.', ephemeral: true });
    const queue = this.player.getQueue(connection);
    if (!queue || !queue.trackList.length) return message.reply({ content: 'Queue is empty.', ephemeral: true });
    const lines = queue.trackList.slice(0, 10).map((t, i) => `${i + 1}. ${t.title} - ${t.author?.tag || 'Unknown'}`);
    const embed = new message.client.EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎵 Queue (${queue.trackList.length})`)
      .setDescription(lines.join('\n') || 'Empty');
    await message.reply({ embeds: [embed], fetchReply: false });
  }

  async nowplaying(message) {
    const connection = this.client.player.voiceConnections.get(message.guild.id);
    if (!connection) return message.reply({ content: 'Not connected.', ephemeral: true });
    const queue = this.player.getQueue(connection);
    if (!queue?.current) return message.reply({ content: 'Nothing playing.', ephemeral: true });
    const embed = new message.client.EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎵 Now Playing')
      .setDescription(queue.current.title)
      .addFields({ name: 'Channel', value: queue.current.author?.tag || 'Unknown' }, { name: 'Duration', value: `${queue.current.duration}` });
    message.reply({ embeds: [embed], fetchReply: false });
  }

  async volume(message) {
    const connection = this.client.player.voiceConnections.get(message.guild.id);
    if (!connection) return message.reply({ content: 'Not connected.', ephemeral: true });
    const newVol = Math.min(100, this.player.getVolume(connection) + 5);
    this.player.setVolume(connection, newVol);
    return message.reply({ content: `🔊 Volume set to ${newVol}%` });
  }

  async createButtons() {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('music_play').setLabel('Play').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('music_pause').setLabel('Pause').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('music_skip').setLabel('Skip').setStyle(ButtonStyle.Danger)
      );
    return row;
  }
}

class MusicCommands {
  async execute(interaction, musicService) {
    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case 'play':
        return musicService.play(interaction, interaction.options.getString('query') || interaction.options.getString('search') || '');
      case 'pause':
        return musicService.pause(interaction);
      case 'resume':
        return musicService.resume(interaction);
      case 'skip':
        return musicService.skip(interaction);
      case 'stop':
        return musicService.stop(interaction);
      case 'queue':
        return musicService.queue(interaction);
      case 'nowplaying':
        return musicService.nowplaying(interaction);
      case 'volume':
        return musicService.volume(interaction);
      default:
        return interaction.reply({ content: 'Unknown music command.', ephemeral: true });
    }
  }
}

class MusicEvents {
  constructor(client) {
    this.client = client;
    this.db = new Database();
    this.lastMsg = new Map();
  }

  init() {}

  onMessage(message) {
    if (message.author?.bot) return;
    const key = `${message.guild?.id}:${message.author?.id}`;
    if (message.createdAt - this.lastMsg.get(key) < 5000) return;
    this.lastMsg.set(key, message.createdAt);

    const cfg = this.db.getGuild(message.guild?.id);
    if (cfg && cfg.xp_system_enabled) {
      const xpManager = new (require('../leveling/services/economy-service')).EconomyService(this.db);
      xpManager.addCoins(message.guild.id, message.author.id, 5);
    }
  }
}

module.exports = {
  name: 'music',
  commands: [MusicCommands],
  events: [MusicEvents],
  services: { music: MusicService },
};