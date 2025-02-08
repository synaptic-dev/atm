import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Optional: Add token for higher rate limits
});

const REPO_OWNER = 'sier-ai';
const REPO_NAME = 'atm';

export interface Tool {
  id: string;
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
    // Get the tools directory contents
    const { data: directories } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: 'tools',
    });

    if (!Array.isArray(directories)) {
      throw new Error('Tools directory not found');
    }

    // Fetch metadata.json for each tool
    const tools = await Promise.all(
      directories.map(async (dir: any) => {
        try {
          const { data: metadata } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: `tools/${dir.name}/metadata.json`,
          });

          if ('content' in metadata) {
            const content = Buffer.from(metadata.content, 'base64').toString();
            const parsedMetadata = JSON.parse(content);
            return {
              id: dir.name,
              ...parsedMetadata,
            };
          }
        } catch (error) {
          console.error(`Error fetching metadata for ${dir.name}:`, error);
        }
        return null;
      })
    );

    return tools.filter(Boolean) as Tool[];
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
}

export async function getTool(id: string): Promise<Tool | null> {
  try {
    // Fetch metadata
    const { data: metadata } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `tools/${id}/metadata.json`,
    });

    if (!('content' in metadata)) {
      return null;
    }

    const parsedMetadata = JSON.parse(Buffer.from(metadata.content, 'base64').toString());

    // Fetch capabilities directory
    const { data: capabilities } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `tools/${id}/capabilities`,
    });

    if (!Array.isArray(capabilities)) {
      return null;
    }

    // Fetch schema and runner for each capability
    const capabilityDetails = await Promise.all(
      capabilities.map(async (cap: any) => {
        const [{ data: schema }, { data: runner }] = await Promise.all([
          octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: `tools/${id}/capabilities/${cap.name}/schema.json`,
          }),
          octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: `tools/${id}/capabilities/${cap.name}/runner.ts`,
          }),
        ]);

        if (!('content' in schema) || !('content' in runner)) {
          return null;
        }

        return {
          name: cap.name,
          schema: JSON.parse(Buffer.from(schema.content, 'base64').toString()),
          runnerCode: Buffer.from(runner.content, 'base64').toString(),
        };
      })
    );

    return {
      id,
      ...parsedMetadata,
      capabilities: capabilityDetails.filter(Boolean),
    };
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
} 