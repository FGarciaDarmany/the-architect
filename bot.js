// === CONFIGURACIÓN Y CONTROL DE HORARIO ===
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ahora = new Date();
const offsetParaguay = -3 * 60;
const utcOffset = ahora.getTimezoneOffset();
const ahoraParaguay = new Date(ahora.getTime() + (offsetParaguay - utcOffset) * 60000);
const dia = ahoraParaguay.getDate();
const hora = ahoraParaguay.getHours();
const minuto = ahoraParaguay.getMinutes();

console.log(`🕓 Hora Paraguay detectada: ${ahoraParaguay.toLocaleString("es-PY")}`);

const diaSemana = ahoraParaguay.getDay();
const esViernesTarde = diaSemana === 5 && (hora > 18 || (hora === 18 && minuto >= 0));
const esSabado = diaSemana === 6;
const esDomingoAntes1730 = diaSemana === 0 && (hora < 17 || (hora === 17 && minuto < 30));

if (esViernesTarde || esSabado || esDomingoAntes1730) {
  console.log("⛔ BOT APAGADO AUTOMÁTICAMENTE por fuera del horario permitido (Render Free Plan).\n");
  process.exit();
}

// === CLIENTE DISCORD ===
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

function moverUsuarioArchivo(usuarioTag, id, desde, hacia) {
  let contenido = fs.readFileSync(desde, 'utf8').split('\n').filter(Boolean);
  contenido = contenido.filter(line => !line.includes(id));
  fs.writeFileSync(desde, contenido.join('\n') + '\n');
  fs.appendFileSync(hacia, `${usuarioTag} | ID: ${id}\n`);
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  if (dia === 5 && hora === 17) {
    enviarRecordatorioPremium();
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || message.system) return;

  if (message.content === '!ping') {
    return message.reply('🏓 Pong!');
  }

  if (message.content === '!estado') {
    return message.reply(`\n\```ansi\n[0;32m✅ THE ARCHITECT FUNCIONANDO[0m\n[0;36mOnline y operativo dentro del horario permitido.[0m\n\````);
  }

  if (message.content.startsWith('!finprueba')) {
    if (message.channel.id !== CANAL_GESTION_ID) return;
    const userMention = message.mentions.members.first();
    if (!userMention) return message.reply('❌ Debes mencionar a un usuario. Ej: !finprueba @usuario');

    const matrixDM = `\n\```ansi\n[0;31m⛔ TU PERIODO DE PRUEBA HA FINALIZADO ⛔[0m\n\n[0;32mLa simulación terminó. Estás a punto de ser desconectado.[0m\n\n[0;36m💊 Elige: ¿seguir en la Matrix o despertar a la realidad?[0m\n\n👉 Desde ahora serás un [0;33mUSUARIO FREE[0m.\nPerderás acceso a los canales y servicios premium,\npero podrás seguir participando de los canales abiertos.\n\nPara volver a disfrutar del sistema premium, contactá a un admin.\n\````;

    try {
      await userMention.send(matrixDM);
      await userMention.roles.remove(PREMIUM_ROLE_ID);
      await userMention.roles.add(FREE_ROLE_ID);
      moverUsuarioArchivo(userMention.user.tag, userMention.id, PREMIUM_FILE, FREE_FILE);
      return message.reply(`✅ ${userMention.user.tag} ha sido notificado y pasó a ser usuario free.`);
    } catch (err) {
      console.error('❌ Error en !finprueba:', err);
      return message.reply('⚠️ Ocurrió un error al ejecutar el comando.');
    }
  }

  if (message.content.startsWith('!premium')) {
    if (message.channel.id !== CANAL_GESTION_ID) return;
    const userMention = message.mentions.members.first();
    if (!userMention) return message.reply('❌ Debes mencionar a un usuario. Ej: !premium @usuario');

    const dmPremium = `\n<:Morpheus:1396149050063196311>\n🔴 **Bienvenido a la élite Premium, ${userMention.user.username}!**\n\nComo diría Morfeo: *“Lo único que te ofrezco es la verdad, nada más.”*\n\nTomaste la pastilla roja. Has decidido salir de la Matrix. 🚀\nGracias por tu confianza, ahora desbloqueas proyecciones, herramientas de trading y sesiones exclusivas.\n\n📅 Tu acceso Premium estará activo hasta el día **10 del próximo mes**.\n🔁 Recuerda renovarlo el día **11** para no perder el acceso.\n\n¡Prepárate para ver hasta dónde llega la madriguera del conejo! 🐇`;

    try {
      await userMention.send(dmPremium);
      await userMention.roles.add(PREMIUM_ROLE_ID);
      await userMention.roles.remove(FREE_ROLE_ID);
      moverUsuarioArchivo(userMention.user.tag, userMention.id, FREE_FILE, PREMIUM_FILE);
      return message.reply(`✅ ${userMention.user.tag} fue ascendido a Premium y notificado por DM.`);
    } catch (err) {
      console.error('❌ Error en !premium:', err);
      return message.reply('⚠️ Ocurrió un error al ejecutar el comando.');
    }
  }

  if (message.content.startsWith('!finpremium')) {
    if (message.channel.id !== CANAL_GESTION_ID) return;
    const userMention = message.mentions.members.first();
    if (!userMention) return message.reply('❌ Debes mencionar a un usuario. Ej: !finpremium @usuario');

    const dmFinPremium = `\n\```ansi\n[0;33m🟡 TU CONEXIÓN PREMIUM HA FINALIZADO[0m\n\n[0;36m🧠 La simulación sigue... pero por ahora, vuelves al modo FREE.[0m\n\n[0;31m⏳ Has superado la fecha de renovación.[0m\n[0;37mLos privilegios de la élite han sido suspendidos.[0m\n\n[0;32m🚪 No te preocupes. Las puertas de la Matrix siguen abiertas para ti.[0m\n[0;36mCuando decidas regresar, contactá a un administrador.[0m\n\n[0;33m🧾 Mientras tanto, puedes seguir explorando los canales de libre acceso.[0m\n\````;

    try {
      await userMention.send(dmFinPremium);
      await userMention.roles.remove(PREMIUM_ROLE_ID);
      await userMention.roles.add(FREE_ROLE_ID);
      moverUsuarioArchivo(userMention.user.tag, userMention.id, PREMIUM_FILE, FREE_FILE);
      return message.reply(`⚠️ ${userMention.user.tag} ha sido degradado a usuario free.`);
    } catch (err) {
      console.error('❌ Error en !finpremium:', err);
      return message.reply('⚠️ Ocurrió un error al ejecutar el comando.');
    }
  }
});

