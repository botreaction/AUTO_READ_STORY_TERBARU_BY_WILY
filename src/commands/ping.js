module.exports = {
  cmd: ["ping"],
  name: "ping",
  description: "Balas dengan pong",
  async execute(m, { client }) {
    try {
      await client.sendMessage(m.from, { text: "Pong!" });
    } catch (error) {
      console.error("Error sending pong message:", error);
    }
  },
};
