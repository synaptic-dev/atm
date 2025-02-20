import { z } from 'zod';

const greetSchema = z.object({
  name: z.string().describe("Name of the person to greet")
}).describe("Parameters for greeting");

export const greetCapability = {
  name: 'Greet',
  description: 'Greets a person by name',
  schema: greetSchema,
  runner: async (params: z.infer<typeof greetSchema>) => {
    return {
      message: `Hello, ${params.name}!`,
      timestamp: new Date().toISOString()
    };
  }
};