client.on('guildMemberAdd', async (member) => {
  try {
    await member.roles.add(FREE_ROLE_ID);
    fs.appendFileSync(FREE_FILE, `${member.user.tag} | ID: ${member.id}\n`);

    const welcomeMessage = `<:Morpheus:1396149050063196311>\n\```ansi\n[0;32m✅ BIENVENIDO A LA MATRIX[0m\n\nAhora estás dentro, ${member.user.username}.\nSe te ha asignado el modo [0;33mFREE[0m. Tendrás acceso a los canales de libre participación.\n\nPara acceder a los servicios PREMIUM, debes contactar a un administrador.\n\n🧠 Puedes ver todos los beneficios premium aquí:\n🔗 https://discord.com/channels/1365307119058026497/1387443133641658378\n\nNos vemos dentro...\n\````;

    await member.send(welcomeMessage);
  } catch (error) {
    console.error(`❌ Error al dar la bienvenida a ${member.user.tag}:`, error);
  }
});

function enviarRecordatorioPremium() {
  const usuarios = fs.readFileSync(PREMIUM_FILE, 'utf8').split('\n').filter(Boolean);
  usuarios.forEach(async (linea) => {
    const match = linea.match(/ID: (\d+)/);
    if (!match) return;
    const id = match[1];
    try {
      const user = await client.users.fetch(id);
      const mensaje = `\n\```ansi\n[0;35m📢 RECORDATORIO PREMIUM[0m\n\n[0;32mTu acceso premium vence el día 10.[0m\n[0;36mRenová antes del 11 para mantener tus beneficios.[0m\n[0;33mGracias por seguir explorando la Matrix.[0m\n\````;
      await user.send(mensaje);
      console.log(`✅ Recordatorio enviado a ${user.tag}`);
    } catch (e) {
      console.error(`❌ No se pudo enviar recordatorio a ${id}:`, e.message);
    }
  });
}

client.login(process.env.DISCORD_TOKEN);

// === MANTENER EL BOT VIVO EN RENDER FREE ===
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('The Architect está operativo.\n');
}).listen(process.env.PORT || 3000, () => {
  console.log(`🧠 Servidor HTTP activo en el puerto ${process.env.PORT || 3000}`);
});
