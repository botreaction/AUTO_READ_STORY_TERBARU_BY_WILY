const {
  default: WAConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers, 
  fetchLatestWaWebVersion,
  MessageType,
  Mimetype
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require('readline');
const { Boom } = require("@hapi/boom");
const settings = require('./settings'); // Impor pengaturan

const pairingCode = process.argv.includes("--pairing-code");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

let startTime = Date.now(); // Waktu mulai untuk perhitungan uptime
let lastSessionCloseTime = 0; // Track the last session closure time

async function WAStart() {
  const { state, saveCreds } = await useMultiFileAuthState(settings.sessionPath); // Gunakan sessionPath dari settings.js
  const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => fetchLatestBaileysVersion());
  console.log(`menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`);

  const client = WAConnect({
    logger: pino({ level: "warn" }), // Atur level logger ke "warn"
    printQRInTerminal: !pairingCode,
    browser: Browsers[settings.browserPlatform](settings.browserName), // Gunakan pengaturan dari settings.js
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
            if (timeDiff <= settings.storyReadIntervalBasic) { 
              if (settings.autoReadStory) {
                try {
                  await client.readMessages([m.key]);
                  console.log(`Berhasil melihat status dari ${m.key.participant.split("@")[0]}`);
                } catch (error) {
                  if (settings.ignoreError) {
                    console.error('Error membaca status, melanjutkan...', error);
                  } else {
                    console.error('Error membaca status, bot berhenti...', error);
                    process.exit(); // Keluar dari proses jika ignoreError false
                  }
                }
              }
            }

            if (timeDiff <= settings.storyReadIntervalEmoji) { 
              if (settings.autoReadStoryEmoji) {
                // Auto-Baca Cerita dengan Emoji (dengan batasan maxTime)
                const maxTime = 5 * 60 * 1000; // 5 menit
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
                    if (settings.ignoreError) {
                      console.error('Error melihat status dengan emoji, melanjutkan...', error);
                    } else {
                      console.error('Error melihat status dengan emoji, bot berhenti...', error);
                      process.exit(); // Keluar dari proses jika ignoreError false
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Auto-Read Message Feature
      if (settings.autoReadMessage && !m.key.fromMe) { // Jika autoReadMessage benar dan pesan bukan dari bot itu sendiri
        try {
          await client.readMessages([m.key]);
          console.log(`Berhasil membaca pesan dari ${m.key.participant.split("@")[0]}`);
        } catch (error) {
          if (settings.ignoreError) {
            console.error('Error membaca pesan, melanjutkan...', error);
          } else {
            console.error('Error membaca pesan, bot berhenti...', error);
            process.exit(); // Keluar dari proses jika ignoreError false
          }
        }
      }

      // Auto Recording Feature
      if (settings.autoRecord && !m.key.fromMe) {
        try {
          // Assuming you want to record voice messages only
          if (m.message.audioMessage) {
            const media = await client.downloadMediaMessage(m);
            const buffer = media.buffer;
            const filename = `received_audio_${Date.now()}.mp3`;

            await client.sendMessage(m.key.remoteJid, buffer, MessageType.audio, { mimetype: Mimetype.mp4Audio, filename });
            console.log(`Berhasil merekam audio dan mengirimkannya kembali.`);
          }
        } catch (error) {
          if (settings.ignoreError) {
            console.error('Error merekam audio, melanjutkan...', error);
          } else {
            console.error('Error merekam audio, bot berhenti...', error);
            process.exit(); // Keluar dari proses jika ignoreError false
          }
        }
      }

      // Auto Reaction Feature (for Private Messages)
      if (settings.autoReactionPrivate && !m.key.fromMe && !m.key.remoteJid.endsWith('@g.us')) {
        try {
          const emojis = [
            "👍", "👏", "❤️", "😂", "😮", "🤩", "🥳"
          ];

          function getRandomEmoji() {
            const randomIndex = Math.floor(Math.random() * emojis.length);
            return emojis[randomIndex];
          }

          const randomEmoji = getRandomEmoji();
          await client.sendMessage(m.key.remoteJid, {
            react: { text: randomEmoji, key: m.key },
          }, { statusJidList: [m.key.participant] });
          console.log(`Berhasil bereaksi dengan emoji "${randomEmoji}" pada pesan pribadi`);
        } catch (error) {
          if (settings.ignoreError) {
            console.error('Error bereaksi dengan emoji, melanjutkan...', error);
          } else {
            console.error('Error bereaksi dengan emoji, bot berhenti...', error);
            process.exit(); // Keluar dari proses jika ignoreError false
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
        if (settings.noAntiRestart) { // Periksa settings.noAntiRestart
          console.log("Koneksi terputus, mencoba koneksi ulang...");
          WAStart();
        } else {
          console.log("Koneksi terputus, restart bot untuk melanjutkan");
          process.exit(); // Keluar dari proses jika noAntiRestart false
        }
      }
    });
  } else {
    console.log("Auto Online dinonaktifkan.");
  }

  // Auto Update Bio dengan Uptime
  if (settings.autoBioUptime) {
    console.log("Auto Update Bio Uptime diaktifkan.");
    setInterval(async () => {
      const uptime = getUptime();
      try {
        await client.updateProfileStatus(`Bot Aktif: ${uptime}`);
        console.log(`Bio berhasil diperbarui: ${uptime}`);
      } catch (error) {
        if (settings.ignoreError) {
          console.error('Error mengupdate bio, melanjutkan...', error);
        } else {
          console.error('Error mengupdate bio, bot berhenti...', error);
          process.exit(); // Keluar dari proses jika ignoreError false
        }
      }
    }, 10000); // Update bio setiap 10 detik
  } else {
    console.log("Auto Update Bio Uptime dinonaktifkan.");
  }

  // Auto Typing Feature
  if (settings.autoTyping) {
    console.log("Auto Typing diaktifkan.");
    client.ev.on("messages.upsert", async (chatUpdate) => {
      const m = chatUpdate.messages[0];
      if (!m.key.fromMe) {
        try {
          await client.sendPresenceUpdate("composing", m.key.remoteJid); // Simulasikan mengetik
          console.log(`Mengirimkan sinyal mengetik ke ${m.key.remoteJid}`);
        } catch (error) {
          if (settings.ignoreError) {
            console.error('Error mengirim sinyal mengetik, melanjutkan...', error);
          } else {
            console.error('Error mengirim sinyal mengetik, bot berhenti...', error);
            process.exit(); // Keluar dari proses jika ignoreError false
          }
        }
      }
    });
  } else {
    console.log("Auto Typing dinonaktifkan.");
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
