import { z } from "zod";
import openkit from "@opkt/openkit";
import axios from "axios";

/**
 * Pokemon Tool - Multi-capability tool for working with Pokemon data
 *
 * Capabilities:
 * 1. Capture: Randomly captures a Pokemon by making an API call to PokeAPI
 * 2. Location: Get information about Pokemon locations from PokeAPI
 */

// Create a logging middleware
const logMiddleware = async (context: any, next: () => Promise<any>) => {
  console.log(`[Pokemon Tool] Starting request...`);
  const start = Date.now();

  try {
    // Execute the handler
    const result = await next();

    // Log successful response
    const duration = Date.now() - start;
    console.log(`[Pokemon Tool] Request completed in ${duration}ms`);

    // Log specific information based on the type of result
    if (result.name && result.id) {
      if (result.types) {
        // This is a Pokemon capture result
        console.log(
          `[Pokemon Tool] Captured: ${result.name} (ID: ${result.id})`,
        );
      } else if (result.region) {
        // This is a Location result
        console.log(
          `[Pokemon Tool] Location: ${result.name} (ID: ${result.id}, Region: ${result.region.name})`,
        );
      }
    }

    return result;
  } catch (error) {
    // Log error
    const duration = Date.now() - start;
    console.error(`[Pokemon Tool] Request failed after ${duration}ms:`, error);
    throw error;
  }
};

// Define the Pokemon tool
const pokemonTool = openkit
  .tool({
    name: "Pokemon",
    description: "Tool for working with Pokemon data from PokeAPI",
  })
  // Capture capability
  .capability({
    name: "Capture",
    description: "Capture a random Pokemon",
  })
  .input(
    z.object({
      // Optional parameter to specify a particular Pokemon ID
      id: z
        .number()
        .int()
        .min(1)
        .max(1025)
        .optional()
        .describe(
          "Optional Pokemon ID to capture. If not provided, a random Pokemon will be captured.",
        ),
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
  .use(logMiddleware)
  .handler(async ({ input }) => {
    try {
      // Generate a random Pokemon ID if none is provided
      const pokemonId = input.id || Math.floor(Math.random() * 1025) + 1;

      // Call the PokeAPI
      const response = await axios.get(
        `https://pokeapi.co/api/v2/pokemon/${pokemonId}`,
      );
      const data = response.data;

      // Return selected fields from the API response
      return {
        id: data.id,
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
  .capability({
    name: "Location",
    description: "Get information about Pokemon locations",
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
  .output(
    z.object({
      id: z.number(),
      name: z.string(),
      region: z.object({
        name: z.string(),
        url: z.string(),
      }),
      areas: z.array(
        z.object({
          name: z.string(),
          url: z.string(),
        }),
      ),
      names: z.array(
        z.object({
          name: z.string(),
          language: z.object({
            name: z.string(),
            url: z.string(),
          }),
        }),
      ),
      game_indices: z.array(
        z.object({
          game_index: z.number(),
          generation: z.object({
            name: z.string(),
            url: z.string(),
          }),
        }),
      ),
    }),
  )
  .use(logMiddleware)
  .handler(async ({ input }) => {
    try {
      // Call the PokeAPI
      const response = await axios.get(
        `https://pokeapi.co/api/v2/location/${input.id}`,
      );
      const data = response.data;

      // Return the location data
      return {
        id: data.id,
        name: data.name,
        region: data.region,
        areas: data.areas,
        names: data.names,
        game_indices: data.game_indices,
      };
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
      const englishName =
        result.names.find((n) => n.language.name === "en")?.name || result.name;

      // Format location areas
      const areasString = result.areas
        .map((area) => {
          // Convert kebab-case to title case
          return area.name
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        })
        .join(", ");

      // Format game generations
      const gamesString = result.game_indices
        .map((g) => {
          return g.generation.name
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        })
        .join(", ");

      // Build the response
      let response = `Location: ${englishName} (ID: ${result.id})\n\n`;
      response += `Region: ${result.region.name.charAt(0).toUpperCase() + result.region.name.slice(1)}\n`;

      if (areasString) {
        response += `Areas: ${areasString}\n`;
      }

      if (gamesString) {
        response += `Featured in: ${gamesString}\n`;
      }

      return response;
    },
    error: (error) => `Failed to get location information: ${error.message}`,
  });

export default pokemonTool;
