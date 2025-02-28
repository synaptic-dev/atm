import { z } from 'zod';
import { ToolCapabilityOptions } from './types';

export class ToolCapability<T extends z.ZodType = z.ZodObject<{}>> {
  constructor(options: ToolCapabilityOptions<T>) {
    this.name = options.name;
    this.description = options.description;
    
    // Default schema if not provided
    const defaultSchema = z.object({}) as unknown as T;
    this.schema = options.schema ?? defaultSchema;
    
    // If schema is provided, use the provided runner
    // If schema is not provided, ensure the runner works with empty object
    this.runner = options.runner;
  }

  public name: string;
  public description: string;
  public schema: T;
  public runner: (params: z.infer<T>) => Promise<any>;
}

export default ToolCapability; 