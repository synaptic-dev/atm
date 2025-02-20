import { build } from 'esbuild';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { Tool } from '../../index';

export async function buildTool(toolPath: string) {
  try {
    // Read atm.json for metadata
    const atmJsonPath = path.join(process.cwd(), 'atm.json');
    if (!fs.existsSync(atmJsonPath)) {
      console.error('No atm.json found in current directory');
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(atmJsonPath, 'utf-8'));
    const { handle } = metadata;

    if (!handle) {
      console.error('No handle found in atm.json');
      process.exit(1);
    }

    // Build the TypeScript file to get capabilities
    const outfile = path.join(process.cwd(), '.temp.mjs');
    await build({
      entryPoints: [path.resolve(toolPath)],
      bundle: true,
      format: 'esm',
      outfile,
      platform: 'node',
    });

    // Import the built tool
    const toolModule = await import(outfile + '?t=' + Date.now());
    const tool: Tool = toolModule.default;
    const { capabilities } = tool.toJSON();

    // Cleanup temp file
    fs.unlinkSync(outfile);

    // Create dist directory
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath);
    }

    // Create capabilities directory
    const capabilitiesPath = path.join(distPath, 'capabilities');
    if (!fs.existsSync(capabilitiesPath)) {
      fs.mkdirSync(capabilitiesPath);
    }

    // Write metadata.json (combining atm.json metadata with capabilities info)
    fs.writeFileSync(
      path.join(distPath, 'metadata.json'),
      JSON.stringify({
        ...metadata,
        capabilities: capabilities.map(({ name, description }) => ({
          name,
          description
        }))
      }, null, 2)
    );

    // Write each capability
    capabilities.forEach((capability) => {
      const capabilityDir = path.join(capabilitiesPath, capability.name.toLowerCase().replace(/\s+/g, '-'));
      if (!fs.existsSync(capabilityDir)) {
        fs.mkdirSync(capabilityDir);
      }

      // Write schema.json
      const jsonSchema = (capability.schema as any).type === 'function'
        ? capability.schema
        : {
            type: 'function',
            function: {
              name: toSnakeCase(capability.name),
              parameters: zodToJsonSchema(capability.schema as z.ZodType),
              description: capability.description
            }
          };
      fs.writeFileSync(
        path.join(capabilityDir, 'schema.json'),
        JSON.stringify(jsonSchema, null, 2)
      );

      // Write runner.ts
      const runnerCode = `export const runner = ${capability.runner.toString()};`;
      fs.writeFileSync(path.join(capabilityDir, 'runner.ts'), runnerCode);
    });

    // Create zip file with handle as name
    const zip = new JSZip();
    const files = fs.readdirSync(distPath, { recursive: true }) as string[];

    // Add all files to the zip
    for (const file of files) {
      const filePath = path.join(distPath, file);
      if (fs.statSync(filePath).isFile()) {
        const fileContent = fs.readFileSync(filePath);
        zip.file(file, fileContent);
      }
    }

    // Generate zip file
    const zipContent = await zip.generateAsync({ type: "nodebuffer" });
    const zipPath = path.join(process.cwd(), `${handle}.zip`);
    fs.writeFileSync(zipPath, zipContent);

    console.log(`Tool built successfully as ${handle}.zip`);
  } catch (error) {
    console.error('Error building tool:', error);
    process.exit(1);
  }
}

function toSnakeCase(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '_');
}
