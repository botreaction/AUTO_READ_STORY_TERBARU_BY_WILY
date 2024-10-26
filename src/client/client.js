const { default: WAConnect, makeInMemoryStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");

const createClient = (state) => {
  const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });
  const client = WAConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: Browsers.ubuntu("Chrome"),
    auth: state,
  });
  store.bind(client.ev);
  return client;
};

module.exports = { createClient };