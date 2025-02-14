import { z } from 'zod';
import { Tool } from '@synaptic-ai/atm';

const tool = new Tool();

const addSchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number")
}).describe("Parameters for adding two numbers");

const multiplySchema = z.object({
  a: z.number().describe("First number"),
  b: z.number().describe("Second number")
}).describe("Parameters for multiplying two numbers");

tool.addCapability({
  name: 'Add Numbers',
  description: 'Adds two numbers together',
  schema: addSchema,
  runner: async (params: z.infer<typeof addSchema>) => ({
    result: params.a + params.b,
    timestamp: new Date().toISOString()
  })
});

tool.addCapability({
  name: 'Multiply Numbers',
  description: 'Multiplies two numbers together',
  schema: multiplySchema,
  runner: async (params: z.infer<typeof multiplySchema>) => ({
    result: params.a * params.b,
    timestamp: new Date().toISOString()
  })
});

export default tool; 