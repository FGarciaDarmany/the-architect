require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// === CONTROL DE ACTIVIDAD POR HORARIO ===
const ahora = new Date();

// Convertimos a horario GMT-3 (Paraguay)
const offsetParaguay = -3 * 60; // en minutos
const utcOffset = ahora.getTimezoneOffset();
const ahoraParaguay = new Date(ahora.getTime() + (offsetParaguay - utcOffset) * 60000);

const dia = ahoraParaguay.getDay(); // 0=Domingo, 5=Viernes, 6=Sábado
const hora = ahoraParaguay.getHours();
const minuto = ahoraParaguay.getMinutes();

console.log(`🕓 Hora Paraguay detectada: ${ahoraParaguay.toLocaleString("es-PY")}`);

const esViernesTarde = dia === 5 && (hora > 18 || (hora === 18 && minuto >= 0));
const esSabado = dia === 6;
const esDomingoAntes1730 = dia === 0 && (hora < 17 || (hora === 17 && minuto < 30));

if (esViernesTarde || esSabado || esDomingoAntes1730) {
  console.log("⛔ BOT APAGADO AUTOMÁTICAMENTE por fuera del horario permitido (Render Free Plan).");
  process.exit(); // Sale sin iniciar el bot
}

// === CONFIGURACIÓN DEL BOT ===
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

// === UTILIDAD PARA MOVER USUARIOS ENTRE ARCHIVOS ===
function moverUsuarioArchivo(usuarioTag, id, desde, hacia) {
  let contenido = fs.readFileSync(desde, 'utf8').split('\n').filter(Boolean);
  contenido = contenido.filter(line => !line.includes(id));
  fs.writeFileSync(desde, contenido.join('\n') + '\n');
  fs.appendFileSync(hacia, `${usuarioTag} | ID: ${id}\n`);
}

// === BOT CONECTADO ===
client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// === COMANDOS ===
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content === '!ping') {
    return message.reply('🏓 Pong!');
  }

  // !finprueba
  if (message.content.startsWith('!finprueba')) {
    if (message.channel.id !== CANAL_GESTION_ID) {
      return message.reply('⚠️ Este comando solo se puede usar en el canal de gestión.');
    }

    const userMention = message.mentions.members.first();
    if (!userMention) {
      return message.reply('❌ Debes mencionar a un usuario. Ej: `!finprueba @usuario`');
    }

    const matrixDM = `
\`\`\`ansi
[0;31m⛔ TU PERIODO DE PRUEBA HA FINALIZADO ⛔[0m

[0;32mLa simulación terminó. Estás a punto de ser desconectado.[0m

[0;36m💊 Elige: ¿seguir en la Matrix o despertar a la realidad?[0m

👉 Desde ahora serás un [0;33mUSUARIO FREE[0m. 
Perderás acceso a los canales y servicios premium,
pero podrás seguir participando de los canales abiertos.

Para volver a disfrutar del sistema premium, contactá a un admin.
\`\`\`
`;

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

  // !premium
  if (message.content.startsWith('!premium')) {
    if (message.channel.id !== CANAL_GESTION_ID) {
      return message.reply('⚠️ Este comando solo se puede usar en el canal de gestión.');
    }

    const userMention = message.mentions.members.first();
    if (!userMention) {
      return message.reply('❌ Debes mencionar a un usuario. Ej: `!premium @usuario`');
    }

    const dmPremium = `
<:Morpheus:1396149050063196311>
🔴 **Bienvenido a la élite Premium, ${userMention.user.username}!**

Como diría Morfeo: *“Lo único que te ofrezco es la verdad, nada más.”*

Tomaste la pastilla roja. Has decidido salir de la Matrix. 🚀  
Gracias por tu confianza, ahora desbloqueas proyecciones, herramientas de trading y sesiones exclusivas.

📅 Tu acceso Premium estará activo hasta el día **10 del próximo mes**.  
🔁 Recuerda renovarlo el día **11** para no perd
