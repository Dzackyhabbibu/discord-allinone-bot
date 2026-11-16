require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const Database = require('../core/database');
const config = require('../core/config');
const { spawn } = require('child_process');

class Dashboard {
  constructor() {
    this.app = express();
    this.db = new Database();
    this.port = process.env.PORT || 3000;
    this.setupMiddleware();
    this.setupPassport();
    this.setupRoutes();
    this.setupStatic();
  }

  setupMiddleware() {
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'dashboard/views'));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());
    this.app.use(session({
      secret: config.dashboard.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    }));
    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  setupPassport() {
    passport.use(new Strategy({
      clientID: config.bot.clientId,
      clientSecret: config.dashboard.clientSecret,
      callbackURL: `${config.dashboard.url}/auth/discord/callback`,
      scope: ['identify', 'guilds'],
      passReqToCallback: true,
    }, (req, accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }));
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));
  }

  setupRoutes() {
    this.app.get('/', this.ensureAuth, this.renderDashboard);
    this.app.get('/auth/discord', passport.authenticate('discord'));
    this.app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
      res.redirect('/');
    });
    this.app.get('/logout', (req, res) => {
      req.logout(() => res.redirect('/'));
    });
    this.app.get('/guilds', this.ensureAuth, this.renderGuilds);
    this.app.get('/guild/:id', this.ensureAuth, this.renderGuild);
    this.app.get('/guild/:id/settings', this.ensureAuth, this.renderSettings);
    this.app.post('/guild/:id/settings', this.ensureAuth, this.updateSettings);
    this.app.get('/guild/:id/mod-log', this.ensureAuth, this.renderModLogs);
    this.app.get('/guild/:id/analytics', this.ensureAuth, this.renderAnalytics);
    this.app.get('/guild/:id/backup', this.ensureAuth, this.listBackups);
    this.app.post('/guild/:id/backup', this.ensureAuth, this.createBackup);
    this.app.get('/guild/:id/restore', this.ensureAuth, this.showRestore);
    this.app.post('/guild/:id/restore', this.ensureAuth, this.performRestore);
    this.app.get('/guild/:id/plugins', this.ensureAuth, this.renderPlugins);
    this.app.post('/guild/:id/plugins', this.ensureAuth, this.updatePlugins);
    this.app.get('/guild/:id/logs', this.ensureAuth, this.renderLogs);
  }

  setupStatic() {
    this.app.use('/dashboard/public', express.static(path.join(__dirname, 'dashboard/public')));
  }

  ensureAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
  }

  async renderDashboard(req, res) {
    res.render('dashboard', { user: req.user, guilds: [] });
  }

  async renderGuilds(req, res) {
    const dbGuilds = this.db.client.prepare('SELECT * FROM guilds ORDER BY created_at DESC').all();
    res.render('guilds', { user: req.user, guilds: dbGuilds });
  }

  async renderGuild(req, res) {
    const guild = this.db.client.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(req.params.id);
    const user = req.user;
    res.render('guild', { user, guild, isOwner: user.id === req.user.id });
  }

  async renderSettings(req, res) {
    const guild = this.db.client.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(req.params.id);
    res.render('settings', { user: req.user, guild });
  }

  async updateSettings(req, res) {
    const guildId = req.params.id;
    const data = req.body;
    this.db.upsertGuild(guildId, data);
    res.redirect(`/guild/${guildId}/settings`);
  }

  async renderModLogs(req, res) {
    const cases = this.db.client.prepare('SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY issued_at DESC LIMIT 50').all(req.params.id);
    res.render('mod-logs', { user: req.user, guildId: req.params.id, cases });
  }

  async renderAnalytics(req, res) {
    const guild = this.db.client.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(req.params.id);
    const allUsers = this.db.client.prepare('SELECT * FROM users WHERE guild_id = ?').all(req.params.id);
    const online = guild ? 0 : 0; // would need guild members
    const totalXp = allUsers.reduce((a, u) => a + (u.xp || 0), 0);
    const totalCoins = allUsers.reduce((a, u) => a + (u.coins || 0), 0);
    res.render('analytics', { user: req.user, guildId: req.params.id, totalXp, totalCoins, online });
  }

  async listBackups(req, res) {
    const backups = this.db.client.prepare('SELECT * FROM server_backups WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 10').all(req.params.id);
    res.render('backup-list', { user: req.user, guildId: req.params.id, backups });
  }

  async createBackup(req, res) {
    const guildId = req.params.id;
    const guild = this.db.client.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
    this.db.client.prepare('INSERT INTO server_backups (guild_id, data, timestamp) VALUES (?, ?, ?)').run(guildId, JSON.stringify(guild), new Date().toISOString());
    res.redirect(`/guild/${guildId}/backup`);
  }

  async showRestore(req, res) {
    const backups = this.db.client.prepare('SELECT * FROM server_backups WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 10').all(req.params.id);
    res.render('restore', { user: req.user, guildId: req.params.id, backups });
  }

  async performRestore(req, res) {
    const guildId = req.params.id;
    const backupId = req.body.backup_id;
    if (!backupId) return res.redirect(`/guild/${guildId}/restore`);
    const backup = this.db.client.prepare('SELECT * FROM server_backups WHERE guild_id = ? AND backup_id = ?').get(guildId, backupId);
    if (!backup) return res.redirect(`/guild/${guildId}/restore`);
    this.db.client.prepare('INSERT OR REPLACE INTO guilds (guild_id, prefix, language, welcome_channel, goodbye_message, anti_nuke_whitelist) VALUES (?, ?, ?, ?, ?, ?)').run(guildId, backup.guild_id, backup.prefix || '!', backup.language || 'en', backup.welcome_channel || null, backup.goodbye_message || '', backup.anti_nuke_whitelist || '');
    res.redirect(`/guild/${guildId}/settings`);
  }

  async renderPlugins(req, res) {
    const guildId = req.params.id;
    const plugins = [
      { name: 'antispam', label: 'Anti-Spam', default: true },
      { name: 'autofilter', label: 'Auto-Filter', default: true },
      { name: 'verifier', label: 'Verifier', default: false },
      { name: 'slowmode', label: 'Slowmode', default: false },
      { name: 'lockdown', label: 'Lockdown', default: false },
      { name: 'welcome', label: 'Welcome', default: true },
      { name: 'goodbye', label: 'Goodbye', default: true },
      { name: 'xp', label: 'XP System', default: true },
      { name: 'leveling', label: 'Leveling', default: true },
      { name: 'music', label: 'Music', default: true },
      { name: 'utility', label: 'Utility', default: true },
      { name: 'customization', label: 'Customization', default: true },
      { name: 'distinction', label: 'Distinction', default: true },
    ];
    res.render('plugins', { user: req.user, guildId, plugins });
  }

  async updatePlugins(req, res) {
    const guildId = req.params.id;
    const plugins = req.body.plugins || {};
    for (const [name, enabled] of Object.entries(plugins)) {
      if (enabled !== 'false') {
        this.db.upsertGuild(guildId, { [`enable_${name}`]: true });
      } else {
        this.db.upsertGuild(guildId, { [`enable_${name}`]: false });
      }
    }
    res.redirect(`/guild/${guildId}/plugins`);
  }

  async renderLogs(req, res) {
    const guildId = req.params.id;
    const logs = this.db.client.prepare('SELECT * FROM mod_logs WHERE guild_id = ? ORDER BY issued_at DESC LIMIT 50').all(guildId);
    res.render('logs', { user: req.user, guildId, logs });
  }

  async start() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      mkdirAsync(dataDir, { recursive: true });
    }

    this.app.listen(this.port, () => {
      console.log(`🎨 Dashboard running at http://localhost:${this.port}`);
    });
  }
}

module.exports = Dashboard;