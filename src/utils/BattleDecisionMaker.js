import fs from "fs";
import path from "path";
import OpenRouterAPI from "./OpenRouter.mjs";

export default class BattleDecisionMaker {
	constructor() {
		this.battleLogs = [];
		this.currentGameState = null;
		this.uid = new Date().getTime();
		this.openRouter = new OpenRouterAPI();

		const logsDir = path.join(process.cwd(), "gameLogs");
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true });
		}
	}

	battleLog(...args) {
		const logMessage = args.map((arg) => String(arg)).join(" ");
		console.log(...args);
		this.battleLogs.push(logMessage);

		try {
			const logPath = path.join(process.cwd(), "gameLogs", `${this.uid}.json`);
			fs.writeFileSync(logPath, JSON.stringify(this.battleLogs, null, 2));
		} catch (error) {
			console.error("Error writing battle logs:", error);
		}
	}

	updateGameState(gameState) {
		this.currentGameState = gameState;
	}

	async makeDecision() {
		if (!this.currentGameState?.myActive?.moves) {
			return null;
		}

		const aiResponse = await this.openRouter.getBattleDecision(this.battleLogs);
		this.battleLog(JSON.stringify(aiResponse));
		return aiResponse.action;
	}

	getContext() {
		return this.battleLogs;
	}
}
