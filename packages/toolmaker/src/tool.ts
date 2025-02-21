import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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

type Schema = JsonSchema | z.ZodType;

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
  : T extends z.ZodType
    ? z.infer<T>
    : never;

export interface ToolCapabilityOptions<T extends z.ZodType> {
  name: string;
  description: string;
  schema: T;
  runner: (params: z.infer<T>) => Promise<any>;
}

export class ToolCapability<T extends z.ZodType> {
  constructor(options: ToolCapabilityOptions<T>) {
    this.name = options.name;
    this.description = options.description;
    this.schema = options.schema;
    this.runner = options.runner;
  }

  public name: string;
  public description: string;
  public schema: T;
  public runner: (params: z.infer<T>) => Promise<any>;

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      schema: zodToJsonSchema(this.schema),
      runner: this.runner.toString()
    };
  }

  static fromJSON(json: any): ToolCapability<any> {
    return new ToolCapability({
      name: json.name,
      description: json.description,
      schema: json.schema,
      runner: new Function('return ' + json.runner)()
    });
  }
}

export interface ToolOptions {
  name: string;
  description: string;
}

export class Tool {
  private capabilities: ToolCapability<any>[] = [];
  private name: string;
  private description: string;

  constructor(options: ToolOptions) {
    this.name = options.name;
    this.description = options.description;
  }

  addCapability<T extends z.ZodType>(capability: ToolCapability<T>): Tool {
    this.capabilities.push(capability);
    return this;
  }

  getCapabilities(): ToolCapability<any>[] {
    return this.capabilities;
  }

  toJSON() {
    return {
      name: this.name,
      description: this.description,
      capabilities: this.capabilities.map(cap => cap.toJSON())
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