const config = require("./configs/config");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const { createClient, getWAVersion } = require("./lib/client");
const { handleMessagesUpsert } = require("./events/messageHandler");
const { serialize } = require("./lib/serialize");
const { getRandomEmoji } = require("./lib/emoji");
const { formatSize, parseFileSize, sendTelegram } = require("./lib/function");

const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");

const pairingCode =
  config.pairingNumber || process.argv.includes("--pairing-code");

const pathContacts = `./${config.session}/contacts.json`;
const pathMetadata = `./${config.session}/groupMetadata.json`;

async function WAStart() {
  const { version, isLatest } = await getWAVersion();
  console.log(`Menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`);

  const { client, saveCreds, store } = await createClient({
    session: config.session,
  });

  if (config.writeStore === "true")
    store.readFromFile(`./${config.session}/store.json`);

  if (pairingCode && !client.authState.creds.registered) {
    const phoneNumber = await question(
      `Silahkan masukkan nomor WhatsApp kamu: `,
    );
    let code = await client.requestPairingCode(phoneNumber);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(`⚠︎ Kode WhatsApp kamu: ` + code);
    rl.close();
  }

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

  // contacts
  if (fs.existsSync(pathContacts)) {
    store.contacts = JSON.parse(fs.readFileSync(pathContacts, "utf-8"));
  } else {
    fs.writeFileSync(pathContacts, JSON.stringify({}));
  }
  // group metadata
  if (fs.existsSync(pathMetadata)) {
    store.groupMetadata = JSON.parse(fs.readFileSync(pathMetadata, "utf-8"));
  } else {
    fs.writeFileSync(pathMetadata, JSON.stringify({}));
  }

  // add contacts update to store
  client.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = jidNormalizedUser(contact.id);
      if (store && store.contacts)
        store.contacts[id] = {
          ...(store.contacts?.[id] || {}),
          ...(contact || {}),
        };
    }
  });

  // add contacts upsert to store
  client.ev.on("contacts.upsert", (update) => {
    for (let contact of update) {
      let id = jidNormalizedUser(contact.id);
      if (store && store.contacts)
        store.contacts[id] = { ...(contact || {}), isContact: true };
    }
  });

  // nambah perubahan grup ke store
  client.ev.on("groups.update", (updates) => {
    for (const update of updates) {
      const id = update.id;
      if (store.groupMetadata[id]) {
        store.groupMetadata[id] = {
          ...(store.groupMetadata[id] || {}),
          ...(update || {}),
        };
      }
    }
  });

  // merubah status member
  client.ev.on("group-participants.update", ({ id, participants, action }) => {
    const metadata = store.groupMetadata[id];
    if (metadata) {
      switch (action) {
        case "add":
        case "revoked_membership_requests":
          metadata.participants.push(
            ...participants.map((id) => ({
              id: jidNormalizedUser(id),
              admin: null,
            })),
          );
          break;
        case "demote":
        case "promote":
          for (const participant of metadata.participants) {
            let id = jidNormalizedUser(participant.id);
            if (participants.includes(id)) {
              participant.admin = action === "promote" ? "admin" : null;
            }
          }
          break;
        case "remove":
          metadata.participants = metadata.participants.filter(
            (p) => !participants.includes(jidNormalizedUser(p.id)),
          );
          break;
      }
    }
  });

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

    if (config.self === "true" && !m.isOwner) return;

    await handleMessagesUpsert(client, store, m);
  });

  setInterval(async () => {
    // write contacts and metadata
    if (store.groupMetadata)
      fs.writeFileSync(pathMetadata, JSON.stringify(store.groupMetadata));
    if (store.contacts)
      fs.writeFileSync(pathContacts, JSON.stringify(store.contacts));

    // write store
    if (config.writeStore === "true")
      store.writeToFile(`./${config.session}/store.json`);

    // untuk auto restart ketika RAM sisa 300MB
    const memoryUsage = os.totalmem() - os.freemem();

    if (
      memoryUsage >
      os.totalmem() - parseFileSize(config.autoRestart, false)
    ) {
      await client.sendMessage(
        jidNormalizedUser(client.user.id),
        {
          text: `penggunaan RAM mencapai *${formatSize(memoryUsage)}* waktunya merestart...`,
        },
        { ephemeralExpiration: 24 * 60 * 60 * 1000 },
      );
      exec("npm run restart:pm2", (err) => {
        if (err) return process.send("reset");
      });
    }
  }, 10 * 1000); // tiap 10 detik

  process.on("uncaughtException", console.error);
  process.on("unhandledRejection", console.error);
}

WAStart();
