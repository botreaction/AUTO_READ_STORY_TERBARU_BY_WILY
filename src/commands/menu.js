module.exports = {
  cmd: ["menu", "help"],
  name: "menu",
  category: "main",
  async execute(m, { client, commands }) {
    try {
      let categories = {};
      commands.forEach((command) => {
        const category = command.category || "lainnya";
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(command);
      });

      let menuText = `✨ *MENU PERINTAH* ✨\n\n`;
      menuText += `Hai, berikut menu yang tersedia:\n\n`;

      Object.keys(categories).forEach((category) => {
        menuText += `📂 *${category.toUpperCase()}*\n`;
        categories[category].forEach((command) => {
          menuText += `➤ ${m.prefix}${command.cmd.join(", /")}\n`;
        });
        menuText += "\n";
      });

      await m.reply(menuText)
    } catch (error) {
      console.error("Error sending menu message:", error);
    }
  },
};