import { parseHP, getStatus } from '../utils/BattleUtils.js';

export default class BattleHandler {
    constructor(bot) {
        this.bot = bot;
        this.ourPlayerId = null;
        this.ourPokemonName = null;  // Track our current Pokemon's name
    }

    createDefaultBoosts() {
        return {
            atk: 0,
            def: 0,
            spa: 0,
            spd: 0,
            spe: 0,
            accuracy: 0,
            evasion: 0
        };
    }

    handleRequest(request) {
        if (!request) return;

        // Store our player ID and active Pokemon name
        if (request.side?.id) {
            this.ourPlayerId = request.side.id;
            console.log("Our player ID:", this.ourPlayerId);
        }

        if (request.side) {
            this.bot.gameState.myTeam.pokemon = request.side.pokemon.map(pokemon => ({
                ident: pokemon.ident,
                details: pokemon.details,
                condition: pokemon.condition,
                hp: parseHP(pokemon.condition),
                status: getStatus(pokemon.condition),
                active: pokemon.active,
                stats: pokemon.stats || null,
                moves: pokemon.moves || [],
                baseAbility: pokemon.baseAbility,
                item: pokemon.item,
                canSwitch: pokemon.canSwitch
            }));

            this.bot.gameState.myTeam.active = request.side.pokemon.findIndex(p => p.active);
            
            const activePokemon = request.side.pokemon.find(p => p.active);
            if (activePokemon) {
                this.ourPokemonName = activePokemon.ident.split(': ')[1];  // Store our Pokemon's name
                console.log("Our active Pokemon:", this.ourPokemonName);
                
                this.bot.gameState.myActive = {
                    pokemon: activePokemon.details,
                    hp: activePokemon.condition,
                    status: getStatus(activePokemon.condition),
                    moves: request.active?.[0]?.moves || [],
                    canSwitch: request.active?.[0]?.canSwitch || false,
                    boosts: this.createDefaultBoosts(),
                    volatileStatus: [],
                    terastallized: false,
                };
            }
        }
    }

    handleSwitch(parts) {
        const [, , playerAndPokemon, details, condition] = parts;
        const [player, pokemon] = playerAndPokemon.split(": ");
        
        // If this switch is for our Pokemon, update our tracker
        if (player === this.ourPlayerId) {
            this.ourPokemonName = pokemon;
            console.log("Updated our Pokemon to:", pokemon);
        }
        
        // If this isn't our Pokemon, it must be the opponent's
        if (pokemon !== this.ourPokemonName) {
            console.log("Opponent switch:", pokemon);
            this.bot.gameState.opponent.active = {
                pokemon: pokemon,
                condition: condition,
                details: details,
                moves: [],
                boosts: this.createDefaultBoosts(),
                volatileStatus: [],
            };
            
            if (!this.bot.gameState.opponent.knownTeam.some(p => p.pokemon === pokemon)) {
                this.bot.gameState.opponent.knownTeam.push({
                    pokemon: pokemon,
                    details: details,
                    firstSeenTurn: this.bot.gameState.turn
                });
            }
        }
    }

    handleMove(parts) {
        const [, , playerAndPokemon, move] = parts;
        const [, pokemon] = playerAndPokemon.split(": ");

        // If it's not our Pokemon, it must be the opponent
        if (pokemon !== this.ourPokemonName) {
            console.log("Opponent move:", move, "from", pokemon);
            this.bot.gameState.opponent.lastMove = move;
            if (!this.bot.gameState.opponent.active.moves.includes(move)) {
                this.bot.gameState.opponent.active.moves.push(move);
            }
        }
        
        this.bot.gameState.moveHistory.push({
            turn: this.bot.gameState.turn,
            pokemon: pokemon,
            move: move
        });
    }

    handleStatusChange(parts) {
        const [, , playerAndPokemon, status] = parts;
        const [, pokemon] = playerAndPokemon.split(": ");

        if (pokemon !== this.ourPokemonName) {
            this.bot.gameState.opponent.active.status = status;
        } else {
            this.bot.gameState.myActive.status = status;
        }
    }

    handleBoostChange(parts) {
        const [messageType, stat, playerAndPokemon, amount] = parts.slice(2);
        const [, pokemon] = playerAndPokemon.split(": ");
        const boost = parseInt(amount);

        if (pokemon !== this.ourPokemonName) {
            if (!this.bot.gameState.opponent.active.boosts) {
                this.bot.gameState.opponent.active.boosts = this.createDefaultBoosts();
            }
            this.bot.gameState.opponent.active.boosts[stat] += boost;
        } else {
            if (!this.bot.gameState.myActive.boosts) {
                this.bot.gameState.myActive.boosts = this.createDefaultBoosts();
            }
            this.bot.gameState.myActive.boosts[stat] += boost;
        }
    }

    handleHPChange(parts) {
        const [messageType, playerAndPokemon, newHP] = parts;
        const [, pokemon] = playerAndPokemon.split(": ");

        if (pokemon !== this.ourPokemonName) {
            if (this.bot.gameState.opponent.active) {
                this.bot.gameState.opponent.active.condition = newHP;
                this.bot.gameState.opponent.lastDamage = messageType;
            }
        } else {
            if (this.bot.gameState.myActive) {
                this.bot.gameState.myActive.hp = newHP;
            }
        }
    }

    handleFieldChange(parts) {
        const [, , condition] = parts;
        switch (condition.toLowerCase()) {
            case "spikes":
                this.bot.gameState.fieldConditions.spikes++;
                break;
            case "toxic spikes":
                this.bot.gameState.fieldConditions.toxicSpikes++;
                break;
            case "stealth rock":
                this.bot.gameState.fieldConditions.stealthRock = true;
                break;
            case "sticky web":
                this.bot.gameState.fieldConditions.stickyWeb = true;
                break;
        }
    }
}