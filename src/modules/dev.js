'use strict';

// Dev commands for bot owners
const { SlashCommandBuilder } = require('discord.js');
const { execSync } = require('child_process');
const Database = require('./core/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dev')
    .setDescription('Developer commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('eval')
        .setDescription('Run code')
        .addStringArgument('code').setRequired(true)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reload')
        .setDescription('Reload a module')
        .addStringArgument('module').setRequired(true)
    )
    .addSubcommand(subcommand =>
      subcommand.setName('ping').setDescription('Check bot latency')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('prune')
        .setDescription('Delete old logs')
        .addStringArgument('days').setRequired(false)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('git')
        .setDescription('Get git info')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'ping': {
        const resp = await interaction.reply({ content: 'Pong! 🔄', fetchReply: false });
        await resp.edit({ content: `Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms` });
        break;
      }
      case 'eval': {
        const code = interaction.options.getString('code');
        try {
          const result = await eval(code);
          const text = typeof result === 'string' ? result : require('util').inspect(result, { depth: 2 });
          await interaction.reply({ content: `\`\`\`js\n${text.slice(0, 1500)}\n\`\`\`` });
        } catch (err) {
          await interaction.reply({ content: `\`ERROR: ${err.message}\`` });
        }
        break;
      }
      case 'reload': {
        const moduleName = interaction.options.getString('module');
        try {
          delete require.cache[require.resolve(`./modules/${moduleName}`)];
          const mod = require(`./modules/${moduleName}`);
          interaction.reply({ content: `✅ Reloaded ${moduleName}.` });
        } catch (err) {
          await interaction.reply({ content: `\`ERROR: ${err.message}\`` });
        }
        break;
      }
      case 'prune': {
        const days = interaction.options.getString('days') || '30';
        const db = new Database();
        const cutoff = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
        const stmt = db.client.prepare('DELETE FROM mod_logs WHERE issued_at < ?');
        const info = stmt.run(cutoff);
        await interaction.reply({ content: `🔄 Pruned ${info.changes} old logs.` });
        break;
      }
      case 'git': {
        try {
          const branch = execSync('git branch --show-current').toString().trim();
          const hash = execSync('git rev-parse --short HEAD').toString().trim();
          const status = execSync('git status -s').toString().trim();
          await interaction.reply({ content: `📋 Branch: ${branch} | Commit: ${hash} | Untracked: ${status ? 'yes' : 'no'}` });
        } catch {
          await interaction.reply({ content: '⚠️ Not a git repository or git not found.' });
        }
        break;
      }
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  },
};