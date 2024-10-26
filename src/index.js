const { createClient, getWAVersion } = require("./lib/client");
const { handleMessagesUpsert } = require("./events/messageHandler");
const { serialize } = require("./lib/serialize");
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
      const currentTime = Date.now();
      const messageTime = m.messageTimestamp * 1000;
      const timeDiff = currentTime - messageTime;

      if (timeDiff <= config.storyReadInterval) {
        if (settings.autoReadStory) {
          try {
            await client.readMessages([m.key]);
            console.log(
              `Berhasil melihat status dari ${m.key.participant.split("@")[0]}`,
            );
          } catch (error) {
            console.error("Error reading status:", error);
          }
        }

        // React to the status with a random emoji
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
    }

    if (config.autoReadMessage && !m.key.fromMe) {
      try {
        await client.readMessages([m.key]);
      } catch (error) {
        console.error("Error auto-reading message:", error);
      }
    }

    await handleMessagesUpsert(m, client, store);
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
