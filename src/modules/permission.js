const Permissions = require('discord.js').PermissionsBitField;

const PERMISSIONS = {
  ALL: ['ManageGuild', 'Administrator', 'ModerateMembers', 'KickMembers', 'BanMembers'],
  MOD: ['ManageGuild', 'Moderator', 'ModerateMembers', 'KickMembers', 'BanMembers'],
  ADMIN: ['ManageGuild', 'Administrator', 'ManageRoles', 'ManageChannels'],
  OWNER: ['ManageGuild', 'Administrator'],
  BOT: ['Administrator'],
};

function hasPermission(user, required = 'ALL', member) {
  const userPerms = new Permissions(user?.permissions ?? 0);
  if (userPerms.contains('Administrator')) return true;
  const requiredPerms = PERMISSIONS[required] || required;
  return requiredPerms.every(p => userPerms.contains(p));
}

function isMod(member) {
  const modRoles = ['Moderator', 'Admin', 'Triad', 'Owner'];
  if (!member) return false;
  return modRoles.some(role =>
    member.roles.cache.some(r => r.name === role || r.name.toLowerCase().includes(role.toLowerCase()))
  );
}

module.exports = { hasPermission, isMod };