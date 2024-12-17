import { parseHP } from "./BattleUtils.js";

const DIVIDER = "─".repeat(60);

export function formatTeamOverview(team) {
	let output = "\n=== YOUR TEAM ===\n";

	team.pokemon.forEach((pokemon, i) => {
		// Parse HP from condition if needed
		const hpData = pokemon.hp || parseHP(pokemon.condition);
		const hpString = hpData
			? `${hpData.current}/${hpData.max}`
			: pokemon.condition;

		output +=
			`${i + 1}. ${pokemon.details.padEnd(20)} | ` +
			`${
				pokemon.baseAbility
					? pokemon.baseAbility.padEnd(15)
					: "No ability".padEnd(15)
			} | ` +
			`${pokemon.item ? pokemon.item.padEnd(15) : "No item".padEnd(15)} | ` +
			`HP: ${hpString} | ` +
			`Moves: ${pokemon.moves ? pokemon.moves.join(", ") : "Unknown"}\n`;
	});

	// console.log(output);
	return output;
}

function formatFieldConditions(gameState) {
	const conditions = [];
	if (gameState.weather) conditions.push(`Weather: ${gameState.weather}`);
	if (gameState.terrain) conditions.push(`Terrain: ${gameState.terrain}`);

	const fieldEffects = Object.entries(gameState.fieldConditions)
		.filter(([_, v]) => v)
		.map(([k, v]) => {
			if (typeof v === "number" && v > 0) return `${k} (${v})`;
			if (v === true) return k;
			return null;
		})
		.filter(Boolean);

	if (fieldEffects.length > 0)
		conditions.push(`Field: ${fieldEffects.join(", ")}`);

	if (conditions.length === 0) return "";

	return (
		"\nBATTLEFIELD CONDITIONS:\n" +
		conditions.map((c) => `• ${c}`).join("\n") +
		"\n"
	);
}

function formatActivePokemon(gameState) {
	const activePokemon = gameState.myTeam.pokemon[gameState.myTeam.active];
	if (!activePokemon) return "";

	let output = "\nYOUR ACTIVE POKEMON:\n";
	output += `• ${activePokemon.details}\n`;
	output +=
		`  HP: ${activePokemon.hp.current}/${activePokemon.hp.max} ` +
		`${activePokemon.status ? `[${activePokemon.status}]` : ""}\n`;
	output += `  Ability: ${activePokemon.baseAbility || "Unknown"}\n`;
	output += `  Item: ${activePokemon.item || "None"}\n`;

	const boosts = Object.entries(gameState.myActive.boosts)
		.filter(([_, v]) => v !== 0)
		.map(([k, v]) => `${k} ${v > 0 ? "+" + v : v}`);
	if (boosts.length > 0) {
		output += `  Boosts: ${boosts.join(", ")}\n`;
	}

	output += "  Moves:\n";
	gameState.myActive.moves.forEach((m, i) => {
		output += `    ${i + 1}. ${m.move.padEnd(20)} ${
			m.disabled ? "[DISABLED]" : ""
		}\n`;
	});

	return output;
}

function formatAvailableSwitches(gameState) {
	const availableSwitches = gameState.myTeam.pokemon.filter(
		(p, i) => i !== gameState.myTeam.active && p.hp?.current > 0
	);

	if (availableSwitches.length === 0) return "";

	let output = "\nAVAILABLE SWITCHES:\n";
	availableSwitches.forEach((p, i) => {
		output +=
			`• s${i + 1}: ${p.details.padEnd(20)} | ` +
			`HP: ${p.hp.current}/${p.hp.max} ` +
			`${p.status ? `[${p.status}]` : ""}\n`;
	});

	return output;
}

function formatOpponentInfo(gameState) {
	let output = "\nOPPONENT'S POKEMON:\n";
	output += `• ${gameState.opponent.active.pokemon} (${gameState.opponent.active.details})\n`;
	output += `  HP: ${gameState.opponent.active.condition}\n`;

	if (gameState.opponent.active.status) {
		output += `  Status: ${gameState.opponent.active.status}\n`;
	}

	const oppBoosts = Object.entries(gameState.opponent.active.boosts)
		.filter(([_, v]) => v !== 0)
		.map(([k, v]) => `${k} ${v > 0 ? "+" + v : v}`);
	if (oppBoosts.length > 0) {
		output += `  Boosts: ${oppBoosts.join(", ")}\n`;
	}

	if (gameState.opponent.active.moves.length > 0) {
		output += `  Known moves: ${gameState.opponent.active.moves.join(", ")}\n`;
	}

	if (gameState.opponent.lastMove) {
		output += `  Last move: ${gameState.opponent.lastMove}\n`;
	}

	return output;
}

function formatMoveHistory(gameState) {
	const lastMoves = gameState.moveHistory.slice(-2);
	if (lastMoves.length === 0) return "";

	let output = "\nLAST MOVES:\n";
	lastMoves.forEach((m) => {
		output += `• ${m.pokemon} used ${m.move}\n`;
	});

	return output;
}

