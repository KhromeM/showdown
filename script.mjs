import ShowdownBot from './src/ShowdownBot.js';

const bot = new ShowdownBot();
await bot.connect()  // Need to await this
    .then(() => console.log("Starting search..."))
    .catch(console.error);
