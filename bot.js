// === CONFIGURACIÓN Y CONTROL DE HORARIO ===
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ahora = new Date();
const offsetParaguay = -3 \* 60;
const utcOffset = ahora.getTimezoneOffset();
const ahoraParaguay = new Date(ahora.getTime() + (offsetParaguay - utcOffset) \* 60000);
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
intents: \[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.MessageContent
]
});

const FREE\_ROLE\_ID = process.env.FREE\_ROLE\_ID;
const PREMIUM\_ROLE\_ID = process.env.PREMIUM\_ROLE\_ID;
const CANAL\_GESTION\_ID = process.env.CANAL\_GESTION\_ID;
const PREMIUM\_FILE = path.join(\_\_dirname, 'PREMIUM.txt');
const FREE\_FILE = path.join(\_\_dirname, 'FREE.txt');
const ADMIN\_ID = '1247253422961594409';
const CANAL\_REPORTE\_ID = '1390767700707643493';

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
const usuarios = fs.readFileSync(PREMIUM\_FILE, 'utf8').split('\n').filter(Boolean);
const canal = await client.channels.fetch(CANAL\_REPORTE\_ID);
const notificados = \[];

const mensaje = `\n\\`\\`\\`ansi\n\[0;35m📢 RECORDATORIO PREMIUM\[0m\n\n\[0;32mTu acceso premium vence el día 10.\[0m\n\[0;36mRenová antes del 11 para mantener tus beneficios.\[0m\n\[0;33mGracias por seguir explorando la Matrix.\[0m\n\\`\\`\\\`\`;

for (const linea of usuarios) {
const match = linea.match(/ID: (\d+)/);
if (!match) continue;
const id = match\[1];
try {
const user = await client.users.fetch(id);
await user.send(mensaje);
notificados.push(user.tag);
} catch (e) {
console.error(`❌ No se pudo enviar recordatorio a ${id}:`, e.message);
}
}

try {
const admin = await client.users.fetch(ADMIN\_ID);
await admin.send(mensaje);
notificados.push('(Administrador)');

```
await canal.send(`✅ Recordatorio premium enviado hoy a:\n- ${notificados.join('\n- ')}`);
```

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
return message.reply(`\n\\`\\`\\`ansi\n\[0;32m✅ THE ARCHITECT FUNCIONANDO\[0m\n\[0;36mOnline y operativo dentro del horario permitido.\[0m\n\\`\\`\\\`\`);
}

if (message.content === '!testrecordatorio') {
if (message.author.id !== ADMIN\_ID) return;
await enviarRecordatorioPremium();
return message.reply('✅ Recordatorio enviado manualmente.');
}

if (message.content === '!listapremium') {
const lista = fs.readFileSync(PREMIUM\_FILE, 'utf8').split('\n').filter(Boolean);
return message.reply(`👑 Lista de usuarios premium:\n\n${lista.join('\n') || 'Vacía'}`);
}

if (message.content === '!listafree') {
const lista = fs.readFileSync(FREE\_FILE, 'utf8').split('\n').filter(Boolean);
return message.reply(`📋 Lista de usuarios free:\n\n${lista.join('\n') || 'Vacía'}`);
}

if (message.content.startsWith('!renovar')) {
const userMention = message.mentions.members.first();
if (!userMention) return message.reply('❌ Debes mencionar a un usuario. Ej: !renovar @usuario');

```
const mensaje = `<:Morpheus:1396149050063196311>\n🔴 **Bienvenido nuevamente, ${userMention.user.username}!**\n\nTu acceso Premium ha sido renovado.\n📅 Estará activo hasta el día **10 del próximo mes**.\n🔁 Recuerda renovarlo el día **11** para no perder el acceso.\n\nGracias por seguir explorando la Matrix.`;

await userMention.send(mensaje);
moverUsuarioArchivo(userMention.user.tag, userMention.id, FREE_FILE, PREMIUM_FILE);
await userMention.roles.add(PREMIUM_ROLE_ID);
await userMention.roles.remove(FREE_ROLE_ID);
return message.reply(`🔄 Acceso Premium renovado y notificado a ${userMention.user.tag}`);
```

}

if (message.content === '!matrix') {
const frases = \[
'💊 *La pastilla roja... te mostrará hasta dónde llega la madriguera del conejo.*',
'🧠 *No es el despertar lo que da miedo, es lo que descubrís después.*',
'🔻 *La Matrix es un sistema. Y ese sistema es tu enemigo.*',
'👁️‍🗨️ *Despierta, Neo...*'
];
const random = frases\[Math.floor(Math.random() \* frases.length)];
return message.reply(random);
}

if (message.content === '!soporte') {
const mensaje = \`🧠 **Soporte y ayuda**

📘 Guía del servidor: [https://discord.com/channels/1365307119058026497/1387443133641658378](https://discord.com/channels/1365307119058026497/1387443133641658378)
🧾 Contacto administrador: <@1247253422961594409>
🕳️ Bienvenido a la Matrix.\`;
return message.author.send(mensaje);
}
});

client.login(process.env.DISCORD\_TOKEN);

// === MANTENER EL BOT VIVO EN RENDER FREE ===
http.createServer((req, res) => {
res.writeHead(200, { 'Content-Type': 'text/plain' });
res.end('✅ The Architect está activo.\n');
}).listen(process.env.PORT || 10000, () => {
console.log(`🧠 Servidor HTTP activo en el puerto ${process.env.PORT || 10000}`);
});

setInterval(() => {
require('https').get('[https://the-architect-ru7k.onrender.com](https://the-architect-ru7k.onrender.com)');
console.log("🔁 Autoping enviado para mantener activo el bot.");
}, 240000);
