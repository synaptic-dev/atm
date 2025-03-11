import path from 'path';
import fs from 'fs';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import { ScriptTarget, ModuleKind } from 'typescript';
import { register } from 'ts-node';
import prettier from 'prettier';
import { createRequire } from 'module';

// Type definitions for Tool and ToolCapability-like objects
interface ToolLike {
  getName: () => string;
  getDescription: () => string;
  getCapabilities: () => ToolCapabilityLike[];
  isSingleCapability?: () => boolean;
}

interface ToolCapabilityLike {
  name: string;
  description: string;
  schema: any;
  runner: (params: any) => Promise<any>;
}

interface ToolkitLike {
  getTools: () => ToolLike[];
}

// Check if an object is a Tool
function isTool(obj: any): obj is ToolLike {
  return obj && 
    typeof obj.getName === 'function' && 
    typeof obj.getDescription === 'function' && 
    typeof obj.getCapabilities === 'function';
}

// Check if an object is Toolkit-like
function isToolkit(obj: any): obj is ToolkitLike {
  return obj && typeof obj.getTools === 'function';
}

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

function ensureDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Determines if a node is a Tool construction 
 */
function isToolConstruction(project: Project, sourceFile: SourceFile, node: any): boolean {
  if (node.getKind() !== SyntaxKind.NewExpression) return false;
  
  const expression = node.getExpression();
  if (!expression) return false;
  
  const expressionText = expression.getText();
  return expressionText === 'Tool';
}

/**
 * Determines if a node is a ToolCapability construction
 */
function isToolCapabilityConstruction(project: Project, sourceFile: SourceFile, node: any): boolean {
  if (node.getKind() !== SyntaxKind.NewExpression) return false;
  
  const expression = node.getExpression();
  if (!expression) return false;
  
  const expressionText = expression.getText();
  return expressionText === 'ToolCapability';
}

/**
 * Extract properties from a Tool or ToolCapability construction
 */
