require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

// === CONTROL HORARIO RENDER ===
const ahora = new Date();
const offsetParaguay = -3 * 60;  // ← CORREGIDO AQUÍ
const utcOffset = ahora.getTimezoneOffset();
const ahoraParaguay = new Date(ahora.getTime() + (offsetParaguay - utcOffset) * 60000);
const dia = ahoraParaguay.getDate();
const hora = ahoraParaguay.getHours();
const minuto = ahoraParaguay.getMinutes();
const diaSemana = ahoraParaguay.getDay();

console.log(`🕓 Hora Paraguay detectada: ${ahoraParaguay.toLocaleString("es-PY")}`);

const esViernesTarde = diaSemana === 5 && (hora > 18 || (hora === 18 && minuto >= 0));
const esSabado = diaSemana === 6;
const esDomingoAntes1730 = diaSemana === 0 && (hora < 17 || (hora === 17 && minuto < 30));
if (esViernesTarde || esSabado || esDomingoAntes1730) {
  console.log("⛔ BOT APAGADO AUTOMÁTICAMENTE por fuera del horario permitido (Render Free Plan).\n");
  process.exit();
}

// === DISCORD CLIENT ===
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

function moverUsuarioArchivo(usuarioTag, id, desde, hacia) {
  let contenido = fs.readFileSync(desde, 'utf8').split('\n').filter(Boolean);
  contenido = contenido.filter(line => !line.includes(id));
  fs.writeFileSync(desde, contenido.join('\n') + '\n');
  fs.appendFileSync(hacia, `${usuarioTag} | ID: ${id}\n`);
}

client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  if (dia === 6 && hora === 12 && minuto >= 30 && minuto < 35) {
    await enviarRecordatorioPremium();
  }
});

