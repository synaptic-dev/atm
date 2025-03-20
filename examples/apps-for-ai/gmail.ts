import * as fs from "fs/promises";
import * as path from "path";
import * as process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { z } from "zod";
import openkit from "@opkt/openkit";

// Update scopes to include send permission
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "apps-for-ai/token.json");
const CREDENTIALS_PATH = path.join(
  process.cwd(),
  "apps-for-ai/credentials.json",
);

/**
 * Reads previously authorized credentials from the save file.
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content.toString());
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 */
async function saveCredentials(client: any) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content.toString());
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request authorization to call APIs.
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = (await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  })) as any;
  if (client && client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

// Initialize auth before creating the app
let authClient: any = null;
try {
  // Try to initialize auth client - this won't block app creation
  authorize()
    .then((client) => {
      authClient = client;
    })
    .catch(console.error);
} catch (error) {
  console.error("Failed to initialize auth client:", error);
}

// Create the Gmail app with OpenKit
const gmailApp = openkit
  .app({
    name: "Gmail",
    description: "Access and manage Gmail using Google API",
  })
  .context({
    getAuth: async () => {
      // If we already have an auth client, return it
      if (authClient) return authClient;

      // Otherwise try to authorize again
      try {
        authClient = await authorize();
        return authClient;
      } catch (error) {
        throw new Error(`Failed to authenticate: ${(error as Error).message}`);
      }
    },
  })
  // Authentication status route
  .route({
    name: "CheckAuth",
    description: "Check Gmail authentication status",
    path: "check-auth",
  })
  .input(z.object({}))
  .output(
    z.object({
      authenticated: z.boolean(),
      message: z.string(),
    }),
  )
  .handler(async ({ context }) => {
    try {
      const auth = await context.getAuth();
      return {
        authenticated: !!auth,
        message: auth ? "Authentication ready" : "Not authenticated",
      };
    } catch (error) {
      return {
        authenticated: false,
        message: `Authentication error: ${(error as Error).message}`,
      };
    }
  })
  .llm({
    success: (result) =>
      result.authenticated
        ? "Gmail is authenticated and ready to use."
        : `Gmail is not authenticated: ${result.message}`,
    error: (error: Error) =>
      `Gmail authentication check error: ${error.message}`,
  })
  // List labels route
  .route({
    name: "ListLabels",
    description: "Lists the labels in the user's Gmail account",
    path: "list-labels",
  })
  .input(
    z.object({
      userId: z
        .string()
        .default("me")
        .describe("User ID (default is 'me' for authenticated user)"),
    }),
  )
  .output(
    z.object({
      labels: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.string().optional(),
        }),
      ),
    }),
  )
  .handler(async ({ input, context }) => {
    const auth = await context.getAuth();
    if (!auth) {
      throw new Error("Not authenticated. Please authenticate first.");
    }

    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.labels.list({
      userId: input.userId,
    });

    const labels = res.data.labels || [];
    return {
      labels: labels.map((label) => ({
        id: label.id,
        name: label.name,
        type: label.type,
      })),
    };
  })
  .llm({
    success: (result) => {
      if (result.labels.length === 0) {
        return "No Gmail labels found.";
      }

      let response = `Gmail Labels (${result.labels.length} found):\n\n`;
      result.labels.forEach((label) => {
        response += `- ${label.name}${label.type ? ` (${label.type})` : ""}\n`;
      });

      return response;
    },
    error: (error: Error) => `Failed to list Gmail labels: ${error.message}`,
  })
  // List messages route
  .route({
    name: "ListMessages",
    description: "List messages in the user's Gmail account",
    path: "list-messages",
  })
  .input(
    z.object({
      userId: z
        .string()
        .default("me")
        .describe("User ID (default is 'me' for authenticated user)"),
      labelIds: z
        .array(z.string())
        .optional()
        .describe("Only return messages with these label IDs"),
      q: z.string().optional().describe("Gmail search query"),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe("Maximum number of messages to return"),
    }),
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          id: z.string(),
          threadId: z.string(),
          snippet: z.string().optional(),
        }),
      ),
      nextPageToken: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const auth = await context.getAuth();
    if (!auth) {
      throw new Error("Not authenticated. Please authenticate first.");
    }

    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.list({
      userId: input.userId,
      labelIds: input.labelIds,
      q: input.q,
      maxResults: input.maxResults,
    });

    const messages = res.data.messages || [];
    if (!messages.length) {
      return {
        messages: [],
        nextPageToken: res.data.nextPageToken,
      };
    }

    // Get message details
    const messageDetails: Array<{
      id: string;
      threadId?: string;
      snippet: string;
    }> = [];
    for (const msg of messages) {
      try {
        if (!msg.id) continue;

        const details = await gmail.users.messages.get({
          userId: input.userId,
          id: msg.id,
          format: "metadata",
        });

        messageDetails.push({
          id: msg.id,
          threadId: msg.threadId || undefined,
          snippet: details.data?.snippet || "",
        });
      } catch (error) {
        console.error(`Error fetching message ${msg.id}:`, error);
      }
    }

    return {
      messages: messageDetails,
      nextPageToken: res.data.nextPageToken,
    };
  })
  .llm({
    success: (result, input) => {
      if (result.messages.length === 0) {
        return "No Gmail messages found matching your criteria.";
      }

      let searchInfo = `Gmail Messages`;
      if (input.q) {
        searchInfo += ` matching "${input.q}"`;
      }
      if (input.labelIds && input.labelIds.length > 0) {
        searchInfo += ` in labels: ${input.labelIds.join(", ")}`;
      }
      searchInfo += ` (${result.messages.length} found):`;

      let response = `${searchInfo}\n\n`;
      result.messages.forEach((msg, index) => {
        response += `${index + 1}. ID: ${msg.id}\n`;
        if (msg.snippet) {
          response += `   Preview: ${msg.snippet}\n`;
        }
        response += `\n`;
      });

      if (result.nextPageToken) {
        response += `\nMore messages available. Use the nextPageToken to retrieve the next page.`;
      }

      return response;
    },
    error: (error: Error) => `Failed to list Gmail messages: ${error.message}`,
  })
  // Send email route
  .route({
    name: "SendEmail",
    description: "Send an email using Gmail",
    path: "send-email",
  })
  .input(
    z.object({
      to: z.array(z.string().email()).describe("Recipient email addresses"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body content"),
      cc: z.array(z.string().email()).optional().describe("CC recipients"),
      bcc: z.array(z.string().email()).optional().describe("BCC recipients"),
      isHtml: z
        .boolean()
        .default(false)
        .describe("Whether body is HTML content"),
    }),
  )
  .output(
    z.object({
      success: z.boolean(),
      messageId: z.string().optional(),
      error: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const auth = await context.getAuth();
    if (!auth) {
      throw new Error("Not authenticated. Please authenticate first.");
    }

    const gmail = google.gmail({ version: "v1", auth });

    try {
      // Create email content
      const emailLines: string[] = [];

      // Add recipients
      emailLines.push(`To: ${input.to.join(", ")}`);

      // Add CC if provided
      if (input.cc && input.cc.length > 0) {
        emailLines.push(`Cc: ${input.cc.join(", ")}`);
      }

      // Add BCC if provided
      if (input.bcc && input.bcc.length > 0) {
        emailLines.push(`Bcc: ${input.bcc.join(", ")}`);
      }

      // Add subject
      emailLines.push(`Subject: ${input.subject}`);

      // Set content type
      if (input.isHtml) {
        emailLines.push("Content-Type: text/html; charset=utf-8");
      } else {
        emailLines.push("Content-Type: text/plain; charset=utf-8");
      }

      emailLines.push("");
      emailLines.push(input.body);

      // Encode the email
      const email = emailLines.join("\r\n");
      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send the email
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      return {
        success: true,
        messageId: res.data.id,
      };
    } catch (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  })
  .llm({
    success: (result) => {
      if (result.success) {
        return `Email sent successfully. Message ID: ${result.messageId}`;
      } else {
        return `Failed to send email: ${result.error}`;
      }
    },
    error: (error: Error) => `Failed to send email: ${error.message}`,
  });

export default gmailApp;
