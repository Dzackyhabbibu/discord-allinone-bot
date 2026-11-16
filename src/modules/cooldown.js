class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  add(userId, commandName, duration = 3000) {
    const key = `${userId}:${commandName}`;
    const now = Date.now();
    if (!this.cooldowns.has(key)) {
      this.cooldowns.set(key, []);
    }
    const cooldowns = this.cooldowns.get(key);
    const lastExecution = cooldowns[cooldowns.length - 1] || 0;
    if (now - lastExecution < duration) {
      return { allowed: false, remaining: duration - (now - lastExecution) };
    }
    cooldowns.push(now);
    if (cooldowns.length > 5) {
      cooldowns.shift();
    }
    return { allowed: true };
  }

  remove(userId, commandName) {
    this.cooldowns.delete(`${userId}:${commandName}`);
  }
}

module.exports = CooldownManager;