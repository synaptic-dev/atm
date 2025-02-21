import { z } from 'zod';
import { ToolCapability } from '@synaptic-ai/toolmaker';

const greetSchema = z.object({
  name: z.string().describe("Name of the person to greet")
}).describe("Parameters for greeting");

export const greetCapability = new ToolCapability({
  name: 'Greet',
  description: 'Greets a person by name',
  schema: greetSchema,
  runner: async (params) => {
    return {
      message: `Hello, ${params.name}!`,
      timestamp: new Date().toISOString()
    };
  }
});
