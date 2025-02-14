import { z } from 'zod';
import { Tool } from '@synaptic-ai/atm';

const tool = new Tool();

const catchSchema = z.object({
  trainer_name: z.string().optional().describe("Your name as a Pokemon trainer")
}).describe("Parameters for catching a random Pokemon");

interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string;
  };
  types: Array<{
    type: {
      name: string;
    };
  }>;
}

tool.addCapability({
  name: 'Catch Pokemon',
  description: 'Randomly catches a Pokemon from any generation',
  schema: catchSchema,
  runner: async (params: z.infer<typeof catchSchema>) => {
    // Random Pokemon ID (up to Gen 9)
    const randomId = Math.floor(Math.random() * 1008) + 1;
    
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}/`);
    if (!response.ok) {
      throw new Error('Failed to catch Pokemon!');
    }
    
    const pokemon: Pokemon = await response.json();
    
    return {
      message: `${params.trainer_name ? params.trainer_name + " caught" : "You caught"} a wild ${pokemon.name}!`,
      pokemon: {
        id: pokemon.id,
        name: pokemon.name,
        height: pokemon.height / 10, // convert to meters
        weight: pokemon.weight / 10, // convert to kg
        sprite: pokemon.sprites.front_default,
        types: pokemon.types.map(t => t.type.name)
      },
      timestamp: new Date().toISOString()
    };
  }
});

export default tool; 