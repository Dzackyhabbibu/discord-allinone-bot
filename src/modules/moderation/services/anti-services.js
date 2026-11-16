class AntispamService {
  constructor(db) {
    this.db = db;
    this.spamMap = new Map();
    this.threshold = 5;
    this.window = 10000;
  }

  inject(client) {
    this.client = client;
    this.client.on('messageCreate', this.check.bind(this));
  }

  check(message) {
    if (message.author?.bot || !message.guild) return;
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    if (!this.spamMap.has(key)) {
      this.spamMap.set(key, { count: 1, first: now, last: now });
      return;
    }
    const entry = this.spamMap.get(key);
    if (now - entry.first > this.window) {
      entry.count = 1;
      entry.first = now;
      entry.last = now;
      return;
    }
    entry.count++;
    entry.last = now;
    if (entry.count >= this.threshold && this.spamMap.get(key).last === entry.last) {
      this.trigger(message, entry.count);
      this.spamMap.delete(key);
    }
  }

  trigger(message, count) {
    const guild = message.guild;
    const channel = message.channel;
    const embed = new message.client.EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('⚠️ Anti-Spam Triggered')
      .setDescription(`**User:** ${message.author.tag}\n**Messages:** ${count}\n**Channel:** ${channel.name}\n**Guild:** ${guild.name}`);
    message.channel.send({ embeds: [embed] }).catch(() => {});
    this.bot?.logger?.warn?.(`[ANTISPAM] ${message.author.tag} spammed ${count} messages in ${channel.name}`);
  }

  setThreshold(threshold) {
    this.threshold = threshold;
  }

  setWindow(window, unit = 'ms') {
    this.window = unit === 's' ? window * 1000 : unit === 'm' ? window * 60000 : window;
  }
}

class AutoFilterService {
  constructor(db) {
    this.db = db;
    this.filterList = new Set();
    this.linkRegex = /https?:\/\/[^\s]+/gi;
    this.badWords = ['bad', 'words', 'here', 'example'];
  }

  inject(client) {
    this.client = client;
    this.client.on('messageCreate', this.check.bind(this));
  }

  check(message) {
    if (message.author?.bot || !message.guild) return;
    const cfg = this.db.getGuild(message.guild.id);
    if (!cfg || !cfg.autofilter_enabled) return;
    let filtered = false;
    const content = message.content.toLowerCase();
    for (const word of this.badWords) {
      if (content.includes(word.toLowerCase())) {
        message.delete().catch(() => {});
        filtered = true;
        break;
      }
    }
    if (this.linkRegex.test(message.content)) {
      message.delete().catch(() => {});
      filtered = true;
    }
    if (filtered) {
      this.bot?.logger?.info?.(`[AUTOFILTER] Filtered message in ${message.guild.name} (#${message.channel.name})`);
    }
  }

  addBadWord(word) {
    this.badWords.push(word.toLowerCase());
  }

  removeBadWord(word) {
    const idx = this.badWords.indexOf(word.toLowerCase());
    if (idx >= 0) this.badWords.splice(idx, 1);
  }

  loadConfig(cfg) {
    if (cfg.filter_words && typeof cfg.filter_words === 'string') {
      this.badWords = cfg.filter_words.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    }
  }
}

class VerifierService {
  constructor(db) {
    this.db = db;
    this.verifyFlow = true;
  }

  inject(client) {
    this.client = client;
    this.client.on('guildMemberAdd', this.check.bind(this));
  }

  check(member) {
    const cfg = this.db.getGuild(member.guild.id);
    if (!cfg || !cfg.verifier_enabled) return;
    if (cfg.verifier_channel) {
      const channel = member.guild.channels.cache.get(cfg.verifier_channel);
      if (channel) {
        channel.send(`Welcome ${member.user.tag}! Please verify to access the server.`).catch(() => {});
        // Reply with a verification message
      }
    }
  }
}

class SlowmodeService {
  constructor(db) {
    this.db = db;
    this.enabled = false;
    this.duration = 0;
  }

  inject(client) {
    this.client = client;
    this.client.on('messageCreate', this.check.bind(this));
  }

  check(message) {
    if (message.author?.bot || !message.guild) return;
    const cfg = this.db.getGuild(message.guild.id);
    if (!cfg || !cfg.slowmode_enabled || !cfg.slowmode) return;
    const user = this.userMap.get(message.author.id);
    if (user && user.lastMessage && Date.now() - user.lastMessage < cfg.slowmode * 1000) {
      message.delete().catch(() => {});
      this.bot?.logger?.info?.(`[SLOWMODE] Deleted message from ${message.author.tag} in ${message.channel.name}`);
      return;
    }
    this.userMap.set(message.author.id, { lastMessage: Date.now() });
  }

