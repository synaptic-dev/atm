import { z } from 'zod';

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

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }
}

export default Tool;
