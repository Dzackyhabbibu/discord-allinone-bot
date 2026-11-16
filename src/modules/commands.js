class Command {
  constructor(name, options = {}) {
    this.name = name;
    this.description = options.description || name;
    this.aliases = options.aliases || [];
    this.permissions = options.permissions || [];
    this.cooldown = options.cooldown || 3000;
    this.category = options.category || 'general';
    this.data = {
      name,
      description: this.description,
      options: options.options || [],
      defaultMemberPermissions: options.permissions ? options.permissions.map(p => {
        const map = { ManageGuild: 'Administrator', Moderator: 'ManageMessages', KickMembers: 'KickMembers', BanMembers: 'BanMembers', ManageChannels: 'ManageChannels', ManageRoles: 'ManageRoles' };
        return map[p] || p;
      }) : null,
      contexts: options.contexts,
    };
  }

  configure({ description, aliases, permissions, cooldown, category }) {
    if (description) this.description = description;
    if (aliases) this.aliases = aliases;
    if (permissions) this.permissions = permissions;
    if (cooldown) this.cooldown = cooldown;
    if (category) this.category = category;
    return this;
  }

  async execute(interaction) {
    throw new Error('Command execute must be overridden');
  }
}

module.exports = Command;