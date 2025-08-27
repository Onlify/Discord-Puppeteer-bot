import { Client, Events, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Hola!');
  }
});


// Custom function to send a message
async function sendMessageToChannel(text) {
  try {
    const channel = await client.channels.fetch("1409862539889872999");

    if (!channel.isTextBased()) {
      console.log('This channel is not text-based.');
      return;
    }

    await channel.send(text);
    console.log('Message sent successfully!');
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

// Run this when bot is ready
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Example usage:
  await sendMessageToChannel('Hello! This is a custom message.');
  await sendMessageToChannel('Another message with different text!');
});

client.login("MTQwOTg1ODczMDY5MDA4NTAxNQ.GfQXnR.jbGAP8riMmsqMemEvIuEoExXqRcPBdCRVWMDhk");