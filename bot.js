// === CONFIG & IMPORTS ===
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const fsp = fs.promises;
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
  partials: [Partials.Channel]
});

const TOKEN = process.env.DISCORD_TOKEN;
const PREMIUM_ROLE_ID = process.env.PREMIUM_ROLE_ID || '';
const FREE_ROLE_ID = process.env.FREE_ROLE_ID || '';
// Lee ambos nombres por si el .env usa CANAL_GESTION_ID
const MGMT_CHANNEL_ID = process.env.MGMT_CHANNEL_ID || process.env.CANAL_GESTION_ID || '';

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
const baseFromRenderUrl = (process.env.RENDER_EXTERNAL_URL || '').trim();
const baseFromHostname = (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : '').trim();
const baseFromManual = (process.env.AUTOPING_URL || process.env.PING_URL || '').trim();
const BASE_URL = (baseFromRenderUrl || baseFromHostname || baseFromManual).replace(/\/$/, '');
const AUTOPING_URL = BASE_URL ? `${BASE_URL}/health` : '';
if (AUTOPING_URL) {
  console.log(`🔗 Autoping a: ${AUTOPING_URL}`);
  setInterval(() => {
    https.get(AUTOPING_URL, (res) => {
      if (res.statusCode === 200) console.log(`🔁 Autoping OK -> ${AUTOPING_URL}`);
      else console.warn(`⚠️ Autoping status ${res.statusCode} -> ${AUTOPING_URL}`);
    }).on('error', (err) => console.error('⚠️ Autoping error:', err.message));
  }, 240000);
} else {
  console.log('ℹ️ Autoping desactivado.');
}

// === HELPERS DE ARCHIVOS ===
const PREMIUM_FILE = path.join(__dirname, 'PREMIUM.txt');
const FREE_FILE = path.join(__dirname, 'FREE.txt');

async function ensureFile(file){ try{ await fsp.access(file);} catch{ await fsp.writeFile(file,'','utf8');}}
async function readSet(file){ await ensureFile(file); const txt = await fsp.readFile(file,'utf8'); return new Set(txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean));}
async function writeSet(file,set){ await fsp.writeFile(file, Array.from(set).join('\n') + (set.size?'\n':''), 'utf8');}

function readIdsFile(fileName){
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath,'utf8');
  return raw.split('\n').map(s=>s.trim()).filter(Boolean);
}

async function buildUserList(ids, guild){
  const out=[];
  for (const id of ids){
    try{
      const m = await guild.members.fetch(id);
      const tag = `<@${id}>`;
      const name = m.displayName || m.user?.username || '—';
      out.push(`• ${tag} — ID: ${id} — Nombre: ${name}`);
    }catch{
      out.push(`• ID: ${id} — ⚠️ No encontrado en el servidor`);
    }
  }
  return out.join('\n');
}

async function sendLong(channel, content){
  const limit = 1990;
  if (content.length <= limit) return channel.send(content);
  let start=0;
  while(start<content.length){
    const chunk = content.slice(start, start+limit);
    await channel.send('```\n'+chunk+'\n```');
    start += limit;
  }
}

// === HELPERS DE ROLES/IDS ===
function parseAllUserIdsFromMessage(message){
  const ids = new Set();
  if (message.mentions?.users?.size){ for (const u of message.mentions.users.values()) ids.add(u.id); }
  const text = message.content.replace(/<@!?(\d+)>/g,' $1 ');
  const idMatches = text.match(/\b\d{10,30}\b/g);
  if (idMatches) idMatches.forEach(m=>ids.add(m.trim()));
  return Array.from(ids);
}

function matrixDM(username){
  return (
`**⟡ 𝙈𝙖𝙩𝙧𝙞𝙭 // Estado de Acceso Actualizado**
\`\`\`ansi
[1mUsuario:[0m ${username}
[2mEstado:[0m [31mFREE ╳[0m
[2mMotivo:[0m [37mVencimiento de plan Premium[0m
\`\`\`
Has salido del modo Premium. 
• Pierdes acceso a los canales exclusivos.
• Puedes seguir en los canales públicos y volver a Premium cuando gustes.

_“Hay una diferencia entre conocer el camino y recorrer el camino.”_`
  );
}

async function getFreeRole(guild){
  if (FREE_ROLE_ID){
    const r = guild.roles.cache.get(FREE_ROLE_ID) || await guild.roles.fetch(FREE_ROLE_ID).catch(()=>null);
    if (r) return r;
  }
  const cached = guild.roles.cache.find(r=>r.name.toLowerCase()==='free');
  if (cached) return cached;
  const roles = await guild.roles.fetch();
  return roles.find(r=>r.name.toLowerCase()==='free') || null;
}

// === READY ===
client.once('ready', () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
  if (AUTOPING_URL) console.log(`🔗 Autoping a: ${AUTOPING_URL}`);
  client.user.setPresence({ status:'online', activities:[{ name:'LIT + noticias en tiempo real', type:3 }] });
});

