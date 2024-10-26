const config = require("../configs/config");

const { delay, jidNormalizedUser } = require("@whiskeysockets/baileys");
const util = require("util");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const Func = require("../lib/function.js");
const Color = require("../lib/color.js");
const { serialize, getContentType } = require("../lib/serialize.js");

const commands = new Map();
const commandFiles = fs
  .readdirSync(path.join(__dirname, "../commands"))
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  command.cmd.forEach((cmdName) => {
    commands.set(cmdName, command);
  });
}

const handleMessagesUpsert = async (client, store, m) => {
  try {
    let quoted = m.isQuoted ? m.quoted : m;
    let downloadM = async (filename) =>
      await client.downloadMediaMessage(quoted, filename);

    if (m.isBot) return;

    if (m.message && !m.isBot) {
      console.log(
        Color.cyan("Dari"),
        Color.cyan(client.getName(m.from)),
        Color.blueBright(m.from),
      );
      console.log(
        Color.yellowBright("Chat"),
        Color.yellowBright(
          m.isGroup
            ? `Grup (${m.sender} : ${client.getName(m.sender)})`
            : "Pribadi",
        ),
      );
      console.log(
        Color.greenBright("Pesan :"),
        Color.greenBright(m.body || m.type),
      );
    }

    if (config.autoReadMessage && !m.key.fromMe) {
      try {
        await client.readMessages([m.key]);
      } catch (error) {
        console.error("Error auto-reading message:", error);
      }
    }

    if (m.prefix) {
      const { args, text } = m;
      const isCommand = m.prefix && m.body.startsWith(m.prefix);
      const commandName = isCommand ? m.command.toLowerCase() : false;

      if (commandName && commands.has(commandName)) {
        const command = commands.get(commandName);
        const isAccept = Array.isArray(command.cmd)
          ? command.cmd.includes(commandName)
          : false;

        if (isAccept) {
          try {
            await command.execute(m, { client, args, text });
          } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in handleMessagesUpsert:", error);
  }
};

module.exports = { handleMessagesUpsert };
