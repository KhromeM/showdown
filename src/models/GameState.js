export default class GameState {
    constructor() {
        return {
            // Battle info
            turn: 0,
            battleType: null,
            weather: null,
            terrain: null,
            
            // My team info
            myTeam: {
                active: null,  // Index of active pokemon
                pokemon: []    // Array of all team members
            },
            myActive: {
                pokemon: null,
                hp: null,
                status: null,
                moves: [],
                canSwitch: false,
                stats: null,
                boosts: {
                    atk: 0,
                    def: 0,
                    spa: 0,
                    spd: 0,
                    spe: 0,
                    accuracy: 0,
                    evasion: 0
                },
                volatileStatus: [], 
            },
            
            // Opponent info
            opponent: {
                active: {
                    pokemon: null,
                    condition: null,
                    status: null,
                    moves: [], 
                    boosts: {
                        atk: 0,
                        def: 0,
                        spa: 0,
                        spd: 0,
                        spe: 0,
                        accuracy: 0,
                        evasion: 0
                    },
                    volatileStatus: [],
                },
                knownTeam: [], 
                lastMove: null,
                lastDamage: null,
            },
            
            // Field conditions
            fieldConditions: {
                spikes: 0,
                toxicSpikes: 0,
                stealthRock: false,
                stickyWeb: false,
                reflect: false,
                lightScreen: false,
                auroraVeil: false,
            },
            
            // Battle history
            moveHistory: [],
            switchHistory: [],
            damageHistory: [],
        };
    }
}