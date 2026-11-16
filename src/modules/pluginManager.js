class PluginManager {
  constructor() {
    this.disabled = new Set();
  }

  isEnabled(guildConfig, name) {
    return !this.disabled.has(name) && (!guildConfig || guildConfig[`enable_${name}`] !== false);
  }

  disable(name) {
    this.disabled.add(name);
  }

  enable(name) {
    this.disabled.delete(name);
  }

  toggle(name, guildConfig, enabled) {
    if (enabled === undefined) {
      this.disabled.delete(name);
      return true;
    }
    if (enabled) {
      this.disabled.delete(name);
    } else {
      this.disabled.add(name);
    }
    return true;
  }
}

module.exports = PluginManager;