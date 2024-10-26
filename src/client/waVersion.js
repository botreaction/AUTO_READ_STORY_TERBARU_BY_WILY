const {
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
} = require("@whiskeysockets/baileys");

async function getWAVersion() {
  try {
    const { version, isLatest } = await fetchLatestWaWebVersion();
    return { version, isLatest };
  } catch (err) {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    return { version, isLatest };
  }
}

module.exports = { getWAVersion };
