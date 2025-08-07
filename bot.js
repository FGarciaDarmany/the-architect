require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
});

const TOKEN = process.env.DISCORD_TOKEN;

// === CONTROL HORARIO RENDER ===
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot activo');
});
server.listen(process.env.PORT || 3000);

// === BOT LISTO ===
client.once('ready', () => {
    console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // === COMANDO !listapremium ===
    if (message.content === '!listapremium') {
        try {
            const data = fs.readFileSync('PREMIUM.txt', 'utf8');
            const ids = data.split('\n').filter(Boolean);
            let lista = '👑 **Lista de usuarios premium:**\n\n';

            for (const id of ids) {
                try {
                    const member = await message.guild.members.fetch(id.trim());
                    const tag = `<@${id.trim()}>`;
                    const name = member.displayName;
                    lista += `• ${tag} — ID: ${id.trim()} — Nombre: ${name}\n`;
                } catch {
                    lista += `• ID: ${id.trim()} — ⚠️ No encontrado en el servidor\n`;
                }
            }

            message.channel.send(lista);
        } catch (err) {
            console.error(err);
            message.channel.send('❌ Error al leer la lista de usuarios premium.');
        }
    }

    // === COMANDO !listafree ===
    if (message.content === '!listafree') {
        try {
            const data = fs.readFileSync('FREE.txt', 'utf8');
            const ids = data.split('\n').filter(Boolean);
            let lista = '🆓 **Lista de usuarios free:**\n\n';

            for (const id of ids) {
                try {
                    const member = await message.guild.members.fetch(id.trim());
                    const tag = `<@${id.trim()}>`;
                    const name = member.displayName;
                    lista += `• ${tag} — ID: ${id.trim()} — Nombre: ${name}\n`;
                } catch {
                    lista += `• ID: ${id.trim()} — ⚠️ No encontrado en el servidor\n`;
                }
            }

            message.channel.send(lista);
        } catch (err) {
            console.error(err);
            message.channel.send('❌ Error al leer la lista de usuarios free.');
        }
    }
});

client.login(TOKEN);
