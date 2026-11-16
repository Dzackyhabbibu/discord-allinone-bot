const sqlite = require('better-sqlite3');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

class Database {
  constructor(dataDir = './data') {
    this.client = sqlite(path.join(dataDir, process.env.DB_PATH || 'bot.sqlite'), { verbose: console.log });
    this.ensureTables();
  }

  ensureTables() {
    this.client.exec(`
      CREATE TABLE IF NOT EXISTS guilds (
        guild_id TEXT PRIMARY KEY,
        prefix TEXT DEFAULT '!',
        language TEXT DEFAULT 'en',
        timezone TEXT DEFAULT 'UTC',
        music_channel TEXT,
        welcome_channel TEXT,
        goodbye_channel TEXT,
        mod_channel TEXT,
        log_channel TEXT,
        role_verify_channel TEXT,
        role_verify_role TEXT,
        autorole_role TEXT,
        slowmode INTEGER DEFAULT 0,
        lockdown BOOLEAN DEFAULT 0,
        anti_nuke_whitelist TEXT DEFAULT '',
        welcome_message TEXT,
        goodbye_message TEXT,
        guild_lang TEXT DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.client.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        guild_id TEXT,
        username TEXT,
        discriminator TEXT,
        global_name TEXT,
        coins INTEGER DEFAULT 1000,
        last_daily TIMESTAMP,
        last_voice TIMESTAMP,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        voice_time TIMESTAMP,
        last_msg TIMESTAMP,
        warn_points INTEGER DEFAULT 0,
        timeout_until TIMESTAMP,
        last_work TIMESTAMP,
        inventory TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(guild_id) REFERENCES guilds(guild_id)
      )
    `);

    this.client.exec(`
      CREATE TABLE IF NOT EXISTS mod_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        case_id TEXT UNIQUE,
        user_id TEXT,
        moderator_id TEXT,
        type TEXT,
        reason TEXT,
        duration TEXT,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN DEFAULT 1
      )
    `);

    this.client.exec(`
      CREATE TABLE IF NOT EXISTS anti_nuke_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        action TEXT,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rollback_done BOOLEAN DEFAULT 0
      )
    `);

    this.client.exec(`
      CREATE TABLE IF NOT EXISTS server_backups (
        backup_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        data TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.client.exec(`
      CREATE TABLE IF NOT EXISTS commands_usage (
        usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        command TEXT,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // g = guild id
  getGuild(g) {
    const stmt = this.client.prepare('SELECT * FROM guilds WHERE guild_id = ?');
    return stmt.get(g);
  }

  upsertGuild(g, data) {
    const stmt = this.client.prepare('INSERT OR REPLACE INTO guilds (guild_id, prefix, language, timezone, music_channel, welcome_channel, goodbye_channel, mod_channel, log_channel, role_verify_channel, role_verify_role, autorole_role, slowmode, lockdown, anti_nuke_whitelist, welcome_message, goodbye_message, guild_lang) VALUES (@id, @prefix, @lang, @tz, @mc, @wc, @bc, @modc, @lc, @rvrc, @rvr, @ar, @sm, @lock, @wh, @wm, @bm, @gl)');
    const vars = {
      id: g, prefix: data.prefix || '!', language: data.language || 'en',
      timezone: data.timezone || 'UTC', music_channel: data.music_channel || null,
      welcome_channel: data.welcome_channel || null, goodbye_channel: data.goodbye_channel || null,
      mod_channel: data.mod_channel || null, log_channel: data.log_channel || null,
      role_verify_channel: data.role_verify_channel || null, role_verify_role: data.role_verify_role || null,
      autorole_role: data.autorole_role || null, slowmode: data.slowmode || 0,
      lockdown: data.lockdown || 0, anti_nuke_whitelist: data.anti_nuke_whitelist || '',
      welcome_message: data.welcome_message || '', goodbye_message: data.goodbye_message || '',
      guild_lang: data.guild_lang || 'en'
    };
    return stmt.run(vars);
  }

  getUser(guildId, userId) {
    const stmt = this.client.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?');
    return stmt.get(guildId, userId);
  }

  upsertUser(user, guildId) {
    const stmt = this.client.prepare('INSERT OR REPLACE INTO users (user_id, guild_id, username, discriminator, global_name, coins, last_daily, last_voice, xp, level, voice_time, last_msg, warn_points, timeout_until, last_work, inventory) VALUES (@uid, @gid, @uname, @disc, @gname, @coins, @last_daily, @last_voice, @xp, @level, @vtime, @last_msg, @warn, @timeout, @last_work, @inv)');
    const vars = {
      uid: user.id, gid: guildId, uname: user.username, discriminator: user.discriminator,
      gname: user.globalName || null, coins: user.coins || 1000, last_daily: null,
      last_voice: null, xp: user.xp || 0, level: user.level || 0, voice_time: null,
      last_msg: null, warn_points: user.warn_points || 0, timeout_until: null,
      last_work: null, inventory: user.inventory || '{}'
    };
    return stmt.run(vars);
  }

  logMod(guildId, caseId, userId, moderatorId, type, reason, duration) {
    const stmt = this.client.prepare('INSERT INTO mod_logs (guild_id, case_id, user_id, moderator_id, type, reason, duration) VALUES (?, ?, ?, ?, ?, ?, ?)');
    return stmt.run(guildId, caseId, userId, moderatorId, type, reason, duration);
  }

  close() {
    this.client.close();
  }
}

module.exports = Database;