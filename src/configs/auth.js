const { useMultiFileAuthState } = require("@whiskeysockets/baileys");

async function initAuth() {
  return await useMultiFileAuthState("./session");
}

module.exports = { initAuth };