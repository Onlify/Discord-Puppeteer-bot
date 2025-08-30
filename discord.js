// client.js
import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


export default client;