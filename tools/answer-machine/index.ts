import { z } from 'zod';
import { Tool } from '@synaptic-ai/atm';

const tool = new Tool();

// Using Zod schema for simplicity and type safety
const schema = z.object({
  // Empty object since this tool doesn't need any input parameters
}).describe("Parameters for getting the answer to life, the universe, and everything");

tool.addCapability({
  name: 'Get Answer',
  description: 'Returns the answer to life, the universe, and everything',
  schema,
  runner: async () => ({
    answer: 42,
    timestamp: new Date().toISOString()
  })
});

export default tool; 