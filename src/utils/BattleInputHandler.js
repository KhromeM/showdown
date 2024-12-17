import readline from "readline";

export default class BattleInputHandler {
	constructor(bot) {
		this.bot;
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
	}

	ask(question) {
		return new Promise((resolve) => {
			this.rl.question(question, (answer) => {
				resolve(answer);
			});
		});
	}

	async getChoice(gameState) {
		// console.log(gameState);
		if (!gameState?.myActive?.moves) {
			console.log("Waiting for battle state to be ready...");
			return;
		}

		this.bot.decisionMaker.battleLog("\nYour turn! Choose your action:");

		// Show Tera option if available
		const activePokemon = gameState.myTeam?.pokemon[gameState.myTeam.active];
		const canTera =
			activePokemon &&
			!activePokemon.terastallized &&
			gameState.myActive &&
			!gameState.myActive.volatileStatus.includes("terastallized");

		this.bot.decisionMaker.battleLog("\nMoves:");
		gameState.myActive.moves?.forEach((move, index) => {
			const disabled = move.disabled ? " (DISABLED)" : "";
			this.bot.decisionMaker.battleLog(`${index + 1}. ${move.move}${disabled}`);
		});

		if (canTera) {
			this.bot.decisionMaker.battleLog("\nTerastallize + move:");
			this.bot.decisionMaker.battleLog(
				"t1-t4. Terastallize and use move (e.g., t1 for move 1)"
			);
		}

		this.bot.decisionMaker.battleLog("\nTeam:");
		if (gameState.myTeam?.pokemon) {
			gameState.myTeam.pokemon.forEach((pokemon, index) => {
				if (!pokemon.active && pokemon.hp?.current > 0) {
					this.bot.decisionMaker.battleLog(
						`s${index + 1}. Switch to ${pokemon.details} (${
							pokemon.baseAbility || "Unknown ability"
						}, ${pokemon.item || "No item"})`
					);
				}
			});
		}

		while (true) {
			const choice = await this.ask(
				"\nEnter move (1-4), 't1'-'t4' to tera+move, or 's1'-'s6' to switch: "
			);

			// Handle tera + move
			if (choice.toLowerCase().startsWith("t") && canTera) {
				const moveIndex = parseInt(choice.slice(1)) - 1;
				if (
					moveIndex >= 0 &&
					moveIndex < gameState.myActive.moves.length &&
					!gameState.myActive.moves[moveIndex].disabled
				) {
					return { type: "teramove", choice: moveIndex + 1 };
				}
			}

			// Handle switch command
			else if (choice.toLowerCase().startsWith("s")) {
				const switchIndex = parseInt(choice.slice(1)) - 1;
				if (
					gameState.myTeam?.pokemon &&
					switchIndex >= 0 &&
					switchIndex < gameState.myTeam.pokemon.length &&
					!gameState.myTeam.pokemon[switchIndex].active &&
					gameState.myTeam.pokemon[switchIndex].hp?.current > 0
				) {
					return { type: "switch", choice: switchIndex + 1 };
				}
			}
			// Handle regular move command
			else {
				const moveIndex = parseInt(choice) - 1;
				if (
					moveIndex >= 0 &&
					moveIndex < gameState.myActive.moves.length &&
					!gameState.myActive.moves[moveIndex].disabled
				) {
					return { type: "move", choice: moveIndex + 1 };
				}
			}
			this.bot.decisionMaker.battleLog("Invalid choice. Please try again.");
		}
	}
}
