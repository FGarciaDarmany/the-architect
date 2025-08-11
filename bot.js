// === CONFIG & IMPORTS ===
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

// === DISCORD CLIENT ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel] // necesario para DMs en algunos entornos
});

const TOKEN = process.env.DISCORD_TOKEN;

// === KEEP-ALIVE WEB SERVER (Render) ===
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot activo ✅');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Keep-alive server escuchando en ${PORT}`);
});

// === AUTOPING (anti-sleep Render) ===
// Prioriza variable de entorno PING_URL. Si no, usa host externo de Render.
const renderHost = process.env.RENDER_EXTERNAL_HOSTNAME; // provisto por Render
const DEFAULT_PING =
  renderHost ? `https://${renderHost}` : 'https://the-architect-zu7k.onrender.com';
const PING_URL = process.env.PING_URL || DEFAULT_PING;

const AUTOPING_MS = 5 * 60 * 1000; // cada 5 minutos
setInterval(async () => {
  try {
    await fetch(PING_URL);
    console.log(`🔁 Autoping OK -> ${PING_URL}`);
  } catch (err) {
    console.error('⚠️ Error en autoping:', err.message);
  }
}, AUTOPING_MS);

// === HELPERS ===
function readIdsFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

async function buildUserList(ids, guild) {
  let out = [];
  for (const id of ids) {
    try {
      const member = await guild.members.fetch(id);
      const tag = `<@${id}>`;
      const name = member.displayName || member.user?.username || '—';
      out.push(`• ${tag} — ID: ${id} — Nombre: ${name}`);
    } catch {
      out.push(`• ID: ${id} — ⚠️ No encontrado en el servidor`);
    }
  }
  return out.join('\n');
}

async function sendLong(channel, content) {
  const limit = 1990;
  if (content.length <= limit) return channel.send(content);
  let start = 0;
  while (start < content.length) {
    const chunk = content.slice(start, start + limit);
    // envolvemos en bloque de código para legibilidad y evitar cortes raros
    await channel.send('```\n' + chunk + '\n```');
    start += limit;
  }
}

// === READY ===
client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
  console.log(`🔗 Autoping a: ${PING_URL}`);
});

// === COMMANDS ===
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Ignorar DMs para estos comandos (requieren guild)
  if (!message.guild) return;

  if (message.content.trim() === '!listapremium') {
    try {
      const ids = readIdsFile('PREMIUM.txt');
      if (ids.length === 0) {
        return message.channel.send('👑 **Lista de usuarios premium:**\n\n( Vacía )');
      }
      const body = await buildUserList(ids, message.guild);
      const header = '👑 **Lista de usuarios premium:**\n\n';
      await sendLong(message.channel, header + body);
    } catch (err) {
      console.error(err);
      message.channel.send('❌ Error al leer la lista de usuarios premium.');
    }
    return;
  }

  if (message.content.trim() === '!listafree') {
    try {
      const ids = readIdsFile('FREE.txt');
      if (ids.length === 0) {
        return message.channel.send('🆓 **Lista de usuarios free:**\n\n( Vacía )');
      }
      const body = await buildUserList(ids, message.guild);
      const header = '🆓 **Lista de usuarios free:**\n\n';
      await sendLong(message.channel, header + body);
    } catch (err) {
      console.error(err);
      message.channel.send('❌ Error al leer la lista de usuarios free.');
    }
    return;
  }
});

// === LOGIN ===
client.login(TOKEN);
