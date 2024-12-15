import BattleHandler from "./BattleHandler.js";
import { formatTeamOverview, formatGameState } from "../utils/StateLogger.js";

export default class MessageHandler {
	constructor(bot) {
		this.bot = bot;
		this.battleHandler = new BattleHandler(bot);
	}

	handle(message) {
		const lines = message.split("\n");

		for (const line of lines) {
			if (!line) continue;

			if (line.startsWith(">")) {
				const roomId = line.slice(1).split("\n")[0];
				if (roomId.startsWith("battle-")) {
					this.bot.battleRoom = roomId;
					console.log("Updated battle room to:", roomId);
				}
			}

			const parts = line.split("|");
			if (parts.length < 2) continue;

			switch (parts[1]) {
				case "player":
					if (parts[3] === this.bot.username) {
						this.bot.playerId = parts[2];
						console.log("We are player:", this.bot.playerId);
					}
					break;

				case "challstr":
					this.bot.challstr = parts.slice(2).join("|");
					if (this.bot.username && this.bot.password) {
						console.log("Attempting to log in...");
						this.bot.login().then(() => {
							console.log(
								"Login complete, would you like to search for a battle?"
							);
							this.bot.askToSearchBattle();
						});
					} else {
						console.log("Would you like to search for a battle as guest?");
						this.bot.askToSearchBattle();
					}
					break;

				case "init":
					this.bot.gameState.battleType = parts[2];
					this.bot.gameState.turn = 0;
					console.log("Battle initialized");
					break;

				case "request":
					if (parts[2]) {
						const battleRequest = JSON.parse(parts[2]);
						if (battleRequest.side?.pokemon) {
							formatTeamOverview(battleRequest.side);
						}
						this.battleHandler.handleRequest(battleRequest);
					}
					break;

				case "switch":
					this.battleHandler.handleSwitch(parts);
					break;

				case "move":
					this.battleHandler.handleMove(parts);
					break;

				case "inactive":
					if (parts[2]?.startsWith("Time left:")) {
						this.bot.decisionMaker.addMessage();
						this.bot.makeMove();
					}
					break;

				case "-weather":
					this.bot.gameState.weather = parts[2];
					break;

				case "-field":
					this.battleHandler.handleFieldChange(parts);
					break;

				case "-status":
					this.battleHandler.handleStatusChange(parts);
					break;

				case "-boost":
				case "-unboost":
					this.battleHandler.handleBoostChange(parts);
					break;

				case "-damage":
				case "-heal":
					this.battleHandler.handleHPChange(parts);
					this.bot.gameState.damageHistory.push({
						type: parts[1],
						target: parts[2],
						newHP: parts[3],
						reason: parts[4] || null,
					});
					break;

				case "win":
					console.log(`\n=== BATTLE ENDED - Winner: ${parts[2]} ===`);
					if (this.bot.battleRoom) {
						this.bot.send("|/cmd rooms");
						this.bot.battleRoom = null;
					}
					setTimeout(() => {
						this.bot.askToSearchBattle();
					}, 500);
					break;

				case "popup":
					if (
						parts[2].includes("user") &&
						parts[2].includes("not") &&
						parts[2].includes("found")
					) {
						console.log("USER NOT FOUND");
						this.bot.askToSearchBattle();
					}
					break;
			}
		}
	}
}
