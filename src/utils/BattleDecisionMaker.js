import fs from "fs";
import path from "path";
import { formatGameState } from "./StateLogger.js";

export default class BattleDecisionMaker {
	constructor() {
		this.states = []; // Will store the formatGameState output strings
		this.currentGameState = null;
		this.uid = new Date().getTime();

		const logsDir = path.join(process.cwd(), "gameLogs");
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true });
		}
	}

	addMessage() {
		const formattedState = formatGameState(this.currentGameState);
		if (!formattedState) return;
		console.log("FORMATTED STATE: ", formattedState);
		this.states.push(formattedState);

		try {
			const logPath = path.join(process.cwd(), "gameLogs", `${this.uid}.json`);
			fs.writeFileSync(logPath, JSON.stringify(this.states, null, 2));
		} catch (error) {
			console.error("Error writing battle logs:", error);
		}
	}

	updateGameState(gameState) {
		this.currentGameState = gameState;
	}

	makeDecision() {
		if (!this.currentGameState?.myActive?.moves) {
			return null;
		}

		const validMoves = [];

		// Add valid moves
		this.currentGameState.myActive.moves.forEach((move, index) => {
			if (!move.disabled) {
				validMoves.push({ type: "move", choice: index + 1 });
			}
		});

		// Add valid switches
		if (this.currentGameState.myTeam?.pokemon) {
			this.currentGameState.myTeam.pokemon.forEach((pokemon, index) => {
				if (!pokemon.active && pokemon.hp?.current > 0) {
					validMoves.push({ type: "switch", choice: index + 1 });
				}
			});
		}

		// Return random valid move
		if (validMoves.length > 0) {
			return validMoves[Math.floor(Math.random() * validMoves.length)];
		}

		return null;
	}

	getContext() {
		return this.states;
	}
}
