// === CONFIG & IMPORTS ===
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

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
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('✅ The Architect running');
});
server.listen(PORT, () => {
  console.log(`🌐 Keep-alive server escuchando en ${PORT}`);
});

// === AUTOPING (anti-sleep Render) ===
// Prioriza RENDER_EXTERNAL_URL (inyectada por Render). Si no, arma desde HOSTNAME.
// Si querés forzar manualmente, define AUTOPING_URL en Variables de Entorno.
const baseFromRenderUrl = (process.env.RENDER_EXTERNAL_URL || '').trim();
const baseFromHostname = (process.env.RENDER_EXTERNAL_HOSTNAME
  ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
  : '').trim();
const baseFromManual = (process.env.AUTOPING_URL || process.env.PING_URL || '').trim();

const BASE_URL = (baseFromRenderUrl || baseFromHostname || baseFromManual).replace(/\/$/, '');
const AUTOPING_URL = BASE_URL ? `${BASE_URL}/health` : '';

if (AUTOPING_URL) {
  console.log(`🔗 Autoping a: ${AUTOPING_URL}`);
  setInterval(() => {
    https.get(AUTOPING_URL, (res) => {
      if (res.statusCode === 200) {
        console.log(`🔁 Autoping OK -> ${AUTOPING_URL}`);
      } else {
        console.warn(`⚠️ Autoping status ${res.statusCode} -> ${AUTOPING_URL}`);
      }
    }).on('error', (err) => console.error('⚠️ Autoping error:', err.message));
  }, 240000); // cada 4 minutos
} else {
  console.log('ℹ️ Autoping desactivado (define RENDER_EXTERNAL_URL o RENDER_EXTERNAL_HOSTNAME o AUTOPING_URL).');
}

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
  const out = [];
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
    await channel.send('```\n' + chunk + '\n```');
    start += limit;
  }
}

// === READY ===
client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
  if (AUTOPING_URL) console.log(`🔗 Autoping a: ${AUTOPING_URL}`);

  // Fuerza presencia online
  client.user.setPresence({
    status: 'online',
    activities: [{ name: 'LIT + noticias en tiempo real', type: 3 }] // WATCHING
  });
});

// Logs de gateway para diagnosticar
client.on('shardDisconnect', (e, id) => console.warn(`🧩 Shard ${id} disconnected:`, e?.code));
client.on('shardError', (err, id) => console.error(`🧩 Shard ${id} error:`, err));
client.on('error', (err) => console.error('Client error:', err));
client.on('warn', (m) => console.warn('Warn:', m));

// === COMMANDS ===
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.guild) return; // comandos solo en servidores

  const txt = message.content.trim();

  if (txt === '!listapremium') {
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

  if (txt === '!listafree') {
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
if (!TOKEN) {
  console.error('❌ Falta DISCORD_TOKEN en variables de entorno.');
  process.exit(1);
}
client.login(TOKEN);