  enable(guildId, duration) {
    const cfg = this.db.getGuild(guildId);
    if (cfg) {
      this.db.upsertGuild(guildId, { slowmode: duration });
    }
    this.duration = duration;
    this.enabled = true;
  }

  disable(guildId) {
    const cfg = this.db.getGuild(guildId);
    if (cfg) {
      this.db.upsertGuild(guildId, { slowmode: 0 });
    }
    this.enabled = false;
    this.duration = 0;
  }
}

class LockdownService {
  constructor(db) {
    this.db = db;
    this.enabled = false;
  }

  inject(client) {
    this.client = client;
    this.client.on('guildRoleCreate', this.checkRole.bind(this));
    this.client.on('guildChannelCreate', this.checkChannel.bind(this));
  }

  checkRole(role) {
    const cfg = this.db.getGuild(role.guild.id);
    if (!cfg || !cfg.lockdown_enabled) return;
    this.bot?.logger?.warn?.(`[LOCKDOWN] Role created: ${role.name}`);
  }

  checkChannel(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.lockdown_enabled) return;
    this.bot?.logger?.warn?.(`[LOCKDOWN] Channel created: ${channel.name}`);
  }

  enable(guildId) {
    const cfg = this.db.getGuild(guildId);
    if (cfg) this.db.upsertGuild(guildId, { lockdown: 1 });
    this.enabled = true;
  }

  disable(guildId) {
    const cfg = this.db.getGuild(guildId);
    if (cfg) this.db.upsertGuild(guildId, { lockdown: 0 });
    this.enabled = false;
  }
}

class NukeService {
  constructor(db) {
    this.db = db;
    this.channelDeleteTracker = new Map();
    this.guildDeleteTracker = new Map();
    this.maxChannels = 10;
  }

  inject(client) {
    this.client = client;
    this.client.on('channelDelete', this.handleChannelDelete.bind(this));
    this.client.on('channelCreate', this.handleChannelCreate.bind(this));
    this.client.on('guildDelete', this.handleGuildDelete.bind(this));
    this.client.on('guildRoleDelete', this.handleRoleDelete.bind(this));
    this.client.on('guildBanAdd', this.handleGuildBanAdd.bind(this));
  }

  handleChannelDelete(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.channelDeleteTracker.has(channel.guild.id)) {
      this.channelDeleteTracker.set(channel.guild.id, []);
    }
    const tracker = this.channelDeleteTracker.get(channel.guild.id);
    tracker.push(channel.id);
    if (tracker.length >= this.maxChannels) {
      this.bot?.logger?.error?.(`[NUKE] Mass channel deletion in ${channel.guild.name}: ${tracker.length} deleted`);
      // Rollback would go here
      this.channelDeleteTracker.delete(channel.guild.id);
    }
  }

  handleChannelCreate(channel) {
    const cfg = this.db.getGuild(channel.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    if (!this.channelDeleteTracker.has(channel.guild.id)) {
      this.channelDeleteTracker.set(channel.guild.id, []);
    }
    const tracker = this.channelDeleteTracker.get(channel.guild.id);
    tracker.push(channel.id);
    if (tracker.length >= this.maxChannels) {
      tracker.splice(0, tracker.length - this.maxChannels + 1);
    }
  }

  handleGuildDelete(guild) {
    const cfg = this.db.getGuild(guild.id);
    if (cfg && cfg.anti_nuke_whitelist) {
      this.bot?.logger?.error?.(`[NUKE] Guild ${guild.name} deleted. Cannot rollback - use cloud backup.`);
    }
  }

  handleRoleDelete(role) {
    const cfg = this.db.getGuild(role.guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.bot?.logger?.warn?.(`[NUKE] Role deleted: ${role.name}`);
  }

  handleGuildBanAdd(guild, user) {
    const cfg = this.db.getGuild(guild.id);
    if (!cfg || !cfg.anti_nuke_whitelist) return;
    this.bot?.logger?.warn?.(`[NUKE] Ban added: ${user.tag}`);
    // Log ban
  }

  setMaxChannels(count) {
    this.maxChannels = count;
  }
}

module.exports = { AntispamService, AutoFilterService, VerifierService, SlowmodeService, LockdownService, NukeService };