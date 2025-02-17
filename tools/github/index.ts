import { z } from 'zod';
import { Tool } from '@synaptic-ai/atm';

const tool = new Tool();

const createRepoSchema = z.object({
  name: z.string().describe("Name of the repository to create")
}).describe("Parameters for creating a new GitHub repository");

const listReposSchema = z.object({
  type: z.enum(['all', 'owner', 'member']).optional().describe("Limit results to repositories of the specified type"),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional().describe("The property to sort the results by"),
  direction: z.enum(['asc', 'desc']).optional().describe("The order to sort by"),
  per_page: z.number().min(1).max(100).optional().describe("The number of results per page (max 100)"),
  page: z.number().min(1).optional().describe("The page number of the results to fetch")
}).describe("Parameters for listing repositories for the authenticated user");

const addFileSchema = z.object({
  owner: z.string().describe("The account owner of the repository"),
  repo: z.string().describe("The name of the repository"),
  path: z.string().describe("The path to the file you want to create or update"),
  content: z.string().describe("The new file content, encoded in base64"),
  message: z.string().describe("The commit message"),
  branch: z.string().optional().describe("The branch name. Default: the repository's default branch"),
  sha: z.string().optional().describe("Required if you are updating a file. The blob SHA of the file being replaced")
}).describe("Parameters for creating or updating a file in a repository");

const createCodespaceSchema = z.object({
  owner: z.string().describe("The account owner of the repository"),
  repo: z.string().describe("The name of the repository"),
  ref: z.string().optional().describe("Git ref (branch/commit SHA) to create the codespace from. Default: the default branch"),
  location: z.string().optional().describe("Location for this codespace. Use 'createForAuthenticatedUser' action to get a list of available locations"),
  machine: z.string().optional().describe("Machine type to use for this codespace. Use 'createForAuthenticatedUser' action to get a list of available machine types"),
  display_name: z.string().optional().describe("Display name for this codespace"),
  retention_period_minutes: z.number().optional().describe("Duration in minutes after codespace has gone idle in which it will be deleted"),
  working_directory: z.string().optional().describe("Working directory for this codespace"),
  idle_timeout_minutes: z.number().optional().describe("Time in minutes before codespace stops from inactivity")
}).describe("Parameters for creating a codespace in a repository");

const updateContentSchema = z.object({
  owner: z.string().describe("The account owner of the repository"),
  repo: z.string().describe("The name of the repository"),
  path: z.string().describe("The path to the file you want to update"),
  content: z.string().describe("The new file content (will be automatically encoded in base64)"),
  message: z.string().describe("The commit message"),
  branch: z.string().optional().describe("The branch name. Default: the repository's default branch")
}).describe("Parameters for updating a file's content in a repository");

tool.addCapability({
  name: 'Create Repository',
  description: 'Creates a new GitHub repository for the authenticated user',
  schema: createRepoSchema,
  runner: async (input: any) => {
    const { accessToken, name } = input;

    if (!accessToken) {
      return {
        error: "Missing accessToken",
        status: 400
      };
    }

    try {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ATM-GitHub-Tool'
        },
        body: JSON.stringify({
          name,
          auto_init: true
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return {
          error: responseText,
          status: response.status
        };
      }

      if (!response.ok) {
        return {
          error: data.message || "Failed to create repository",
          status: response.status
        };
      }

      return {
        data: {
          name: data.name,
          full_name: data.full_name,
          html_url: data.html_url,
          clone_url: data.clone_url,
          created_at: data.created_at
        },
        status: 200
      };
    } catch (error: any) {
      return {
        error: "Failed to create repository",
        details: error?.message || "Unknown error",
        status: 500
      };
    }
  }
});

