import OpenAI from "openai";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Define the response schema
const responseSchema = z.object({
	explanation: z.string().min(1),
	action: z.object({
		type: z.enum(["move", "switch", "teramove"]),
		choice: z.number(),
	}),
	strategies: z.string().min(1),
});

export default class OpenRouterAPI {
	constructor() {
		this.openai = new OpenAI({
			baseURL: "https://openrouter.ai/api/v1",
			apiKey: process.env.GEMINI_FLASH_2_API_KEY,
		});
	}

	cleanJsonResponse(response) {
		// Remove markdown code blocks and any extra whitespace
		let cleaned = response
			.replace(/```json\n/g, "")
			.replace(/```/g, "")
			.trim();

		// If response starts with a newline, remove it
		cleaned = cleaned.replace(/^\n+/, "");

		// If there are multiple JSON objects, take the first one
		if (cleaned.includes("}{")) {
			cleaned = cleaned.split("}{")[0] + "}";
		}

		return cleaned;
	}

	async getBattleDecision(battleContext) {
		const prompt = `You are the world's best Pokemon Random Battle player. This is a format where you receive a random team of pokemon and battle an opponent who also has a random team. You don't know your opponent's team, they don't know yours until you two reveal your mons and movesets throughout the battle. Analyze the battle context and return a JSON object WITHOUT any markdown formatting or code blocks. Just the raw JSON object.

Battle Context:
${battleContext.join("\n")}

Return a single JSON object with exactly these fields (no markdown, no code blocks):
{
    "explanation": "A detailed explanation of your move choice and current situation",
    "action": {
        "type": "move|switch|teramove",
        "choice": number (1-4 for moves/teramoves, 1-6 for switches)
    },
    "strategies": "Long-term strategic plan based on known information"
}

Example 1:
{
    "explanation": "This is turn 1, and we have Bronzong with Stealth Rock. Setting up entry hazards early will pressure their team and punish switches throughout the battle.",
    "action": {
        "type": "move",
        "choice": 3
    },
    "strategies": "1. Get Stealth Rock up early with Bronzong\\n2. Use Flutter Mane's Choice Specs for offensive pressure\\n3. Utilize Morpeko for item removal\\n4. Save Indeedee-M for Psychic Terrain sweeping\\n5. Use Articuno as a defensive pivot\\n6. Keep Registeel as our defensive core"
}

Example 2:
{
    "explanation": "Our current Pokemon is weak to their type coverage. Switching to our defensive wall gives us better matchup.",
    "action": {
        "type": "switch",
        "choice": 2
    },
    "strategies": "Maintain defensive core while setting up hazards. Look for opportunities to bring in our sweepers safely."
}

IMPORTANT: Return ONLY the JSON object. No markdown. No code blocks. No extra text.`;

		try {
			const completion = await this.openai.chat.completions.create({
				model: "google/gemini-2.0-flash-exp:free",
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				response_model: { schema: responseSchema },
			});

			const cleanedResponse = this.cleanJsonResponse(
				completion.choices[0].message.content
			);
			// console.log("Cleaned response:", cleanedResponse);

			const response = JSON.parse(cleanedResponse);
			const validatedResponse = responseSchema.parse(response);

			// console.log("LLM Response:", validatedResponse);

			return validatedResponse;
		} catch (error) {
			console.error("Error getting battle decision:", error);
			if (error instanceof z.ZodError) {
				console.error("Validation error:", error.errors);
			} else if (error instanceof SyntaxError) {
				console.error(
					"JSON parsing error. Raw response:",
					completion?.choices[0]?.message?.content
				);
			}
			return null;
		}
	}
}

const router = new OpenRouterAPI();
await router.getBattleDecision([
	"Battle started:\n",
	"\n=== YOUR TEAM ===\n1. Flutter Mane, L74    | protosynthesis  | choicespecs     | HP: 203/203 | Moves: thunderbolt, moonblast, mysticalfire, shadowball\n2. Registeel, L81       | clearbody       | leftovers       | HP: 262/262 | Moves: bodypress, ironhead, irondefense, thunderwave\n3. Bronzong, L88        | levitate        | leftovers       | HP: 261/261 | Moves: stealthrock, psychic, ironhead, hypnosis\n4. Articuno, L86        | pressure        | heavydutyboots  | HP: 295/295 | Moves: haze, bravebird, freezedry, roost\n5. Morpeko, L88, F      | hungerswitch    | leftovers       | HP: 245/245 | Moves: knockoff, protect, aurawheel, rapidspin\n6. Indeedee, L84, M     | psychicsurge    | choicescarf     | HP: 238/238 | Moves: hypervoice, expandingforce, shadowball, dazzlinggleam\n",
]);