// Logs de gateway
client.on('shardDisconnect',(e,id)=>console.warn(`🧩 Shard ${id} disconnected:`, e?.code));
client.on('shardError',(err,id)=>console.error(`🧩 Shard ${id} error:`, err));
client.on('error',(err)=>console.error('Client error:', err));
client.on('warn',(m)=>console.warn('Warn:', m));

// === COMMANDS ===
client.on('messageCreate', async message => {
  try{
    if (message.author.bot) return;
    if (!message.guild) return;

    const txt = message.content.trim();

    function restrictIfNeeded(){
      if (!MGMT_CHANNEL_ID) return false;
      if (message.channel.id !== MGMT_CHANNEL_ID){
        message.reply(`⚠️ Este comando solo puede usarse en <#${MGMT_CHANNEL_ID}>.`);
        return true;
      }
      return false;
    }

    // ======= !finpremium =======
    if (txt.toLowerCase().startsWith('!finpremium')){
      console.log('[CMD] finpremium recibido', { canal: message.channel.id, autor: message.author.id });
      if (restrictIfNeeded()) return;

      // Ack inmediato para que veas que entró
      const ack = await message.reply('⏳ Procesando fin de Premium...');

      const me = await message.guild.members.fetchMe();
      if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)){
        await ack.edit('❌ No tengo permisos para **Manage Roles**.');
        return;
      }

      const premiumRole = PREMIUM_ROLE_ID
        ? (message.guild.roles.cache.get(PREMIUM_ROLE_ID) || await message.guild.roles.fetch(PREMIUM_ROLE_ID).catch(()=>null))
        : null;
      if (!premiumRole){
        await ack.edit('❌ No encontré el **rol Premium** (revisa PREMIUM_ROLE_ID en `.env`).');
        return;
      }
      const freeRole = await getFreeRole(message.guild);
      if (!freeRole){
        await ack.edit('❌ No encontré el **rol Free** (configura FREE_ROLE_ID o crea un rol llamado "free").');
        return;
      }

      const ids = parseAllUserIdsFromMessage(message);
      if (ids.length === 0){
        await ack.edit('❌ No encontré IDs ni menciones. Ejemplos: `!finpremium 1017...`, `!finpremium @usuario`, o pega varias líneas con IDs.');
        return;
      }

      const premiumSet = await readSet(PREMIUM_FILE);
      const freeSet = await readSet(FREE_FILE);
      const results = [];

      for (const id of ids){
        if (results.find(r=>r.id===id)) continue;
        try{
          const member = await message.guild.members.fetch(id);
          try{
            if (member.roles.cache.has(premiumRole.id)) await member.roles.remove(premiumRole, 'Fin de Premium');
            if (!member.roles.cache.has(freeRole.id)) await member.roles.add(freeRole, 'Asignado rol Free tras fin de Premium');
          }catch(e){
            results.push({ id, tag: member.user.tag, status:'❌', note:'No pude cambiar roles (jerarquía/permisos).' });
            continue;
          }
          premiumSet.delete(id); freeSet.add(id);
          try{
            await member.send(matrixDM(member.user.tag));
            results.push({ id, tag: member.user.tag, status:'✅', note:'Roles ok + DM enviado' });
          }catch{
            results.push({ id, tag: member.user.tag, status:'⚠️', note:'Roles ok, DM cerrado' });
          }
          await new Promise(r=>setTimeout(r,400));
        }catch{
          results.push({ id, tag:'-', status:'❌', note:'Usuario no encontrado en el servidor' });
        }
      }

      await writeSet(PREMIUM_FILE, premiumSet);
      await writeSet(FREE_FILE, freeSet);

      const lines = results.map(r => `${r.status} <@${r.id}> (${r.id}) ${r.tag!=='-'?`— ${r.tag}`:''} — ${r.note}`);
      await ack.edit(`**Resultado fin de Premium (${results.length} usuario/s):**\n` + (lines.join('\n') || '—'));
      return;
    }

    // ======= !listapremium =======
    if (txt === '!listapremium'){
      try{
        const ids = readIdsFile('PREMIUM.txt');
        if (!ids.length) return message.channel.send('👑 **Lista de usuarios premium:**\n\n( Vacía )');
        const body = await buildUserList(ids, message.guild);
        await sendLong(message.channel, '👑 **Lista de usuarios premium:**\n\n' + body);
      }catch(err){ console.error(err); message.channel.send('❌ Error al leer la lista de usuarios premium.'); }
      return;
    }

    // ======= !listafree =======
    if (txt === '!listafree'){
      try{
        const ids = readIdsFile('FREE.txt');
        if (!ids.length) return message.channel.send('🆓 **Lista de usuarios free:**\n\n( Vacía )');
        const body = await buildUserList(ids, message.guild);
        await sendLong(message.channel, '🆓 **Lista de usuarios free:**\n\n' + body);
      }catch(err){ console.error(err); message.channel.send('❌ Error al leer la lista de usuarios free.'); }
      return;
    }
  }catch(e){
    console.error('messageCreate error:', e);
  }
});

// === LOGIN ===
if (!TOKEN) {
  console.error('❌ Falta DISCORD_TOKEN en variables de entorno.');
  process.exit(1);
}
client.login(TOKEN);
