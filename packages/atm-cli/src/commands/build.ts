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
    console.log('Cleaning atm-dist directory...');
    removeDirectory(distDir);

    // Create fresh dist directory
    console.log('Creating fresh atm-dist directory...');
    fs.mkdirSync(distDir);

    // Create capabilities directory
    const capabilitiesDir = path.join(distDir, 'capabilities');
    fs.mkdirSync(capabilitiesDir);

    // Import the module from the entry path
    const entryPath = path.resolve(process.cwd(), entryFile);
    console.log('Loading from:', entryPath);
    
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry file not found: ${entryPath}`);
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
      console.log('Detected Tool instance');
      tools = [exportedItem];
      name = exportedItem.getName();
      description = exportedItem.getDescription();
    } else if (isToolkit(exportedItem)) {
      // It's a Toolkit instance
      console.log('Detected Toolkit instance');
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
      throw new Error('Entry file must export a Tool or Toolkit instance as default export');
    }

    const handle = toKebabCase(name);
    let allProcessedCapabilities: any[] = [];

    // Process each tool
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const toolName = tool.getName();
      console.log(`Processing tool: ${toolName} (${i + 1}/${tools.length})`);
      
      // Process each capability
      const capabilities = tool.getCapabilities();
      console.log(`Found ${capabilities.length} capabilities in tool ${toolName}`);

      const processedCapabilities = await Promise.all(capabilities.map(async (capability: ToolCapability<any>) => {
        const { name, description, schema, runner } = capability;
        const key = toKebabCase(name);
        
        // Create a subfolder for each tool in a toolkit
        let capabilityDirPath;
        if (isAToolkit) {
          const toolDir = path.join(capabilitiesDir, toKebabCase(toolName));
          if (!fs.existsSync(toolDir)) {
            fs.mkdirSync(toolDir);
          }
          capabilityDirPath = path.join(toolDir, key);
        } else {
          capabilityDirPath = path.join(capabilitiesDir, key);
        }
        
        console.log('Processing capability:', name);
        fs.mkdirSync(capabilityDirPath);

        // Save schema to its own file
        const schemaPath = path.join(capabilityDirPath, 'schema.ts');
        console.log('Saving schema to:', schemaPath);
        
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

        const capabilityInfo = {
          key,
          name,
          description,
          toolName: isAToolkit ? toolName : undefined // Include tool name if it's a toolkit
        };

        return capabilityInfo;
      }));

      allProcessedCapabilities = [...allProcessedCapabilities, ...processedCapabilities];
    }

    // Generate metadata
    const metadata = {
      name,
      handle,
      description,
      isToolkit: isAToolkit,
      capabilities: allProcessedCapabilities
    };

    // Save metadata
    fs.writeFileSync(
      path.join(distDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\nBuild completed successfully!');
    console.log('Tool:', { name, handle, description, isToolkit: isAToolkit });
    console.log(`Processed ${tools.length} tools with ${allProcessedCapabilities.length} total capabilities`);
  } catch (error: any) {
    console.error('Build failed:', error?.message || error);
    process.exit(1);
  }
} 