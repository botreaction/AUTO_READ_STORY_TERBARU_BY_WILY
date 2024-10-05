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

  client.ev.on("creds.update", saveCreds);

  return client;
}

WAStart();
