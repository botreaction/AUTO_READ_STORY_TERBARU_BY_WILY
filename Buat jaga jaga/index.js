const {
  default: WAConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers, 
  fetchLatestWaWebVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require('readline');
const { Boom } = require("@hapi/boom");
const settings = require('./settings'); // Impor pengaturan

const pairingCode = process.argv.includes("--pairing-code");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

let startTime = Date.now(); // Start time for uptime calculation

async function WAStart() {
  const { state, saveCreds } = await useMultiFileAuthState("./sesi");
  const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => fetchLatestBaileysVersion());
  console.log(`menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`);

  const client = WAConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: !pairingCode,
    browser: Browsers.ubuntu("Chrome"),
    auth: state,
  });

  store.bind(client.ev);

  if (pairingCode && !client.authState.creds.registered) {
    const phoneNumber = await question(`Silahkan masukin nomor Whatsapp kamu: `);
    let code = await client.requestPairingCode(phoneNumber);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(`⚠︎ Kode Whatsapp kamu : ` + code)
  }

  client.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const m = chatUpdate.messages[0];
      if (!m.message) return;

      if (m.key && !m.key.fromMe && m.key.remoteJid === 'status@broadcast') {
        if (!m.message.reactionMessage) {
          const allowedSenders = [
            "6281447345627@s.whatsapp.net",
            "628145563553@s.whatsapp.net",
          ];

          if (!allowedSenders.includes(m.key.participant)) {
            const currentTime = Date.now();
            const messageTime = m.messageTimestamp * 1000;
            const timeDiff = currentTime - messageTime;

            // Periksa interval dan jalankan fungsi membaca status
            if (timeDiff <= settings.storyReadInterval) { 
              if (settings.autoReadStory) {
                try {
                  await client.readMessages([m.key]);
                  console.log(`Berhasil melihat status dari ${m.key.participant.split("@")[0]}`);
                } catch (error) {
                  console.error('Error', error);
                }
              }

              if (settings.autoReadStoryEmoji) {
                // Auto-Read Story with Emojis (with maxTime constraint)
                const maxTime = 5 * 60 * 1000; // 5 minutes
                if (timeDiff <= maxTime) {
                  const emojis = [
                    "🔥", "✨", "🤖", "🌟", "🌞", "🎉", "🎊", "😺"
                  ];

                  function getRandomEmoji() {
                    const randomIndex = Math.floor(Math.random() * emojis.length);
                    return emojis[randomIndex];
                  }

                  const randomEmoji = getRandomEmoji();
                  try {
                    await client.sendMessage("status@broadcast", {
                      react: { text: randomEmoji, key: m.key },
                    }, { statusJidList: [m.key.participant] });

                    console.log(`Berhasil melihat status dari ${m.key.participant.split("@")[0]} dengan emoji`);
                  } catch (error) {
                    console.error('Error', error);
                  }
                }
              }
            }
          }
        }
      }

      // Auto-Read Message Feature
      if (settings.autoReadMessage && !m.key.fromMe) { // If autoReadMessage is true and message is not from bot itself
        try {
          await client.readMessages([m.key]);
          console.log(`Berhasil membaca pesan dari ${m.key.participant.split("@")[0]}`);
        } catch (error) {
          console.error('Error', error);
        }
      }
    } catch (err) {
      console.log(err);
    }
  });

  // Fitur Auto-Online
  if (settings.autoOnline) {
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

  // Auto Update Bio with Uptime
  if (settings.autoBioUptime) {
    console.log("Auto Update Bio Uptime diaktifkan.");
    setInterval(async () => {
      const uptime = getUptime();
      try {
        await client.updateProfileStatus(`Bot Aktif: ${uptime}`);
        console.log(`Bio berhasil diperbarui: ${uptime}`);
      } catch (error) {
        console.error('Error updating bio:', error);
      }
    }, 10000); // Update bio every 10 seconds
  } else {
    console.log("Auto Update Bio Uptime dinonaktifkan.");
  }

  client.ev.on("creds.update", saveCreds);

  return client;
}

// Fungsi untuk menghitung uptime
function getUptime() {
  const elapsedTime = Date.now() - startTime;
  const days = Math.floor(elapsedTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((elapsedTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);

  return `${days} hari ${hours} jam ${minutes} menit ${seconds} detik`;
}

WAStart();