tool.addCapability({
  name: 'List Repositories',
  description: 'Lists repositories for the authenticated user',
  schema: listReposSchema,
  runner: async (input: any) => {
    const { accessToken, ...params } = input;

    if (!accessToken) {
      return {
        error: "Missing accessToken",
        status: 400
      };
    }

    try {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.direction) queryParams.append('direction', params.direction);
      if (params.per_page) queryParams.append('per_page', params.per_page.toString());
      if (params.page) queryParams.append('page', params.page.toString());

      const url = `https://api.github.com/user/repos${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ATM-GitHub-Tool'
        }
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return {
          error: responseText,
          status: response.status
        };
      }

      if (!response.ok) {
        return {
          error: data.message || "Failed to list repositories",
          status: response.status
        };
      }

      return {
        data: data.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          html_url: repo.html_url,
          description: repo.description,
          fork: repo.fork,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          pushed_at: repo.pushed_at,
          language: repo.language,
          forks_count: repo.forks_count,
          stargazers_count: repo.stargazers_count,
          watchers_count: repo.watchers_count,
          default_branch: repo.default_branch,
          visibility: repo.visibility
        })),
        status: 200
      };
    } catch (error: any) {
      return {
        error: "Failed to list repositories",
        details: error?.message || "Unknown error",
        status: 500
      };
    }
  }
});

tool.addCapability({
  name: 'Add File',
  description: 'Creates a new file or updates an existing file in a repository. Content will be automatically encoded in base64.',
  schema: addFileSchema,
  runner: async (input: any) => {
    const { accessToken, owner, repo, path, content, message, branch, sha } = input;

    if (!accessToken) {
      return {
        error: "Missing accessToken",
        status: 400
      };
    }

    try {
      // Convert content to base64 using btoa (built-in browser API)
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const body: any = {
        message,
        content: base64Content,
      };

      if (branch) {
        body.branch = branch;
      }

      if (sha) {
        body.sha = sha;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ATM-GitHub-Tool'
        },
        body: JSON.stringify(body)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return {
          error: responseText,
          status: response.status
        };
      }

      if (!response.ok) {
        return {
          error: data.message || "Failed to add file",
          status: response.status
        };
      }

      return {
        data: {
          content: {
            name: data.content.name,
            path: data.content.path,
            sha: data.content.sha,
            size: data.content.size,
            url: data.content.url,
            html_url: data.content.html_url,
            git_url: data.content.git_url,
            download_url: data.content.download_url,
            type: data.content.type
          },
          commit: {
            sha: data.commit.sha,
            url: data.commit.url,
            html_url: data.commit.html_url,
            message: data.commit.message
          }
        },
        status: 200
      };
    } catch (error: any) {
      return {
        error: "Failed to add file",
        details: error?.message || "Unknown error",
        status: 500
      };
    }
  }
});

tool.addCapability({
  name: 'Create Codespace',
  description: 'Creates a new codespace in a GitHub repository. Returns web URL for editing and preview URL for port 3000.',
  schema: createCodespaceSchema,
  runner: async (input: any) => {
    const { accessToken, owner, repo, ...params } = input;

    if (!accessToken) {
      return {
        error: "Missing accessToken",
        status: 400
      };
    }

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/codespaces`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ATM-GitHub-Tool'
        },
        body: JSON.stringify(params)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return {
          error: responseText,
          status: response.status
        };
      }

      if (!response.ok) {
        return {
          error: data.message || "Failed to create codespace",
          status: response.status
        };
      }

      // Create preview URL by replacing .github.dev with -3000.app.github.dev
      const previewUrl = data.web_url.replace('.github.dev', '-3000.app.github.dev');

      return {
        data: {
          web_url: data.web_url,
          preview_url: previewUrl
        },
        status: 200
      };
    } catch (error: any) {
      return {
        error: "Failed to create codespace",
        details: error?.message || "Unknown error",
        status: 500
      };
    }
  }
});

tool.addCapability({
  name: 'Update Content',
  description: 'Updates content of an existing file in a repository. Content will be automatically encoded in base64.',
  schema: updateContentSchema,
  runner: async (input: any) => {
    const { accessToken, owner, repo, path, content, message, branch } = input;

    if (!accessToken) {
      return {
        error: "Missing accessToken",
        status: 400
      };
    }

    try {
      // First, get the current file to get its SHA
      const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${branch ? '?ref=' + branch : ''}`;
      const getResponse = await fetch(getUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ATM-GitHub-Tool'
        }
      });

      const getResponseText = await getResponse.text();
      let currentFile;
      try {
        currentFile = JSON.parse(getResponseText);
      } catch (e) {
        return {
          error: getResponseText,
          status: getResponse.status
        };
      }

      if (!getResponse.ok) {
        return {
          error: currentFile.message || "Failed to get current file",
          status: getResponse.status
        };
      }

      // Convert content to base64 using btoa (built-in browser API)
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      // Update the file with new content
      const updateUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const body: any = {
        message,
        content: base64Content,
        sha: currentFile.sha
      };

      if (branch) {
        body.branch = branch;
      }

      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${accessToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'ATM-GitHub-Tool'
        },
        body: JSON.stringify(body)
      });

      const updateResponseText = await updateResponse.text();
      let data;
      try {
        data = JSON.parse(updateResponseText);
      } catch (e) {
        return {
          error: updateResponseText,
          status: updateResponse.status
        };
      }

      if (!updateResponse.ok) {
        return {
          error: data.message || "Failed to update file",
          status: updateResponse.status
        };
      }

      return {
        data: {
          content: {
            name: data.content.name,
            path: data.content.path,
            sha: data.content.sha,
            size: data.content.size,
            url: data.content.url,
            html_url: data.content.html_url,
            git_url: data.content.git_url,
            download_url: data.content.download_url,
            type: data.content.type
          },
          commit: {
            sha: data.commit.sha,
            url: data.commit.url,
            html_url: data.commit.html_url,
            message: data.commit.message
          }
        },
        status: 200
      };
    } catch (error: any) {
      return {
        error: "Failed to update file",
        details: error?.message || "Unknown error",
        status: 500
      };
    }
  }
});

export default tool; 