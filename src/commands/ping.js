module.exports = {
  name: 'ping',
  description: 'Balas dengan pong',
  execute(client, message) {
    client.sendMessage(message.key.remoteJid, { text: 'Pong!' });
  }
};