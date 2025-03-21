import { z } from "zod";
import openkit from "@opkt/openkit";
import axios from "axios";

/**
 * Pokemon AFA(Apps-for-AI) app
 *
 * Routes:
 * 1. Capture: Randomly captures a Pokemon
 * 2. Location: Get information about Pokemon locations
 */

const pokemonApp = openkit
  .app({
    name: "Pokemon",
    description: "App for working with Pokemon data from PokeAPI",
  })
  .context({
    apiBaseUrl: "https://pokeapi.co/api/v2",
  })
  .route({
    name: "Capture",
    description: "Capture a random Pokemon",
    path: "/capture",
  })
  .input(
    z.object({
      // Optional parameter to specify a particular Pokemon ID
      id: z
        .number()
        .int()
        .describe(
          "Pokemon ID to capture. If not provided, a random Pokemon will be captured.",
        )
        .default(Math.floor(Math.random() * 1000) + 1),
    }),
  )
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
      types: z.array(
        z.object({
          type: z.object({
            name: z.string(),
          }),
        }),
      ),
      stats: z.array(
        z.object({
          base_stat: z.number(),
          stat: z.object({
            name: z.string(),
          }),
        }),
      ),
      height: z.number(),
      weight: z.number(),
      sprites: z.object({
        front_default: z.string().nullable(),
      }),
      abilities: z.array(
        z.object({
          ability: z.object({
            name: z.string(),
          }),
          is_hidden: z.boolean(),
        }),
      ),
    }),
  )
  .handler(async ({ input, context }) => {
    try {
      // Generate a random Pokemon ID if none is provided
      const pokemonId = input.id || Math.floor(Math.random() * 1025) + 1;

      // Call the PokeAPI using the URL from context
      const response = await axios.get(
        `${context.apiBaseUrl}/pokemon/${pokemonId}`,
      );
      const data = response.data;

      // Using correct types that match the output schema
      return {
        id: pokemonId, // Correct: number type as required by schema
        name: data.name,
        types: data.types,
        stats: data.stats,
        height: data.height,
        weight: data.weight,
        sprites: {
          front_default: data.sprites.front_default,
        },
        abilities: data.abilities,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to capture Pokemon: ${error.response?.status} ${error.response?.statusText}`,
        );
      } else {
        throw new Error(
          `Failed to capture Pokemon: ${(error as Error).message}`,
        );
      }
    }
  })
  .llm({
    success: (result) => {
      // Format the Pokemon data for LLM display
      const typesString = result.types.map((t) => t.type.name).join(", ");
      const statsString = result.stats
        .map((s) => `${s.stat.name}: ${s.base_stat}`)
        .join(", ");
      const abilitiesString = result.abilities
        .map((a) => `${a.ability.name}${a.is_hidden ? " (hidden)" : ""}`)
        .join(", ");

      let response = `Successfully captured ${result.name.charAt(0).toUpperCase() + result.name.slice(1)} (ID: ${result.id})!\n\n`;
      response += `Type: ${typesString}\n`;
      response += `Stats: ${statsString}\n`;
      response += `Height: ${result.height / 10}m, Weight: ${result.weight / 10}kg\n`;
      response += `Abilities: ${abilitiesString}\n`;

      if (result.sprites.front_default) {
        response += `\nImage URL: ${result.sprites.front_default}`;
      }

      return response;
    },
    error: (error) => `Failed to capture Pokemon: ${error.message}`,
  })
  .route({
    name: "Location",
    description: "Get information about Pokemon locations",
    path: "/location",
  })
  .input(
    z.object({
      // Parameter to specify the location ID
      id: z
        .number()
        .int()
        .min(1)
        .describe(
          "The ID of the location to look up. For example, 1 for Canalave City.",
        ),
    }),
  )
  .handler(async ({ input, context }) => {
    try {
      // Call the PokeAPI using the URL from context
      const response = await axios.get(
        `${context.apiBaseUrl}/location/${input.id}`,
      );
      const data = response.data;

      // Return the location data
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get location: ${error.response?.status} ${error.response?.statusText}`,
        );
      } else {
        throw new Error(`Failed to get location: ${(error as Error).message}`);
      }
    }
  })
  .llm({
    success: (result) => {
      // Find English name if available
      return `Location: (ID: ${result.id})`;
    },
    error: (error) => `Failed to get location information: ${error.message}`,
  })
  .debug();

export default pokemonApp;
