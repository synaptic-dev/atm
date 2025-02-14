import { S3Client, GetObjectCommand, ListObjectsV2Command, _Object } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';
import JSZip from 'jszip';

const BUCKET_NAME = 'atm-tools';

console.log('Initializing S3 client with credentials from ~/.aws/credentials');
const s3Client = new S3Client({ 
  region: 'us-west-2',
  credentials: fromIni()
});

// Test the credentials
(async () => {
  try {
    console.log('Testing S3 credentials...');
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1
    }));
    console.log('S3 credentials test successful:', response);
  } catch (error) {
    console.error('S3 credentials test failed:', error);
  }
})();

export interface Tool {
  id: string;
  handle: string;
  name: string;
  description: string;
  version: string;
  author: string;
  capabilities: Array<{
    name: string;
    description: string;
    schema?: any;
    runnerCode?: string;
  }>;
}

export async function getTools(): Promise<Tool[]> {
  try {
    console.log('Listing tools from bucket:', BUCKET_NAME);
    
    // List all tool directories in the bucket
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Delimiter: '/'
    }));

    console.log('S3 ListObjects response:', JSON.stringify(response, null, 2));

    if (!response.CommonPrefixes?.length) {
      console.log('No directories found in bucket');
      return [];
    }

    // Get tool names from directory prefixes
    const toolNames = response.CommonPrefixes.map(prefix => {
      const name = prefix.Prefix?.replace('/', '');
      console.log('Processing directory:', name);
      return name;
    }).filter(Boolean);

    console.log('Found tool names:', toolNames);

    // Fetch metadata.json for each tool
    const tools = await Promise.all(
      toolNames.map(async (toolName) => {
        try {
          console.log(`Fetching metadata for tool: ${toolName}`);
          const { Body } = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `${toolName}/metadata.json`
          }));

          const content = await Body?.transformToString();
          if (!content) {
            console.log(`No content found for ${toolName}/metadata.json`);
            return null;
          }

          console.log(`Metadata content for ${toolName}:`, content);
          const parsedMetadata = JSON.parse(content);
          return {
            id: toolName,
            ...parsedMetadata
          };
        } catch (error) {
          console.error(`Error fetching metadata for ${toolName}:`, error);
          return null;
        }
      })
    );

    const validTools = tools.filter(Boolean) as Tool[];
    console.log('Final tools list:', validTools);
    return validTools;
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
}

export async function getTool(id: string): Promise<Tool | null> {
  try {
    // Fetch and unzip the tool package
    const { Body: zipBody } = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${id}.zip`
    }));

    if (!zipBody) return null;

    // Convert ReadableStream to ArrayBuffer
    const zipBuffer = await new Response(zipBody as ReadableStream).arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);

    // Read metadata.json from zip
    const metadataFile = zip.file('metadata.json');
    if (!metadataFile) return null;

    const metadataContent = await metadataFile.async('string');
    const metadata = JSON.parse(metadataContent);

    // Get capabilities from the zip
    const capabilityDirs = new Set<string>();
    const files = Object.keys(zip.files);
    files.forEach(file => {
      if (file.startsWith('capabilities/')) {
        const parts = file.split('/');
        if (parts.length > 1) {
          capabilityDirs.add(parts[1]);
        }
      }
    });

    // Extract capability details from zip
    const capabilityDetails = await Promise.all(
      Array.from(capabilityDirs).map(async (capName) => {
        try {
          const schemaFile = zip.file(`capabilities/${capName}/schema.json`);
          const runnerFile = zip.file(`capabilities/${capName}/runner.ts`);

          if (!schemaFile || !runnerFile) return null;

          const [schemaContent, runnerContent] = await Promise.all([
            schemaFile.async('string'),
            runnerFile.async('string')
          ]);

          return {
            name: capName,
            schema: JSON.parse(schemaContent),
            runnerCode: runnerContent
          };
        } catch (error) {
          console.error(`Error extracting capability ${capName}:`, error);
          return null;
        }
      })
    );

    return {
      id,
      ...metadata,
      capabilities: capabilityDetails.filter(Boolean)
    };
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
} 