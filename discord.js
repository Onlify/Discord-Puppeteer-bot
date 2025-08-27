import dotenv from "dotenv";
import {REST,
  Routes,
  Client,
  GatewayIntentBits, 
  Partials,
  Collection,
  PresenceUpdateStatus,
  Events} from "discord.js";
import fs from "fs";
import path from "path";

dotenv.config({quiet: true})

const deployCommands = async () =>{
  //Deploy command logic
}

//client instance

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMemebers,
  ],
  partials: [
    Partials.channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
})

