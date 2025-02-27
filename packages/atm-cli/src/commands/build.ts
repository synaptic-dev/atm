import path from 'path';
import fs from 'fs';
import { Tool, ToolCapability } from '@synaptic-ai/toolmaker';
import { register } from 'ts-node';
import prettier from 'prettier';
import { createRequire } from 'module';

function toKebabCase(str: string): string {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.map(x => x.toLowerCase())
    .join('-') || '';
}

function removeDirectory(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

export async function buildTool(entryFile: string = 'index.ts') {
  try {
    // Register ts-node to handle TypeScript imports
    register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
      }
    });

    // Clean up existing dist directory
    const distDir = path.join(process.cwd(), 'dist');
    console.log('Cleaning dist directory...');
    removeDirectory(distDir);

    // Create fresh dist directory
    console.log('Creating fresh dist directory...');
    fs.mkdirSync(distDir);

    // Create capabilities directory
    const capabilitiesDir = path.join(distDir, 'capabilities');
    fs.mkdirSync(capabilitiesDir);

    // Import the tool module
    const entryPath = path.resolve(process.cwd(), entryFile);
    console.log('Loading tool from:', entryPath);
    
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry file not found: ${entryPath}`);
    }

    // Create a require function for the current directory
    const require = createRequire(process.cwd() + '/');
    const toolModule = require(entryPath);
    const tool = toolModule.default;

    // Check if it has the expected Tool interface instead of using instanceof
    if (!tool || 
        typeof tool.getName !== 'function' || 
        typeof tool.getDescription !== 'function' || 
        typeof tool.getCapabilities !== 'function') {
      throw new Error('Entry file must export a Tool instance as default export');
    }

    const name = tool.getName();
    const description = tool.getDescription();
    const handle = toKebabCase(name);

    // Process each capability
    const capabilities = tool.getCapabilities();
    console.log(`Found ${capabilities.length} capabilities`);

    const processedCapabilities = await Promise.all(capabilities.map(async (capability: ToolCapability<any>) => {
      const { name, description, schema, runner } = capability;
      const key = toKebabCase(name);
      const capabilityDir = path.join(capabilitiesDir, key);
      
      console.log('Processing capability:', name);
      fs.mkdirSync(capabilityDir);

      // Save schema to its own file
      const schemaPath = path.join(capabilityDir, 'schema.ts');
      console.log('Saving schema to:', schemaPath);
      
      const schemaCode = `import { z } from 'zod';

const schema = z.object({
  ${Object.entries(schema._def.shape()).map(([key, value]: [string, any]) => {
    const description = value._def.description;
    const type = value._def.typeName.toLowerCase().replace('zod', '');
    return `${key}: z.${type}()${description ? `.describe(${JSON.stringify(description)})` : ''}`;
  }).join(',\n  ')}
})${schema._def.description ? `.describe(${JSON.stringify(schema._def.description)})` : ''};

export default schema;`;

      const formattedSchemaCode = await prettier.format(schemaCode, { parser: 'typescript' });
      fs.writeFileSync(schemaPath, formattedSchemaCode);

      // Save runner code
      const runnerPath = path.join(capabilityDir, 'runner.ts');
      console.log('Saving runner to:', runnerPath);

      // Get the runner function string and ensure it uses ParamsType
      const runnerStr = runner.toString();
      const modifiedRunner = runnerStr
        .replace(/async\s*\(([^)]*)\)/, 'async (params: ParamsType)') // Replace params with typed params
        .replace(/function\s*\(([^)]*)\)/, 'function (params: ParamsType)'); // Handle function declaration style

      const runnerCode = `import { z } from 'zod';
import schema from './schema';

type ParamsType = z.infer<typeof schema>;

export default ${modifiedRunner};`;

      const formattedRunnerCode = await prettier.format(runnerCode, { parser: 'typescript' });
      fs.writeFileSync(runnerPath, formattedRunnerCode);

      return {
        key,
        name,
        description
      };
    }));

    // Generate metadata
    const metadata = {
      name,
      handle,
      description,
      capabilities: processedCapabilities
    };

    // Save metadata
    fs.writeFileSync(
      path.join(distDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\nBuild completed successfully!');
    console.log('Tool:', { name, handle, description });
    console.log('Processed capabilities:', processedCapabilities);
  } catch (error: any) {
    console.error('Build failed:', error?.message || error);
    process.exit(1);
  }
} 