import { z } from 'zod';
import { Tool } from '@synaptic-ai/atm';

const tool = new Tool();

const createRepoSchema = z.object({
  name: z.string().describe("Name of the repository to create")
}).describe("Parameters for creating a new GitHub repository");

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
          error: data.message || "Unknown error",
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

export default tool; 