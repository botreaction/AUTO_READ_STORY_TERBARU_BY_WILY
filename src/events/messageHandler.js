const settings = require('../configs/config');
const { getRandomEmoji } = require('../helpers/emojiHelper');
const fs = require('fs');
const path = require('path');

const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.name, command);
}

const handleMessagesUpsert = async (client, chatUpdate) => {
  try {
    const m = chatUpdate.messages[0];
    if (!m.message) return;

    const messageText = m.message.conversation || m.message.extendedTextMessage?.text;

    // Auto-read status logic
    if (m.key && !m.key.fromMe && m.key.remoteJid === 'status@broadcast') {
      const currentTime = Date.now();
      const messageTime = m.messageTimestamp * 1000;
      const timeDiff = currentTime - messageTime;

      if (timeDiff <= settings.storyReadInterval) {
        if (settings.autoReadStory) {
          try {
            await client.readMessages([m.key]);
            console.log(`Berhasil melihat status dari ${m.key.participant.split("@")[0]}`);
          } catch (error) {
            console.error('Error reading status:', error);
          }
        }

        // React to the status with a random emoji
        try {
          const randomEmoji = getRandomEmoji();
          await client.sendMessage(
            "status@broadcast",
            { react: { text: randomEmoji, key: m.key } },
            { statusJidList: [m.key.participant] }
          );
        } catch (error) {
          console.error('Error sending emoji reaction:', error);
        }
      }
    }
    
    if (settings.autoReadMessage && !m.key.fromMe) {
      try {
        await client.readMessages([m.key]);
      } catch (error) {
        console.error('Error auto-reading message:', error);
      }
    }
    
    if (messageText && messageText.startsWith('!')) {
      const args = messageText.slice(1).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = commands.get(commandName);
      if (command) {
        try {
          await command.execute(client, m, args);
        } catch (error) {
          console.error(`Error executing command ${commandName}:`, error);
        }
      } else {
        console.log(`Command ${commandName} not found.`);
      }
    }
  } catch (error) {
    console.error('Error in handleMessagesUpsert:', error);
  }
};

module.exports = { handleMessagesUpsert };