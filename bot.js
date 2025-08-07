
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const FREE_ROLE_ID = process.env.FREE_ROLE_ID;
const PREMIUM_ROLE_ID = process.env.PREMIUM_ROLE_ID;
const CANAL_GESTION_ID = process.env.CANAL_GESTION_ID;
const PREMIUM_FILE = path.join(__dirname, 'PREMIUM.txt');
const FREE_FILE = path.join(__dirname, 'FREE.txt');
const ADMIN_ID = '1247253422961594409';
const CANAL_REPORTE_ID = '1390767700707643493';

client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || message.system) return;

  const MORPHEUS_EMOJI = '<:Morpheus:1396149050063196311>';

  if (message.content === '!listapremium') {
    const ids = fs.readFileSync(PREMIUM_FILE, 'utf8').split('\n').filter(Boolean);
    let respuesta = "👑 Lista de usuarios premium:\n\n";
    for (const id of ids) {
      try {
        const user = await client.users.fetch(id);
        const member = await message.guild.members.fetch(id);
        respuesta += `- @${user.username} | ID: ${id} | Nombre: ${member.displayName}\n`;
      } catch {
        respuesta += `- ID: ${id} (no encontrado)\n`;
      }
    }
    return message.reply(respuesta || "⚠️ Lista vacía.");
  }

  if (message.content === '!listafree') {
    const ids = fs.readFileSync(FREE_FILE, 'utf8').split('\n').filter(Boolean);
    let respuesta = "📋 Lista de usuarios free:\n\n";
    for (const id of ids) {
      try {
        const user = await client.users.fetch(id);
        const member = await message.guild.members.fetch(id);
        respuesta += `- @${user.username} | ID: ${id} | Nombre: ${member.displayName}\n`;
      } catch {
        respuesta += `- ID: ${id} (no encontrado)\n`;
      }
    }
    return message.reply(respuesta || "⚠️ Lista vacía.");
  }
});

client.login(process.env.DISCORD_TOKEN);
