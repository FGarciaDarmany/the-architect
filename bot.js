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
const ADMIN_ID = '1247253422961594409'; // Tu ID
const CANAL_REPORTE_ID = '1390767700707643493'; // Canal gestión

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

  const mensaje = `\n\`\`\`ansi\n[0;35m📢 RECORDATORIO PREMIUM[0m\n\n[0;32mTu acceso premium vence el día 10.[0m\n[0;36mRenová antes del 11 para mantener tus beneficios.[0m\n[0;33mGracias por seguir explorando la Matrix.[0m\n\`\`\``;

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
    // Enviarte el mismo recordatorio a vos
    const admin = await client.users.fetch(ADMIN_ID);
    await admin.send(mensaje);
    notificados.push('(Administrador)');

    await canal.send(`✅ Recordatorio premium enviado hoy a:\n- ${notificados.join('\n- ')}`);
  } catch (e) {
    console.error("❌ Error al enviar el resumen o mensaje al administrador:", e.message);
  }
}

// === RESTO DEL CÓDIGO (sin cambios) ===
// ... [NO MODIFIQUES ESTO - comandos !premium, !finprueba, etc. se mantienen]
// === FIN DE RESTO DEL CÓDIGO ===

client.login(process.env.DISCORD_TOKEN);

// === MANTENER EL BOT VIVO EN RENDER FREE ===
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
