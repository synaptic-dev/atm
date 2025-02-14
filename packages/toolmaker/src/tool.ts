import { z } from 'zod';

type JsonSchema = {
  type: 'function';
  function: {
    name: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      description?: string;
    };
    description: string;
  };
};

type ZodSchema = z.ZodType<any>;

type Schema = JsonSchema | ZodSchema;

// Helper type to extract parameter types from schema
type InferParams<T extends Schema> = T extends JsonSchema 
  ? T['function']['parameters']['properties'] extends Record<string, { type: string }>
    ? {
        [K in keyof T['function']['parameters']['properties']]: T['function']['parameters']['properties'][K]['type'] extends 'string'
          ? string
          : T['function']['parameters']['properties'][K]['type'] extends 'number'
          ? number
          : T['function']['parameters']['properties'][K]['type'] extends 'boolean'
          ? boolean
          : any;
      }
    : Record<string, any>
  : T extends ZodSchema
    ? z.infer<T>
    : never;

interface Capability<T extends Schema = Schema> {
  name: string;
  schema: T;
  description: string;
  runner: (input: InferParams<T>) => Promise<any>;
}

interface ToolData {
  capabilities: Capability<Schema>[];
}

class Tool {
  private capabilities: Capability<Schema>[];

  constructor(capabilities: Capability<Schema>[] = []) {
    this.capabilities = capabilities;
  }

  addCapability<T extends Schema>(capability: Capability<T>): Tool {
    this.capabilities.push(capability as Capability<Schema>);
    return this;
  }

  toJSON(): ToolData {
    return {
      capabilities: this.capabilities
    };
  }
}

export default Tool;

// Example usage:
/*
import Tool from './toolmaker';

// Using JSON Schema
const jsonTool = new Tool(
  'JSON Schema Tool',
  'Example using JSON Schema'
);

jsonTool.addCapability(
  'Get Answer',
  {
    type: 'function',
    function: {
      name: 'get_answer',
      parameters: {
        type: 'object',
        properties: {},
        description: 'No parameters needed'
      },
      description: 'Returns 42'
    }
  },
  'Returns 42',
  async () => ({ answer: 42 })
);

// Using Zod Schema
const zodTool = new Tool(
  'Zod Tool',
  'Example using Zod'
);

const schema = z.object({
  name: z.string(),
  age: z.number()
});

zodTool.addCapability(
  'Greet',
  schema,
  'Greets a person',
  async (input) => ({ greeting: `Hello ${input.name}, you are ${input.age} years old!` })
);
*/ 