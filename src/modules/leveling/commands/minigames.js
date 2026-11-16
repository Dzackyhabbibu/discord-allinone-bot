'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Database = require('../../../core/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('minigame')
    .setDescription('Play casino mini-games with your coins')
    .addSubcommand(sub =>
      sub.setName('coinflip')
        .setDescription('Flip a coin')
        .addStringOption(o => o.setName('choice').setDescription('Heads or tails').setRequired(true).addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' }))
        .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('slots')
        .setDescription('Play the slot machine')
        .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const db = new Database();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    let user = db.getUser(guildId, userId);
    if (!user) {
      user = { id: userId, guild_id: guildId, coins: 1000, xp: 0, level: 0 };
      db.upsertUser(user, guildId);
    }

    const bet = interaction.options.getInteger('bet');
    if (bet <= 0 || (user.coins || 1000) < bet) {
      return interaction.reply({ content: '❌ Invalid bet or insufficient coins!', ephemeral: true });
    }

    if (sub === 'coinflip') {
      const choice = interaction.options.getString('choice');
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const win = choice === result;
      const payout = win ? bet * 2 : -bet;

      user.coins = (user.coins || 1000) + payout;
      db.upsertUser(user, guildId);

      const embed = new EmbedBuilder()
        .setColor(win ? 0x27AE60 : 0xE74C3C)
        .setTitle('🪙 Coinflip Result')
        .setDescription(`You chose **${choice}** and it landed on **${result}**!\n\n${win ? `🎉 You won **${bet * 2} coins**!` : `😢 You lost **${bet} coins**.`}`)
        .addFields({ name: 'New Balance', value: `${user.coins} coins` });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'slots') {
      const symbols = ['🍒', '🍋', '🔔', '⭐', '💎'];
      const r1 = symbols[Math.floor(Math.random() * symbols.length)];
      const r2 = symbols[Math.floor(Math.random() * symbols.length)];
      const r3 = symbols[Math.floor(Math.random() * symbols.length)];

      let multiplier = 0;
      if (r1 === r2 && r2 === r3) multiplier = 5;
      else if (r1 === r2 || r2 === r3 || r1 === r3) multiplier = 2;

      const payout = multiplier > 0 ? bet * multiplier : -bet;
      user.coins = (user.coins || 1000) + payout;
      db.upsertUser(user, guildId);

      const embed = new EmbedBuilder()
        .setColor(multiplier > 0 ? 0x27AE60 : 0xE74C3C)
        .setTitle('🎰 Slot Machine')
        .setDescription(`[ ${r1} | ${r2} | ${r3} ]\n\n${multiplier > 0 ? `🎉 Jackpots! Won **${bet * multiplier} coins** (${multiplier}x)!` : `😢 Lost **${bet} coins**.`}`)
        .addFields({ name: 'New Balance', value: `${user.coins} coins` });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
