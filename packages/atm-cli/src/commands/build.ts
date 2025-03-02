import path from 'path';
import fs from 'fs';
import { Tool, ToolCapability } from '@synaptic-ai/toolmaker';
import { register } from 'ts-node';
import prettier from 'prettier';
import { createRequire } from 'module';

// Use duck typing for Toolkit-like objects
type ToolkitLike = {
  getTools: () => Tool[];
};

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

// Check if an object is a Tool
function isTool(obj: any): obj is Tool {
  return obj && 
    typeof obj.getName === 'function' && 
    typeof obj.getDescription === 'function' && 
    typeof obj.getCapabilities === 'function';
}

// Check if an object is Toolkit-like
function isToolkit(obj: any): obj is ToolkitLike {
  return obj && typeof obj.getTools === 'function';
}

export async function buildTool(entryFile: string = 'index.ts') {
  // Dynamically import ora
  let ora;
  try {
    ora = (await import('ora')).default;
  } catch (error) {
    console.error('Failed to initialize. Please try again.');
    process.exit(1);
  }
  
  let spinner = ora('Building ATM Tool...').start();
  
  try {
    // Register ts-node to handle TypeScript imports
    register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
      }
    });

    // Use atm-dist as the output directory
    const distDir = path.join(process.cwd(), 'atm-dist');
    // Silently clean and create dist directory
    removeDirectory(distDir);
    fs.mkdirSync(distDir);

    // Import the module from the entry path
    const entryPath = path.resolve(process.cwd(), entryFile);
    
    if (!fs.existsSync(entryPath)) {
      spinner.fail(`Error: Entry file not found: ${entryPath}`);
      process.exit(1);
    }

    // Create a require function for the current directory
    const require = createRequire(process.cwd() + '/');
    const toolModule = require(entryPath);
    const exportedItem = toolModule.default;

    let tools: Tool[] = [];
    let name = '';
    let description = '';
    let isAToolkit = false;

    // Determine if the export is a Tool or a Toolkit
    if (isTool(exportedItem)) {
      // It's a Tool instance
      tools = [exportedItem];
      name = exportedItem.getName();
      description = exportedItem.getDescription();
    } else if (isToolkit(exportedItem)) {
      // It's a Toolkit instance
      isAToolkit = true;
      tools = exportedItem.getTools();
      
      // For Toolkit, we'll use the name and description of the first tool
      // or provide default values if the toolkit is empty
      if (tools.length > 0) {
        name = `${tools[0].getName()} Toolkit`;
        description = `Toolkit containing multiple tools: ${tools.map(t => t.getName()).join(', ')}`;
      } else {
        name = "Empty Toolkit";
        description = "A toolkit with no tools";
      }
    } else {
      spinner.fail('Error: Entry file must export a Tool or Toolkit instance as default export');
      process.exit(1);
    }

    let allProcessedCapabilities: any[] = [];
    let builtToolNames: string[] = [];

    // Process each tool
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const toolName = tool.getName();
      const toolNameKey = toKebabCase(toolName);
      builtToolNames.push(toolNameKey);
      
      // Create a directory for each tool
      const toolDir = path.join(distDir, toolNameKey);
      if (!fs.existsSync(toolDir)) {
        fs.mkdirSync(toolDir);
      }
      
      // Create capabilities directory for this tool
      const capabilitiesDir = path.join(toolDir, 'capabilities');
      fs.mkdirSync(capabilitiesDir);
      
      // Process each capability
      const capabilities = tool.getCapabilities();

      const processedCapabilities = await Promise.all(capabilities.map(async (capability: ToolCapability<any>) => {
        const { name, description, schema, runner } = capability;
        const key = toKebabCase(name);
        
        // Create directory for this capability
        const capabilityDirPath = path.join(capabilitiesDir, key);
        fs.mkdirSync(capabilityDirPath);

        // Save schema to its own file
        const schemaPath = path.join(capabilityDirPath, 'schema.ts');
        
        const schemaCode = `import { z } from 'zod';

const schema = z.object({
  ${Object.entries(schema._def.shape()).map(([key, value]: [string, any]) => {
    const description = value._def.description;
    
    // Handle optional fields
    if (value._def.typeName === 'ZodOptional') {
      const innerType = value._def.innerType._def.typeName.toLowerCase().replace('zod', '');
      return `${key}: z.${innerType}().optional()${description ? `.describe(${JSON.stringify(description)})` : ''}`;
    }
    
    // Handle default fields
    if (value._def.typeName === 'ZodDefault') {
      const innerType = value._def.innerType._def.typeName.toLowerCase().replace('zod', '');
      const defaultValue = JSON.stringify(value._def.defaultValue());
      return `${key}: z.${innerType}().default(${defaultValue})${description ? `.describe(${JSON.stringify(description)})` : ''}`;
    }
    
    // Handle normal fields
    const type = value._def.typeName.toLowerCase().replace('zod', '');
    return `${key}: z.${type}()${description ? `.describe(${JSON.stringify(description)})` : ''}`;
  }).join(',\n  ')}
})${schema._def.description ? `.describe(${JSON.stringify(schema._def.description)})` : ''};

export default schema;`;

        const formattedSchemaCode = await prettier.format(schemaCode, { parser: 'typescript' });
        fs.writeFileSync(schemaPath, formattedSchemaCode);

        // Save runner code
        const runnerPath = path.join(capabilityDirPath, 'runner.ts');

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

        const capabilityInfo = {
          key,
          name,
          description,
          toolName,
          toolPath: isAToolkit ? toolNameKey : undefined // Path to this tool's directory if it's a toolkit
        };

        return capabilityInfo;
      }));

      // Add processed capabilities to the global list
      allProcessedCapabilities = [...allProcessedCapabilities, ...processedCapabilities];
      
      // Create individual tool metadata.json file
      const toolMetadata = {
        name: toolName,
        handle: toolNameKey,
        description: tool.getDescription(),
        capabilities: processedCapabilities
      };
      
      // Save individual tool metadata
      fs.writeFileSync(
        path.join(toolDir, 'metadata.json'),
        JSON.stringify(toolMetadata, null, 2)
      );
    }

    // Show the key messages with ora
    spinner.succeed('Build successful!');
    
    // Show output path
    spinner = ora('').succeed(`Output path: atm-dist`);
    
    // Show built tool names
    spinner = ora('').succeed(`Built tool${builtToolNames.length > 1 ? 's' : ''}: ${builtToolNames.join(', ')}`);
    
    // Tell user how to publish (as a CTA without checkmark)
    console.log('\nTo publish your tool, run: atm publish');
    
  } catch (error: any) {
    if (spinner) {
      spinner.fail('Build failed');
    }
    console.error(error?.message || error);
    process.exit(1);
  }
} 