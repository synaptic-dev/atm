import { z } from "zod";
import openkit from "@opkt/openkit";
import dotenv from "dotenv";
import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";

// Load environment variables
dotenv.config();

if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error("FIRECRAWL_API_KEY is not set");
}

// Create the FirecrawlApp client
class FirecrawlClient {
  private app: any;

  constructor(options: { apiKey: string }) {
    // Initialize the client
    this.app = new FirecrawlApp({ apiKey: options.apiKey });
  }

  async scrapeUrl(url: string, options: any): Promise<any> {
    try {
      console.log(
        `Scraping ${url} with formats: ${options.formats.join(", ")}`,
      );

      // Use the exact code pattern from the user
      const scrapeResult = (await this.app.scrapeUrl(url, {
        formats: ["markdown", "html"],
      })) as ScrapeResponse;

      if (!scrapeResult.success) {
        throw new Error(`Failed to scrape: ${scrapeResult.error}`);
      }

      return scrapeResult;
    } catch (error) {
      console.error("Error scraping URL:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

const firecrawlClient = new FirecrawlClient({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

// Create the Firecrawl app
const firecrawlApp = openkit
  .app({
    name: "Firecrawl",
    description: "Scrape websites and convert to markdown for AI applications",
  })
  .context({
    client: firecrawlClient,
  })
  .route({
    name: "Scrape",
    description:
      "Scrape a single URL and convert to markdown and other formats",
    path: "scrape",
  })
  .input(
    z.object({
      url: z.string().url().describe("The URL to scrape"),
    }),
  )
  .output(
    z.object({
      markdown: z.string(),
      error: z.string().optional(),
      success: z.boolean(),
    }),
  )
  .handler(async ({ input, context }) => {
    try {
      // Use the scrapeUrl method
      const result = await context.client.scrapeUrl(input.url, {
        formats: ["markdown", "html"],
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  })
  .llm({
    success: (result) => {
      if (!result.success || !result.markdown) {
        return `Failed to scrape website: ${result.error || "Unknown error"}`;
      }

      // If user only wants markdown, we'll keep the response simple
      return result.markdown;
    },
    error: (error: Error) => `Failed to scrape website: ${error.message}`,
  });

export default firecrawlApp;
