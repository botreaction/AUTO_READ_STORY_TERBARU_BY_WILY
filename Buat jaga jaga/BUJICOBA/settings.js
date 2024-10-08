// settings.js
const settings = {
  autoReadStory: true, // Default: Auto baca cerita (dasar) diaktifkan
  autoReadStoryEmoji: true, // Default: Auto baca cerita dengan emoji diaktifkan
  autoOnline: true, // Default: Auto online diaktifkan
  storyReadIntervalBasic: 1000, // Default: Baca cerita basic setiap 1 detik (dalam milidetik)
  storyReadIntervalEmoji: 1000, // Default: Baca cerita emoji setiap 1 detik (dalam milidetik)
  autoReadMessage: true, // Default: Auto baca pesan diaktifkan
  autoBioUptime: true, // Default: Auto update bio with uptime diaktifkan
  autoTyping: true, // Default: Auto typing diaktifkan
  autoRecord: true, // Default: Auto record diaktifkan
  autoReactionPrivate: true, // Default: Auto reaction pada pesan pribadi diaktifkan
  autoReactionPrivateInterval: 2000, // Default: Interval reaksi pada pesan pribadi (2 detik)
  sessionPath: './sesi', // Path ke sesi
  browserPlatform: "ubuntu", // Platform browser (contoh: ubuntu, mac, windows)
  browserName: "Chrome", // Nama browser (contoh: Chrome, Firefox, Safari)
  noAntiRestart: false, // Default: No Anti Restart diaktifkan
  ignoreError: false // Default: Ignore Error diaktifkan
};

module.exports = settings;
