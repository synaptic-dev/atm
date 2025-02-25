import { Octokit } from "@octokit/rest";
import { createClient } from '@supabase/supabase-js';
import type { components } from "@octokit/openapi-types";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Optional: Add token for higher rate limits
});

const REPO_OWNER = 'sier-ai';
const REPO_NAME = 'atm';

const SUPABASE_URL = 'https://hnibcchiknipqongruty.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWJjY2hpa25pcHFvbmdydXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NDA3MTksImV4cCI6MjA0NzQxNjcxOX0.ocOf570HeHOoc8ZgKyXeLAJEO90BJ-yQfnPtgBiINKs';

type ContentEntry = components["schemas"]["content-directory"][number];

export interface Tool {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  capabilities: Array<{
    name: string;
    description: string;
    schema: Record<string, unknown>;
    runnerCode: string;
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
      directories.map(async (dir: ContentEntry) => {
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
      capabilities.map(async (cap: ContentEntry) => {
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

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GithubError {
  message: string;
  documentation_url?: string;
}

export async function getGithubUser(accessToken: string): Promise<GithubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const error = (await response.json()) as GithubError;
    throw new Error(error.message);
  }

  return response.json() as Promise<GithubUser>;
}

export async function handleGithubCallback(code: string): Promise<{ access_token: string; user_id: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for access token');
  }

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    throw new Error(tokenData.error_description || 'Failed to exchange code for access token');
  }

  const accessToken = tokenData.access_token;

  // Get user info from GitHub
  const user = await getGithubUser(accessToken);

  // Store user info in Supabase
  const { data: userData, error: userError } = await supabase
    .from('users')
    .upsert({
      id: user.id.toString(),
      github_login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      access_token: accessToken,
    })
    .select()
    .single();

  if (userError) {
    throw new Error(`Failed to store user data: ${userError.message}`);
  }

  if (!userData) {
    throw new Error('Failed to get user data after storing');
  }

  return {
    access_token: accessToken,
    user_id: userData.id,
  };
} 