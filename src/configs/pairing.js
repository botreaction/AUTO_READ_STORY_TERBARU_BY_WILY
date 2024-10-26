const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function handlePairing(client) {
  const phoneNumber = await question(`Silahkan masukkan nomor WhatsApp kamu: `);
  let code = await client.requestPairingCode(phoneNumber);
  code = code?.match(/.{1,4}/g)?.join("-") || code;
  console.log(`⚠︎ Kode WhatsApp kamu: ` + code);
  rl.close();
}

module.exports = { handlePairing };