async function enviarRecordatorioPremium() {
  const usuarios = fs.readFileSync(PREMIUM_FILE, 'utf8').split('\n').filter(Boolean);
  const canal = await client.channels.fetch(CANAL_REPORTE_ID);
  const notificados = [];

  const mensaje = `\`\`\`ansi
[0;35m📢 RECORDATORIO PREMIUM[0m

[0;32mTu acceso premium vence el día 10.[0m
[0;36mRenová antes del 11 para mantener tus beneficios.[0m
[0;33mGracias por seguir explorando la Matrix.[0m
\`\`\``;

  for (const linea of usuarios) {
    const match = linea.match(/ID: (\d+)/);
    if (!match) continue;
    const id = match[1];
    try {
      const user = await client.users.fetch(id);
      await user.send(mensaje);
      notificados.push(user.tag);
    } catch (e) {
      console.error(`❌ No se pudo enviar recordatorio a ${id}:`, e.message);
    }
  }

  try {
    const admin = await client.users.fetch(ADMIN_ID);
    await admin.send(mensaje);
    notificados.push('(Administrador)');
    await canal.send(`✅ Recordatorio premium enviado hoy a:\n- ${notificados.join('\n- ')}`);
  } catch (e) {
    console.error("❌ Error al enviar el resumen o mensaje al administrador:", e.message);
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || message.system) return;

  if (message.content === '!ping') {
    return message.reply('🏓 Pong!');
  }

  if (message.content === '!estado') {
    return message.reply(`\`\`\`ansi
[0;32m✅ THE ARCHITECT FUNCIONANDO[0m
[0;36mOnline y operativo dentro del horario permitido.[0m
\`\`\``);
  }

  if (message.content === '!testrecordatorio') {
    if (message.author.id !== ADMIN_ID) return;
    await enviarRecordatorioPremium();
    return message.reply('✅ Recordatorio enviado manualmente.');
  }

  if (message.content === '!listapremium') {
    const lista = fs.readFileSync(PREMIUM_FILE, 'utf8').split('\n').filter(Boolean);
    return message.reply(`👑 Lista de usuarios premium:\n\n${lista.join('\n') || 'Vacía'}`);
  }

  if (message.content === '!listafree') {
    const lista = fs.readFileSync(FREE_FILE, 'utf8').split('\n').filter(Boolean);
    return message.reply(`📋 Lista de usuarios free:\n\n${lista.join('\n') || 'Vacía'}`);
  }

  if (message.content.startsWith('!renovar')) {
    const userMention = message.mentions.members.first();
    if (!userMention) return message.reply('❌ Debes mencionar a un usuario. Ej: !renovar @usuario');

    const mensajeUsuario = `<:Morpheus:1396149050063196311>
🔴 **Bienvenido nuevamente, ${userMention.user.username}!**

Tu acceso Premium ha sido renovado.
📅 Estará activo hasta el día **10 del próximo mes**.
🔁 Recuerda renovarlo el día **11** para no perder el acceso.

Gracias por seguir explorando la Matrix.`;

    try {
      await userMention.send(mensajeUsuario);
    } catch (e) {
      console.error(`❌ No se pudo enviar DM a ${userMention.user.tag}`);
    }

    moverUsuarioArchivo(userMention.user.tag, userMention.id, FREE_FILE, PREMIUM_FILE);
    await userMention.roles.add(PREMIUM_ROLE_ID);
    await userMention.roles.remove(FREE_ROLE_ID);

    return message.reply(`🔄 Acceso Premium renovado y notificado a ${userMention.user.tag}`);
  }

  if (message.content.startsWith('!finpremium')) {
    const userMention = message.mentions.members.first();
    if (!userMention) return message.reply('❌ Debes mencionar a un usuario. Ej: !finpremium @usuario');

    const mensajeUsuario = `<:Morpheus:1396149050063196311>
🟡 **Tu periodo premium ha finalizado, ${userMention.user.username}.**

🔒 A partir de ahora tu acceso será limitado.
📉 Has sido degradado al rol "Free".

Gracias por explorar la Matrix. Si deseas seguir con acceso completo, contacta a un administrador.`;

    try {
      await userMention.send(mensajeUsuario);
    } catch (e) {
      console.error(`❌ No se pudo enviar DM a ${userMention.user.tag}`);
    }

    moverUsuarioArchivo(userMention.user.tag, userMention.id, PREMIUM_FILE, FREE_FILE);
    await userMention.roles.add(FREE_ROLE_ID);
    await userMention.roles.remove(PREMIUM_ROLE_ID);

    return message.reply(`🔻 ${userMention.user.tag} ha sido degradado a rol FREE y fue notificado.`);
  }

  if (message.content === '!matrix') {
    const frases = [
      '💊 *La pastilla roja... te mostrará hasta dónde llega la madriguera del conejo.*',
      '🧠 *No es el despertar lo que da miedo, es lo que descubrís después.*',
      '🔻 *La Matrix es un sistema. Y ese sistema es tu enemigo.*',
      '👁️‍🗨️ *Despierta, Neo...*'
    ];
    const random = frases[Math.floor(Math.random() * frases.length)];
    return message.reply(random);
  }

  if (message.content === '!soporte') {
    const mensaje = `🧠 **Soporte y ayuda**

📘 Guía del servidor: https://discord.com/channels/1365307119058026497/1387443133641658378
🧾 Contacto administrador: <@1247253422961594409>
🕳️ Bienvenido a la Matrix.`;
    return message.author.send(mensaje);
  }
});

client.login(process.env.DISCORD_TOKEN);

// === MANTENER VIVO EN RENDER FREE ===
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('✅ The Architect está activo.\n');
}).listen(process.env.PORT || 10000, () => {
  console.log(`🧠 Servidor HTTP activo en el puerto ${process.env.PORT || 10000}`);
});

setInterval(() => {
  require('https').get('https://the-architect-ru7k.onrender.com');
  console.log("🔁 Autoping enviado para mantener activo el bot.");
}, 240000);
