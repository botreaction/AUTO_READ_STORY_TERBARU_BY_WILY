const { createClient } = require("./client/client");
const { getWAVersion } = require("./client/waVersion");
const { initAuth } = require("./configs/auth");
const { handlePairing } = require("./configs/pairing");
const config = require("./configs/config");
const { handleMessagesUpsert } = require("./events/messageHandler");

const pairingCode =
  config.pairingNumber || process.argv.includes("--pairing-code");

async function WAStart() {
  const { state, saveCreds } = await initAuth();
  const { version, isLatest } = await getWAVersion();
  console.log(`Menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`);

  const client = createClient(state);

  if (pairingCode && !client.authState.creds.registered) {
    await handlePairing(client);
  }

  client.ev.on("messages.upsert", (chatUpdate) =>
    handleMessagesUpsert(client, chatUpdate),
  );

  if (config.autoOnline) {
    console.log("Auto Online diaktifkan.");
    client.ev.on("connection.update", async (update) => {
      const { connection } = update;
      if (connection === "open") {
        console.log("Terhubung ke Readsw");
        await client.sendPresenceUpdate("available", "status@broadcast"); // Atur kehadiran sebagai tersedia
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
