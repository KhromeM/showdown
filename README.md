# Pokemon Showdown Bot
turns out llms are bad at pokemon. you can probably improve this by showing ability and item info and move side effect + damaage calcs.

A simple bot that can play Pokemon Showdown random battles.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a .env file in the root directory with your Pokemon Showdown credentials:
```
SHOWDOWN_USERNAME=your_username
SHOWDOWN_PASSWORD=your_password
```

3. Run the bot:
```bash
npm start
```

## Features

- Automatically connects to Pokemon Showdown
- Logs in using provided credentials
- Plays Gen 9 Random Battles
- Makes random moves from available options
- Tracks battle state including:
  - Active Pokemon
  - HP changes
  - Opponent's moves
  - Turn count
