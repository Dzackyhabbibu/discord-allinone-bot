'use strict';

const { Client, Collection, GatewayIntentBits, ActivityType, Events, REST, Routes } = require('discord.js');
const { config } = require('./core/config');
const Database = require('./core/database');
const Logger = require('./core/logger');

class Bot {
  constructor() {
    this.logger = new Logger('info');
    this.db = new Database();
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildScheduledEvents,
      ],
    });
    this.commands = new Collection();
    this.modules = new Collection();
    this.cooldowns = new Collection();
    this.cooldownState = new Map();
    this.ready = false;
    this.initClientEvents();
  }

  initClientEvents() {
    this.client.once(Events.ClientReady, this.onReady.bind(this));
    this.client.once(Events.InteractionCreate, this.onInteractionCreate.bind(this));
    this.client.once(Events.GuildCreate, this.onGuildCreate.bind(this));
    this.client.once(Events.GuildBanAdd, this.onGuildBanAdd.bind(this));
    this.client.on(Events.MessageCreate, this.onMessageCreate.bind(this));
    this.client.on(Events.VoiceStateUpdate, this.onVoiceStateUpdate.bind(this));
    this.client.on(Events.GuildMessageDelete, this.onMessageDelete.bind(this));
    this.client.on(Events.GuildMessageUpdate, this.onMessageUpdate.bind(this));
  }

  onReady() {
    this.ready = true;
    this.logger.info(`Bot is ready! Logged in as ${this.client.user?.tag}`);
    this.client.user.setActivity('all modules | ready!', { type: ActivityType.Watching });
    this.initModules();
    this.deployCommands();
  }

  async onInteractionCreate(interaction) {
    // Music buttons
    if (interaction.isButton() && interaction.customId?.startsWith('music_')) {
      const sub = interaction.customId.split('_')[1];
      const musicService = this.modules.get('music')?.services?.music;
      if (!musicService) return interaction.reply({ content: 'Music module not available.', ephemeral: true });
      if (sub === 'play') {
        await musicService.play(interaction, []);
      } else if (sub === 'pause') {
        return musicService.pause(interaction);
      } else if (sub === 'skip') {
        return musicService.skip(interaction);
      }
      return interaction.update({ components: [] });
    }

    // Giveaway join buttons
    if (interaction.isButton() && interaction.customId?.startsWith('giveaway_join_')) {
      await interaction.answer({ type: 4 }).catch(() => {});
      return interaction.deferUpdate().catch(() => {});
    }

    // Ticket select menus
    if (interaction.isStringSelectMenu()) {
      const menu = interaction.customId;
      if (menu === 'ticket_category') {
        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: 0,
          reason: 'Ticket created via interaction',
        });
        await interaction.reply({ content: `🎫 Ticket created: #${channel.name}`, ephemeral: true });
      }
      return;
    }

    // Commands
    if (!interaction.isCommand()) return;
    const command = this.commands.get(interaction.commandName);
    if (!command) return;

    const cooldownKey = `${interaction.guildId || interaction.user.id}:${interaction.commandName}`;
    const last = this.cooldowns.get(cooldownKey) || 0;
    const elapsed = Date.now() - last;
    if (elapsed < command.cooldown) {
      const remaining = Math.ceil((command.cooldown - elapsed) / 1000);
      return interaction.reply({ content: `⏳ Please wait ${remaining}s before using this command again.`, ephemeral: true });
    }
    this.cooldowns.set(cooldownKey, Date.now());

    if (command.permissions && command.permissions.length > 0) {
      const has = await this.checkPermissions(interaction, command.permissions);
      if (!has) {
        return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      }
    }

    try {
      const result = await command.execute(interaction);
      return result;
    } catch (err) {
      this.logger.error('Command error', interaction.commandName, err);
      return interaction.reply({ content: '❌ An error occurred while executing this command.', ephemeral: true });
    }
  }

  async checkPermissions(interaction, permissions) {
    const member = interaction.member;
    const userPerms = member?.permissions;
    if (userPerms?.has('Administrator')) return true;
    const required = permissions.map(p => p);
    const hasAll = required.every(p => userPerms?.has(p) || false);
    return hasAll;
  }

  async onGuildCreate(guild) {
    this.logger.info(`New guild connected: ${guild.name} (${guild.id})`);
    const existing = this.db.getGuild(guild.id);
    if (!existing) {
      const defaultConfig = {
        guild_id: guild.id, prefix: '!', language: 'en', timezone: 'UTC',
        music_channel: null, welcome_channel: null, goodbye_channel: null,
        mod_channel: null, log_channel: null, role_verify_channel: null,
        role_verify_role: null, autorole_role: null, slowmode: 0, lockdown: 0,
        anti_nuke_whitelist: '', welcome_message: '', goodbye_message: '', guild_lang: 'en',
      };
      this.db.upsertGuild(guild.id, defaultConfig);
    }
  }

  onGuildBanAdd(guild, user) {
    const cfg = this.db.getGuild(guild.id);
    if (cfg?.anti_nuke_whitelist) {
      this.logger.warn(`[NUKE] Ban: ${user.tag} in ${guild.name}`);
    }
  }

  async onMessageCreate(message) {
    if (message.author?.bot) return;
    const guildId = message.guildId;
    const userId = message.author.id;
    const key = `${guildId}:${userId}`;
    const state = this.cooldownState.get(key) || new Map();
    const lastTime = state.get('last') || 0;
    const spamCount = state.get('count') || 0;
    if (Date.now() - lastTime > 1000) {
      state.set('last', Date.now());
      state.set('count', 0);
      this.cooldownState.set(key, state);
    }
    if (state.get('count') >= 5) {
      await message.delete().catch(() => {});
      this.logger.warn(`Auto-spam action: ${message.author.tag}`);
      state.set('count', 0);
    } else {
      state.set('count', (state.get('count') || 0) + 1);
    }

    // Module events
    const modules = this.modules.values();
    for (const mod of modules) {
      if (mod.events) {
        const events = Array.isArray(mod.events) ? mod.events : [mod.events];
        for (const ev of events) {
          // Events are registered via init in initModules
        }
      }
    }
  }

  async onVoiceStateUpdate(oldState, newState) {
    // handled by modules
  }

  async onMessageDelete(message) {
    const cfg = this.db.getGuild(message.guildId);
    if (cfg?.anti_nuke_whitelist) {
      this.logger.warn(`[NUKE] Message deleted in ${message.channel?.name}`);
    }
  }

  async onMessageUpdate(oldMessage, newMessage) {
    const cfg = this.db.getGuild(newMessage.guildId);
    if (cfg?.anti_nuke_whitelist) {
      this.logger.warn(`[NUKE] Message updated in ${newMessage.channel?.name}`);
    }
  }

  initModules() {
    const fs = require('fs');
    const path = require('path');
    const moduleFiles = fs.readdirSync(path.join(__dirname, 'modules')).filter(f => f.endsWith('.js'));
    for (const file of moduleFiles) {
      const modPath = path.join(__dirname, 'modules', file);
      const mod = require(modPath);
      if (mod && mod.name) {
        this.modules.set(mod.name, mod);
        this.logger.info(`Loaded module: ${mod.name}`);
      }
    }
  }

  async deployCommands() {
    const rest = new REST({ version: '10' }).setToken(config.bot.token);
    const commands = [];
    for (const mod of this.modules.values()) {
      if (mod.commands) {
        const cmds = Array.isArray(mod.commands) ? mod.commands : [mod.commands];
        for (const cmd of cmds) {
          if (cmd && cmd.name) commands.push(cmd);
        }
      }
    }
    try {
      console.log('🔄 Refreshing application commands...');
      const route = config.bot.guildId
        ? Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId)
        : Routes.applicationCommands(config.bot.clientId);
      await rest.put(route, { body: commands.map(c => ({
        name: c.data.name,
        description: c.data.description,
        options: c.data.options || [],
        defaultMemberPermissions: c.data.defaultMemberPermissions || null,
      })) });
      console.log(`✅ Deployed ${commands.length} commands.`);
    } catch (error) {
      this.logger.error('Failed to deploy commands', error);
    }
  }

  async start() {
    this.initModules();
    await this.client.login(config.bot.token);
    return this.client.login(config.bot.token);
  }
}

new Bot().start().catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
