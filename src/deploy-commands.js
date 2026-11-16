'use strict';

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config } = require('./core/config');

class CommandDeployer {
  constructor() {
    this.commands = new Map();
  }

  loadModules(modules) {
    for (const mod of modules) {
      if (!mod || !mod.commands) continue;
      const cmds = Array.isArray(mod.commands) ? mod.commands : [mod.commands];
      for (const cmd of cmds) {
        if (!cmd || !cmd.name) continue;
        if (!cmd.data) {
          cmd.data = { name: cmd.name, description: cmd.description || 'No description' };
        }
        this.commands.set(cmd.name, cmd);
      }
    }
  }

  async deploy() {
    const commands = Array.from(this.commands.values());
    const rest = new REST({ version: '10' }).setToken(config.bot.token);
    try {
      console.log(`🔄 Refreshing application commands (${commands.length} commands)...`);
      const route = config.bot.guildId
        ? Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId)
        : Routes.applicationCommands(config.bot.clientId);
      const body = commands.map(c => ({
        name: c.data.name,
        description: c.data.description,
        options: c.data.options || [],
        defaultMemberPermissions: c.data.defaultMemberPermissions || null,
      }));
      await rest.put(route, { body });
      console.log(`✅ Deployed ${commands.length} commands.`);
    } catch (error) {
      console.error('❌ Failed to deploy commands:', error);
    }
  }

  static async main() {
    const deployer = new CommandDeployer();
    const moduleFiles = fs.readdirSync(path.join(__dirname, 'modules')).filter(f => f.endsWith('.js'));
    const modules = [];
    for (const file of moduleFiles) {
      try {
        const mod = require(path.join(__dirname, 'modules', file));
        if (mod && mod.name) modules.push(mod);
      } catch (err) {
        console.error(`Failed to load module ${file}:`, err.message);
      }
    }
    deployer.loadModules(modules);
    await deployer.deploy();
  }
}

if (require.main === module) {
  CommandDeployer.main().catch(console.error);
}

module.exports = CommandDeployer;
