if (message.content.startsWith('!finpremium')) {
  const userMention = message.mentions.members.first();
  if (!userMention) return message.reply('❌ Debes mencionar a un usuario. Ej: !finpremium @usuario');

  const mensajeUsuario = `<:Morpheus:1396149050063196311>
🔻 **Tu acceso Premium ha finalizado, ${userMention.user.username}.**

📅 Has superado la fecha de renovación.
⛔ Perderás el acceso a los canales exclusivos de The Architect.

🔁 Podés volver cuando estés listo para despertar de nuevo...

🧠 La Matrix continúa, pero ahora desde fuera.`;

  const mensajeAdmin = `\`\`\`ansi
[0;31m🔻 PREMIUM FINALIZADO[0m

[0;36mUsuario:[0m ${userMention.user.tag}
[0;33mEstado:[0m Degradado a FREE y notificado por DM.
\`\`\``;

  try {
    await userMention.send(mensajeUsuario);
    moverUsuarioArchivo(userMention.user.tag, userMention.id, PREMIUM_FILE, FREE_FILE);
    await userMention.roles.add(FREE_ROLE_ID);
    await userMention.roles.remove(PREMIUM_ROLE_ID);
    await message.reply(`⚠️ ${userMention.user.tag} fue degradado a Free y notificado.`);

    // ✅ Notificar en canal de gestión
    const canalGestion = await client.channels.fetch(CANAL_GESTION_ID);
    await canalGestion.send(`⚠️ ${userMention.user.tag} fue degradado de Premium a Free.`);

    // ✅ Notificar al administrador por DM
    const admin = await client.users.fetch(ADMIN_ID);
    await admin.send(mensajeAdmin);
  } catch (e) {
    console.error("❌ Error al finalizar premium:", e.message);
    return message.reply('❌ Ocurrió un error al intentar degradar al usuario.');
  }
}
