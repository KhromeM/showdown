import WebSocket from "ws";
import dotenv from "dotenv";
import GameState from "./models/GameState.js";
import MessageHandler from "./handlers/MessageHandler.js";
import BattleInputHandler from "./utils/BattleInputHandler.js";
import BattleDecisionMaker from "./utils/BattleDecisionMaker.js";

dotenv.config();

export default class ShowdownBot {
	constructor(
		username = process.env.SHOWDOWN_USERNAME,
		password = process.env.SHOWDOWN_PASSWORD
	) {
		this.ws = null;
		this.username = username;
		this.password = password;
		this.challstr = null;
		this.battleRoom = null;
		this.gameState = new GameState();
		this.decisionMaker = new BattleDecisionMaker();
		this.messageHandler = new MessageHandler(this);
		this.inputHandler = new BattleInputHandler(this);
	}

	connect() {
		return new Promise((resolve, reject) => {
			this.ws = new WebSocket("wss://sim3.psim.us/showdown/websocket");

			this.ws.on("open", () => {
				console.log("Connected to Pokemon Showdown");
				this.askToSearchBattle();
				resolve();
			});

			this.ws.on("message", (data) => {
				this.messageHandler.handle(data.toString());
			});

			this.ws.on("error", (error) => {
				console.error("WebSocket error:", error);
				reject(error);
			});

			this.ws.on("close", () => {
				console.log("Connection closed");
			});
		});
	}

	async login() {
		if (!this.username || !this.password || !this.challstr) {
			console.log("Playing as guest - no login credentials provided");
			this.searchBattle();
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
			this.searchBattle();
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

	async askToSearchBattle() {
		const answer = await this.inputHandler.ask(
			"Would you like to search for a battle, challenge a player or neither? (search/challenge/no): "
		);

		if (answer.toLowerCase() === "search" || answer.toLowerCase() === "s") {
			this.searchBattle();
			return true;
		}

		if (answer.toLowerCase() === "challenge" || answer.toLowerCase() === "c") {
			const playerToChallenge = await this.inputHandler.ask(
				"Enter the player's name to challenge: "
			);
			if (playerToChallenge) {
				this.challengePlayer(playerToChallenge);
				return true;
			}
			return false;
		}
		this.askToSearchBattle();
	}

	challengePlayer(player) {
		console.log(`Challenging player: ${player}`);
		this.send(`|/challenge ${player}, gen9randombattle`);
	}

	async makeMove() {
		if (!this.gameState.myActive?.moves) return;

		this.decisionMaker.updateGameState(this.gameState);

		const choice = await this.decisionMaker.makeDecision();
		if (!choice) return;

		let command;
		switch (choice.type) {
			case "move":
				command = `/choose move ${choice.choice}`;
				break;
			case "switch":
				command = `/choose switch ${choice.choice}`;
				break;
			case "teramove":
				command = `/choose move ${choice.choice} terastallize`;
				break;
		}

		if (command) {
			const message = this.battleRoom
				? `${this.battleRoom}|${command}`
				: command;
			console.log("Sending command:", message);
			this.send(message);
		}
	}

	send(message) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(message);
		} else {
			console.log("WebSocket not ready, message not sent:", message);
		}
	}

	searchBattle() {
		console.log("Searching for a battle...");
		this.send("|/search gen9randombattle");
	}
}