function extractProperties(node: any): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Get the first argument which should be an object literal
  const args = node.getArguments();
  if (args.length === 0) return properties;
  
  const objectLiteral = args[0];
  if (objectLiteral.getKind() !== SyntaxKind.ObjectLiteralExpression) return properties;
  
  // Go through each property in the object literal
  for (const prop of objectLiteral.getProperties()) {
    if (prop.getKind() !== SyntaxKind.PropertyAssignment) continue;
    
    const propName = prop.getName();
    const initializer = prop.getInitializer();
    
    if (initializer) {
      // Simple string or literals
      if (initializer.getKind() === SyntaxKind.StringLiteral ||
          initializer.getKind() === SyntaxKind.NumericLiteral ||
          initializer.getKind() === SyntaxKind.TrueKeyword ||
          initializer.getKind() === SyntaxKind.FalseKeyword) {
        properties[propName] = initializer.getText().replace(/['"]/g, '');
      } else {
        // Other types, just store the text representation
        properties[propName] = initializer.getText();
      }
    }
  }
  
  return properties;
}

/**
 * Save metadata for a tool or capability
 */
function saveMetadata(outputPath: string, metadata: any) {
  try {
    fs.writeFileSync(
      outputPath, 
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error(`Error saving metadata to ${outputPath}:`, error);
  }
}

/**
 * Find all imports from a source file
 */
function findImports(sourceFile: SourceFile): { npmImports: string[], relativeImports: string[] } {
  const npmImports: string[] = [];
  const relativeImports: string[] = [];
  
  sourceFile.getImportDeclarations().forEach(importDecl => {
    const importText = importDecl.getText();
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    
    if (moduleSpecifier.startsWith('.')) {
      relativeImports.push(importText);
    } else {
      // Don't duplicate toolmaker imports as we'll add them explicitly
      if (!moduleSpecifier.includes('@synaptic-ai/toolmaker')) {
        npmImports.push(importText);
      }
    }
  });
  
  return { npmImports, relativeImports };
}

/**
 * Get all declarations and statements from a source file, excluding imports
 */
function getFileContents(sourceFile: SourceFile): string {
  // Get all statements that aren't imports
  const statements = sourceFile.getStatements()
    .filter(statement => statement.getKind() !== SyntaxKind.ImportDeclaration)
    .map(statement => statement.getText())
    .join('\n\n');
  
  return statements;
}

/**
 * Process imports and get contents from imported files
 */
function processImportedFiles(project: Project, relativeImports: string[]): string {
  let importedContent = '';
  const processedFiles = new Set<string>();
  
  for (const importText of relativeImports) {
    const match = importText.match(/from\s+['"](.+)['"]/);
    if (!match) continue;
    
    const importPath = match[1];
    if (!importPath.startsWith('.')) continue;
    
    const sourceFiles = project.getSourceFiles();
    for (const sf of sourceFiles) {
      const filePath = sf.getFilePath();
      const fileName = path.basename(filePath);
      
      // Check if this file matches the import path
      if (importPath === `./${fileName.replace('.ts', '')}` || 
          filePath.endsWith(importPath + '.ts') || 
          filePath.endsWith(importPath)) {
        
        // Skip if already processed
        if (processedFiles.has(filePath)) continue;
        processedFiles.add(filePath);
        
        // Get all contents except imports
        const contents = getFileContents(sf);
        importedContent += contents + '\n\n';
        
        // Find imports from this file and process them recursively
        const { relativeImports: nestedImports } = findImports(sf);
        importedContent += processImportedFiles(project, nestedImports);
      }
    }
  }
  
  return importedContent;
}

/**
 * Process a single-capability tool
 */
async function processSingleCapabilityTool(
  toolName: string,
  toolDescription: string,
  sourceFile: SourceFile,
  distDir: string,
  project: Project
) {
  const toolDir = path.join(distDir, toKebabCase(toolName));
  ensureDirectory(toolDir);
  
  // Get imports from source file
  const { npmImports, relativeImports } = findImports(sourceFile);
  
  // Get imported content
  const importedContent = processImportedFiles(project, relativeImports);
  
  // Get all statements from the source file
  const sourceContent = getFileContents(sourceFile);
  
  // Build the output content
  const outputContent = [
    ...npmImports,
    'import { Tool, ToolCapability } from \'@synaptic-ai/toolmaker\';',
    '',
    importedContent,
    sourceContent
  ].join('\n');
  
  // Format and save the file
  const toolFilePath = path.join(toolDir, 'tool.ts');
  try {
    const formattedCode = await prettier.format(outputContent, { parser: 'typescript' });
    fs.writeFileSync(toolFilePath, formattedCode);
  } catch (error) {
    fs.writeFileSync(toolFilePath, outputContent);
  }
  
  // Save metadata - with the new format
  const metadataPath = path.join(toolDir, 'metadata.json');
  saveMetadata(metadataPath, { 
    name: toolName, 
    description: toolDescription,
    type: "single-capability"
  });
  
  return toolDir;
}

/**
 * Process a multi-capability tool
 */
async function processMultiCapabilityTool(
  toolName: string,
  toolDescription: string,
  capabilities: any[],
  sourceFile: SourceFile,
  distDir: string,
  project: Project
) {
  const toolDir = path.join(distDir, toKebabCase(toolName));
  ensureDirectory(toolDir);
  
  // Get imports from source file
  const { npmImports, relativeImports } = findImports(sourceFile);
  
  // Get imported content
  const importedContent = processImportedFiles(project, relativeImports);
  
  // Get all statements from the source file
  const sourceContent = getFileContents(sourceFile);
  
  // Build the output content for the main tool file
  const outputContent = [
    ...npmImports,
    'import { Tool, ToolCapability } from \'@synaptic-ai/toolmaker\';',
    '',
    importedContent,
    sourceContent
  ].join('\n');
  
  // Format and save the tool file
  const toolFilePath = path.join(toolDir, 'tool.ts');
  try {
    const formattedCode = await prettier.format(outputContent, { parser: 'typescript' });
    fs.writeFileSync(toolFilePath, formattedCode);
  } catch (error) {
    fs.writeFileSync(toolFilePath, outputContent);
  }
  
  // Process capability information for metadata
  const capabilityInfos = capabilities.map(cap => ({
    name: cap.name,
    description: cap.description
  }));
  
  // Save single metadata file with the new format
  const metadataPath = path.join(toolDir, 'metadata.json');
  saveMetadata(metadataPath, {
    name: toolName,
    description: toolDescription,
    type: "multi-capability",
    capabilities: capabilityInfos
  });
  
  // Find schema definitions in the source content
  const schemaMap = new Map();
  const sourceFileContent = sourceFile.getText();
  
  // Parse the source file to find schema definitions
  sourceFile.getVariableDeclarations().forEach(varDecl => {
    const name = varDecl.getName();
    if (name.toLowerCase().includes('schema')) {
      const text = varDecl.getText();
      schemaMap.set(name, text);
    }
  });
  
  // For each capability, create a standalone tool
  for (const capability of capabilities) {
    const capName = capability.name;
    const capKebab = toKebabCase(capName);
    
    // Try to find the schema used for this capability
    let schemaName = '';
    let schemaDefinition = '';
    
    // First look for a direct reference in the variable name
    for (const [name, def] of schemaMap.entries()) {
      if (name.toLowerCase().includes(capName.toLowerCase().replace(/\s+/g, '')) || 
          name.toLowerCase().includes(toKebabCase(capName).replace(/-/g, ''))) {
        schemaName = name;
        schemaDefinition = def;
        break;
      }
    }
    
    // If not found, look for a variable declaration that references the capability
    if (!schemaName) {
      sourceFile.getVariableDeclarations().forEach(varDecl => {
        const initializer = varDecl.getInitializer();
        if (initializer && initializer.getText().includes(`name: '${capName}'`) || initializer?.getText().includes(`name: "${capName}"`)) {
          // Found declaration of this capability, look for schema reference
          const text = initializer.getText();
          const schemaMatch = text.match(/schema:\s*([a-zA-Z0-9_]+)/);
          if (schemaMatch && schemaMatch[1]) {
            schemaName = schemaMatch[1];
            
            // Now find this schema's declaration
            sourceFile.getVariableDeclarations().forEach(schemaDef => {
              if (schemaDef.getName() === schemaName) {
                schemaDefinition = schemaDef.getText();
              }
            });
          }
        }
      });
    }
    
    // Prepare the capability file content
    // Include appropriate schema definitions
    let capFileContent = '';
    
    if (schemaDefinition) {
      // We found the schema, include it in the file
      // Make sure the schema definition has a proper 'const' declaration
      // Check if it already has const or let
      if (!schemaDefinition.trim().startsWith('const') && !schemaDefinition.trim().startsWith('let')) {
        schemaDefinition = 'const ' + schemaDefinition;
      }
      
      capFileContent = [
        ...npmImports,
        'import { Tool } from \'@synaptic-ai/toolmaker\';',
        '',
        schemaDefinition + ';',
        '',
        `const tool = new Tool({`,
        `  name: '${capName}',`,
        `  description: '${capability.description}',`,
        `  schema: ${schemaName},`,
        `  runner: ${capability.runner.toString()}`,
        `});`,
        '',
        `export default tool;`
      ].join('\n');
    } else {
      // Fall back to a generic approach
      capFileContent = [
        ...npmImports,
        'import { Tool } from \'@synaptic-ai/toolmaker\';',
        '',
        `// Schema definition (reconstructed)`,
        `const schema = z.object({});`,
        '',
        `const tool = new Tool({`,
        `  name: '${capName}',`,
        `  description: '${capability.description}',`,
        `  schema: schema,`,
        `  runner: ${capability.runner.toString()}`,
        `});`,
        '',
        `export default tool;`
      ].join('\n');
    }
    
    // Format and save the capability file
    const capFilePath = path.join(toolDir, `${capKebab}.ts`);
    try {
      const formattedCode = await prettier.format(capFileContent, { parser: 'typescript' });
      fs.writeFileSync(capFilePath, formattedCode);
    } catch (error) {
      fs.writeFileSync(capFilePath, capFileContent);
    }
    
    // No longer creating individual capability metadata files
  }
  
  return toolDir;
}

/**
 * Main build function
 */
export async function buildTool(entryFile: string = 'index.ts') {
  // Dynamically import ora
  let ora;
  try {
    ora = (await import('ora')).default;
  } catch (error) {
    console.error('Failed to initialize. Please try again.');
    process.exit(1);
  }
  
  const spinner = ora('Building ATM Tool...').start();
  
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
    // Clean and create dist directory
    removeDirectory(distDir);
    ensureDirectory(distDir);

    // Import the module from the entry path
    const entryPath = path.resolve(process.cwd(), entryFile);
    
    if (!fs.existsSync(entryPath)) {
      spinner.fail(`Error: Entry file not found: ${entryPath}`);
      process.exit(1);
    }

    // Set up ts-morph project
    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2020,
        module: ModuleKind.CommonJS,
      }
    });
    
    // Add the entry file and all files in the directory
    const entryDir = path.dirname(entryPath);
    project.addSourceFilesAtPaths([entryPath, `${entryDir}/**/*.ts`]);
    
    // Create a require function for the current directory
    const require = createRequire(process.cwd() + '/');
    const toolModule = require(entryPath);
    const exportedItem = toolModule.default;

    let tools: ToolLike[] = [];

    // Determine if the export is a Tool or a Toolkit
    if (isTool(exportedItem)) {
      // It's a Tool instance
      tools = [exportedItem];
    } else if (isToolkit(exportedItem)) {
      // It's a Toolkit instance
      tools = exportedItem.getTools();
    } else {
      spinner.fail('Error: Entry file must export a Tool or Toolkit instance as default export');
      process.exit(1);
    }
    
    const entrySourceFile = project.getSourceFile(entryPath);
    if (!entrySourceFile) {
      spinner.fail('Error: Could not find entry source file');
      process.exit(1);
    }
    
    const processedTools: string[] = [];
    
    // Process each tool
    for (const tool of tools) {
      const toolName = tool.getName();
      const toolDesc = tool.getDescription();
      const capabilities = tool.getCapabilities();
      
      if (capabilities.length === 0) {
        spinner.warn(`Warning: Tool "${toolName}" has no capabilities and will be skipped.`);
        continue;
      }
      
      // Find the source file for this tool
      let toolSourceFile = entrySourceFile;
      // If the tool comes from an import, find the file where it's defined
      if (toolName !== path.basename(entryPath, '.ts')) {
        const sourceFiles = project.getSourceFiles();
        for (const sf of sourceFiles) {
          const fileContent = sf.getText();
          if (fileContent.includes(`name: '${toolName}'`) || 
              fileContent.includes(`name: "${toolName}"`)) {
            toolSourceFile = sf;
            break;
          }
        }
      }
      
      if (tool.isSingleCapability && tool.isSingleCapability()) {
        // Process as a single-capability tool
        const toolDir = await processSingleCapabilityTool(
          toolName,
          toolDesc,
          toolSourceFile,
          distDir,
          project
        );
        processedTools.push(path.relative(distDir, toolDir));
      } else {
        // Process as a multi-capability tool
        const toolDir = await processMultiCapabilityTool(
          toolName,
          toolDesc,
          capabilities,
          toolSourceFile,
          distDir,
          project
        );
        processedTools.push(path.relative(distDir, toolDir));
      }
    }
    
    spinner.succeed('Build successful!');
    spinner.succeed(`Output path: atm-dist`);
    spinner.succeed(`Built tools: ${processedTools.join(', ')}`);
    console.log('\nTo publish your tool, run: atm publish');
    
  } catch (error: any) {
    spinner.fail(`Build failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
} 