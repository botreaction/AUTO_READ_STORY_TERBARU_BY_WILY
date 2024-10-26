---
<h1 align="center">Auto Read Story WhatsApp</h1>

<p align="center">
<img src="https://pomf2.lain.la/f/tjwpce10.jpg" alt="contoh1">
</p>
---

# AR-READ-SW

AR-READ-SW is a WhatsApp bot designed for automatically reading WhatsApp stories. This bot utilizes the Baileys library for WhatsApp Web API interactions and is easy to set up and use.

## Features

- Automatically reads WhatsApp stories.
- Lightweight and efficient performance.
- Includes a command system for various functionalities.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Scripts](#scripts)
- [Directory Structure](#directory-structure)
- [Dependencies](#dependencies)
- [Author](#author)
- [License](#license)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/AR-READ-SW.git
   cd AR-READ-SW
   ```
   
2. Install the dependencies:

```bash
npm install
```

### Usage

# To start the bot, use the following command:

```bash
npm start
```

Alternatively, you can use PM2 for process management:
```bash
npm run pm2
```

## Scripts

`start:` Starts the bot with a specified memory limit.

```bash
npm start
```

`pm2:` Starts the bot using PM2 with a specified name and memory limit.

```bash
npm run pm2
```

`restart:pm2:` Restarts the bot managed by PM2.

```bash
npm run restart:pm2
```

stop:pm2: Stops the bot managed by PM2.

```bash
npm run stop:pm2
```

### Directory Structure

.
├── LICENSE
├── README.md
├── package-lock.json
├── package.json
└── src
    ├── commands        # Contains command files for bot functionalities
    │   ├── getsw.js
    │   ├── listsw.js
    │   ├── menu.js
    │   ├── ping.js
    │   └── upsw.js
    ├── configs         # Configuration files
    │   └── config.js
    ├── events          # Event handlers
    │   ├── connectionUpdate.js
    │   └── messageHandler.js
    ├── index.js        # Main entry point for the bot
    └── lib             # Library files containing utility functions
        ├── client.js
        ├── color.js
        ├── emoji.js
        ├── function.js
        ├── serialize.js
        └── sticker.js

### License

This project is licensed under the MIT License. See the LICENSE file for details.

Feel free to replace `ArifzynXD` in the installation instructions with your actual GitHub username or the correct repository link. You can also customize any sections as needed to better fit your project's specifics!