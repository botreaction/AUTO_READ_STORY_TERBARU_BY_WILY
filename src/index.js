const { createClient, getWAVersion } = require("./lib/client");
const { handleMessagesUpsert } = require("./events/messageHandler");
const { serialize } = require("./lib/serialize");
const { getRandomEmoji } = require("./lib/emoji");
const config = require("./configs/config");

const pairingCode =
  config.pairingNumber || process.argv.includes("--pairing-code");

async function WAStart() {
  const { version, isLatest } = await getWAVersion();
  console.log(`Menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`);

  const { client, saveCreds, store } = await createClient();

  if (pairingCode && !client.authState.creds.registered) {
    const phoneNumber = await question(
      `Silahkan masukkan nomor WhatsApp kamu: `,
    );
    let code = await client.requestPairingCode(phoneNumber);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(`⚠︎ Kode WhatsApp kamu: ` + code);
    rl.close();
  }

  client.ev.on("messages.upsert", async ({ messages }) => {
    if (!messages[0].message) return;
    let m = await serialize(client, messages[0], store);

    if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0)
      store.groupMetadata = await client.groupFetchAllParticipating();

    if (m.key && !m.key.fromMe && m.key.remoteJid === "status@broadcast") {
      if (m.type === "protocolMessage" && m.message.protocolMessage.type === 0)
        return;
      await client.readMessages([m.key]);
      let id = m.key.participant;
      let name = client.getName(id);
      /*
			if (process.env.TELEGRAM_TOKEN && process.env.ID_TELEGRAM) {
				if (m.isMedia) {
					let media = await client.downloadMediaMessage(m);
					let caption = `Dari : https://wa.me/${id.split('@')[0]} (${name})${m.body ? `\n\n${m.body}` : ''}`;
					await sendTelegram(process.env.ID_TELEGRAM, media, { type: /audio/.test(m.msg.mimetype) ? 'document' : '', caption });
				} else await sendTelegram(process.env.ID_TELEGRAM, `Dari : https://wa.me/${id.split('@')[0]} (${name})\n\n${m.body}`);
			}
			*/
      try {
        const randomEmoji = getRandomEmoji();
        await client.sendMessage(
          "status@broadcast",
          { react: { text: randomEmoji, key: m.key } },
          { statusJidList: [m.key.participant] },
        );
      } catch (error) {
        console.error("Error sending emoji reaction:", error);
      }
    }

    await handleMessagesUpsert(client, store, m);
  });

  if (config.autoOnline) {
    console.log("Auto Online diaktifkan.");
    client.ev.on("connection.update", async (update) => {
      const { connection } = update;
      if (connection === "open") {
        console.log("Terhubung ke Readsw");
        await client.sendPresenceUpdate("available", "status@broadcast");
      } else if (connection === "close") {
        console.log("Koneksi terputus, mencoba koneksi ulang...");
        WAStart();
      }
    });
  } else {
    console.log("Auto Online dinonaktifkan.");
  }

  client.ev.on("creds.update", saveCreds);
}

WAStart();
