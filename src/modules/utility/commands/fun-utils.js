'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Fun and utility commands')
    .addSubcommand(sub =>
      sub.setName('dadjoke')
        .setDescription('Get a random dad joke')
    )
    .addSubcommand(sub =>
      sub.setName('8ball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'dadjoke') {
      try {
        const res = await fetch('https://icanhazdadjoke.com/', { headers: { Accept: 'application/json' } });
        const data = await res.json();
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('👨 Dad Joke')
          .setDescription(data.joke || 'Why did the coffee file a police report? It got mugged.');
        return interaction.reply({ embeds: [embed] });
      } catch {
        return interaction.reply({ content: '😄 Why don\'t scientists trust atoms? Because they make up everything!', ephemeral: true });
      }
    }

    if (sub === '8ball') {
      const answers = ['It is certain.', 'Without a doubt.', 'Reply hazy, try again.', 'Ask again later.', 'Don\'t count on it.', 'My reply is no.', 'Outlook good.', 'Signs point to yes.'];
      const question = interaction.options.getString('question');
      const answer = answers[Math.floor(Math.random() * answers.length)];

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎱 Magic 8-Ball')
        .addFields(
          { name: 'Question', value: question },
          { name: 'Answer', value: answer }
        );
      return interaction.reply({ embeds: [embed] });
    }
  },
};
