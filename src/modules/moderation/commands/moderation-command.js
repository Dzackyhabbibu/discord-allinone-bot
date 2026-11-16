class ModerationCommands {
  constructor(client, db) {
    this.name = 'moderation';
    this.client = client;
    this.db = db;
  }

  register(commands) {
    return commands;
  }
}

module.exports = ModerationCommands;