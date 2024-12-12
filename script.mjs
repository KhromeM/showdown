import WebSocket from "ws";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ShowdownBot {
	constructor(username = process.env.SHOWDOWN_USERNAME, password = process.env.SHOWDOWN_PASSWORD) {
		this.ws = null;
		this.username = username;
		this.password = password;
		this.challstr = null;
		this.battleRoom = null;
		this.gameState = {
			myTeam: null,
			myActive: null,
			opponent: {
				active: null,
				lastMove: null,
				lastDamage: null,
			},
			weather: null,
			turn: 0,
		};
	}

	connect() {
		return new Promise((resolve, reject) => {
			this.ws = new WebSocket("wss://sim3.psim.us/showdown/websocket");

			this.ws.on("open", () => {
				console.log("Connected to Pokemon Showdown");
				resolve();
			});

			this.ws.on("message", (data) => {
				this.handleMessage(data.toString());
			});
		});
	}

	async login() {
		if (!this.username || !this.password || !this.challstr) {
			console.log("Playing as guest - no login credentials provided");
			return;
		}

		try {
			console.log("Attempting to login as:", this.username);
			const assertion = await this.getAssertion();
			if (assertion) {
				this.send(`|/trn ${this.username},0,${assertion}`);
				console.log("Login command sent");
			}
		} catch (error) {
			console.error("Login failed:", error);
		}
	}

	async getAssertion() {
		try {
			const response = await fetch(
				"https://play.pokemonshowdown.com/action.php",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: `act=login&name=${encodeURIComponent(
						this.username
					)}&pass=${encodeURIComponent(this.password)}&challstr=${
						this.challstr
					}`,
				}
			);

			const data = await response.text();

			if (data.startsWith("]")) {
				const jsonData = JSON.parse(data.slice(1));
				return jsonData.assertion;
			} else {
				throw new Error("Invalid login response");
			}
		} catch (error) {
			console.error("Failed to get assertion:", error);
			return null;
		}
	}

	handleMessage(message) {
		const lines = message.split("\n");

		for (const line of lines) {
			if (!line) continue;
			const parts = line.split("|");
			if (parts.length < 2) continue;

			switch (parts[1]) {
				case "challstr":
					this.challstr = parts.slice(2).join("|");
					console.log("Received challstr, attempting login...");
					this.login().then(() => {
						this.searchBattle();
					});
					break;

				case "updateuser":
					console.log("Successfully logged in as:", this.username);
					break;

				case "init":
					this.battleRoom = parts[0].slice(1);
					console.log("\n=== BATTLE STARTED ===");
					break;

				case "request":
					if (parts[2]) {
						this.handleRequest(JSON.parse(parts[2]));
					}
					break;

				case "switch":
					this.handleSwitch(parts);
					break;

				case "move":
					this.handleMove(parts);
					break;

				case "-damage":
				case "-heal":
					this.handleHPChange(parts);
					break;

				case "turn":
					console.log(`\n=== TURN ${parts[2]} ===`);
					this.gameState.turn = parseInt(parts[2]);
					this.logGameState();
					setTimeout(() => this.makeRandomMove(), 1000);
					break;

				case "win":
					console.log(`\n=== BATTLE ENDED - Winner: ${parts[2]} ===`);
					setTimeout(() => this.searchBattle(), 2000);
					break;
			}
		}
	}
	handleRequest(request) {
		if (!request) return;

		if (request.side) {
			this.gameState.myTeam = request.side.pokemon;
		}

		if (request.active) {
			this.gameState.myActive = {
				moves: request.active[0].moves,
				canSwitch: request.active[0].canSwitch,
				hp: request.side.pokemon[0].condition,
			};
		}
	}

	handleSwitch(parts) {
		const [, , playerAndPokemon, details, condition] = parts;
		const [player, pokemon] = playerAndPokemon.split(": ");

		if (!player.startsWith("p2")) {
			// If it's our switch
			this.gameState.myActive = {
				...this.gameState.myActive,
				pokemon: pokemon,
				condition: condition,
			};
		} else {
			// If it's opponent's switch
			this.gameState.opponent.active = {
				pokemon: pokemon,
				condition: condition,
				details: details,
			};
		}
		this.logGameState();
	}

	handleMove(parts) {
		const [, , playerAndPokemon, move] = parts;
		const [player, pokemon] = playerAndPokemon.split(": ");

		if (player.startsWith("p2")) {
			// If it's opponent's move
			this.gameState.opponent.lastMove = move;
		}
		this.logGameState();
	}

	handleHPChange(parts) {
		const [messageType, playerAndPokemon, newHP] = parts.slice(1);
		const [player, pokemon] = playerAndPokemon.split(": ");

		if (player.startsWith("p2")) {
			// If it's opponent's HP change
			if (this.gameState.opponent.active) {
				this.gameState.opponent.active.condition = newHP;
				this.gameState.opponent.lastDamage = messageType;
			}
		} else {
			// If it's our HP change
			if (this.gameState.myActive) {
				this.gameState.myActive.hp = newHP;
			}
		}
		this.logGameState();
	}

	makeRandomMove() {
		if (!this.gameState.myActive?.moves) return;

		const availableMoves = this.gameState.myActive.moves.filter(
			(move) => !move.disabled
		);
		if (availableMoves.length > 0) {
			const randomMove = Math.floor(Math.random() * availableMoves.length) + 1;
			this.send(`${this.battleRoom}|/move ${randomMove}`);
		}
	}

	logGameState() {
		console.log("\n=== CURRENT GAME STATE ===");
		console.log("Turn:", this.gameState.turn);

		console.log(
			"\nMy Active Pokemon:",
			this.gameState.myActive
				? {
						pokemon: this.gameState.myActive.pokemon,
						hp: this.gameState.myActive.hp,
						moves: this.gameState.myActive.moves?.map((m) => m.move),
				  }
				: "None"
		);

		console.log(
			"\nOpponent Active Pokemon:",
			this.gameState.opponent.active
				? {
						pokemon: this.gameState.opponent.active.pokemon,
						condition: this.gameState.opponent.active.condition,
						lastMove: this.gameState.opponent.lastMove,
						lastDamage: this.gameState.opponent.lastDamage,
				  }
				: "None"
		);
	}

	searchBattle() {
		this.send("|/search gen9randombattle");
		console.log("\nSearching for Gen 9 Random Battle...");
	}

	send(message) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(message);
		}
	}
}

const bot = new ShowdownBot();
bot.connect();