export function formatGameState(gameState) {
	// Early return with error message if gameState is undefined
	if (!gameState) {
		console.log("Game state not initialized");
		return;
	}
	let output = "";

	output += `\n${DIVIDER}\n`;
	output += `TURN ${gameState.turn || 0}\n`; // Default to 0 if turn is undefined
	output += `${DIVIDER}\n`;

	const conditions = [];
	if (gameState.weather) conditions.push(`Weather: ${gameState.weather}`);
	if (gameState.terrain) conditions.push(`Terrain: ${gameState.terrain}`);

	const fieldEffects = Object.entries(gameState.fieldConditions || {})
		.filter(([_, v]) => v)
		.map(([k, v]) => {
			if (typeof v === "number" && v > 0) return `${k} (${v})`;
			if (v === true) return k;
			return null;
		})
		.filter(Boolean);

	if (fieldEffects.length > 0)
		conditions.push(`Field: ${fieldEffects.join(", ")}`);

	if (conditions.length > 0) {
		output += "\nBATTLEFIELD CONDITIONS:\n";
		output += conditions.map((c) => `• ${c}`).join("\n") + "\n";
	}

	// Only add active Pokemon section if we have the data
	if (
		gameState.myTeam?.pokemon &&
		typeof gameState.myTeam.active === "number"
	) {
		const activePokemon = gameState.myTeam.pokemon[gameState.myTeam.active];
		if (activePokemon) {
			output += "\nYOUR ACTIVE POKEMON:\n";
			output += `• ${activePokemon.details}\n`;
			if (activePokemon.hp) {
				output += `  HP: ${activePokemon.hp.current}/${activePokemon.hp.max}`;
				if (activePokemon.status) output += ` [${activePokemon.status}]`;
				output += "\n";
			}
			if (activePokemon.baseAbility)
				output += `  Ability: ${activePokemon.baseAbility}\n`;
			if (activePokemon.item) output += `  Item: ${activePokemon.item}\n`;

			if (gameState.myActive?.boosts) {
				const boosts = Object.entries(gameState.myActive.boosts)
					.filter(([_, v]) => v !== 0)
					.map(([k, v]) => `${k} ${v > 0 ? "+" + v : v}`);
				if (boosts.length > 0) {
					output += `  Boosts: ${boosts.join(", ")}\n`;
				}
			}

			if (gameState.myActive?.moves?.length > 0) {
				output += "  Moves:\n";
				gameState.myActive.moves.forEach((m, i) => {
					output += `    ${i + 1}. ${m.move.padEnd(20)} ${
						m.disabled ? "[DISABLED]" : ""
					}\n`;
				});
			}
		}
	}

	// Available switches section
	if (gameState.myTeam?.pokemon) {
		const availableSwitches = gameState.myTeam.pokemon.filter(
			(p, i) => i !== gameState.myTeam.active && p.hp?.current > 0
		);

		if (availableSwitches.length > 0) {
			output += "\nAVAILABLE SWITCHES:\n";
			availableSwitches.forEach((p, i) => {
				output +=
					`• s${i + 1}: ${p.details.padEnd(20)} | ` +
					`HP: ${p.hp.current}/${p.hp.max} ` +
					`${p.status ? `[${p.status}]` : ""}\n`;
			});
		}
	}

	// Opponent section
	if (gameState.opponent?.active) {
		output += "\nOPPONENT'S POKEMON:\n";
		output += `• ${gameState.opponent.active.pokemon}`;
		if (gameState.opponent.active.details) {
			output += ` (${gameState.opponent.active.details})`;
		}
		output += "\n";

		if (gameState.opponent.active.condition) {
			output += `  HP: ${gameState.opponent.active.condition}\n`;
		}

		if (gameState.opponent.active.status) {
			output += `  Status: ${gameState.opponent.active.status}\n`;
		}

		if (gameState.opponent.active.boosts) {
			const oppBoosts = Object.entries(gameState.opponent.active.boosts)
				.filter(([_, v]) => v !== 0)
				.map(([k, v]) => `${k} ${v > 0 ? "+" + v : v}`);
			if (oppBoosts.length > 0) {
				output += `  Boosts: ${oppBoosts.join(", ")}\n`;
			}
		}

		if (gameState.opponent.active.moves?.length > 0) {
			output += `  Known moves: ${gameState.opponent.active.moves.join(
				", "
			)}\n`;
		}

		if (gameState.opponent.lastMove) {
			output += `  Last move: ${gameState.opponent.lastMove}\n`;
		}
	}

	// Move history section
	if (gameState.moveHistory?.length > 0) {
		const lastMoves = gameState.moveHistory.slice(-2);
		if (lastMoves.length > 0) {
			output += "\nLAST MOVES:\n";
			lastMoves.forEach((m) => {
				output += `• ${m.pokemon} used ${m.move}\n`;
			});
		}
	}

	output += DIVIDER;
	console.log("Output about to be returned:", output); // Add this line to debug

	return output;
}
