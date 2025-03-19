import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import dotenv from "dotenv";
import openkit from "@opkt/openkit";
import pokemonApp from "./apps-for-ai/pokemon";
import readline from "readline";

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
});

// Create an OpenKit toolkit with the pokemon tool
const toolkit = openkit.openai({
  apps: [pokemonApp],
});

// Create a readline interface for CLI interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Store conversation history
const conversationHistory: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "You are a helpful AI assistant that can help with Pokemon information using a tool when needed. Try to be concise in your responses.",
  },
];

async function main() {
  console.log("\n🤖 Pokemon Assistant CLI 🤖");
  console.log("--------------------------------");
  console.log("Type 'exit' or 'quit' to end the conversation.");
  console.log(
    "Try asking about Pokemon, for example: 'Capture a random Pokemon for me'\n",
  );

  // Start the interaction loop
  await promptUser();
}

async function promptUser() {
  rl.question("\nYou: ", async (userInput) => {
    // Check for exit command
    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit"
    ) {
      console.log("\nGoodbye! Thanks for chatting.\n");
      rl.close();
      return;
    }

    // Add user message to history
    conversationHistory.push({
      role: "user",
      content: userInput,
    });

    try {
      // Display typing indicator
      process.stdout.write("\nAI: Thinking");
      const typingInterval = setInterval(() => {
        process.stdout.write(".");
      }, 300);

      // Get OpenAI-compatible function definitions
      const tools = toolkit.tools();

      // Call OpenAI API with the conversation history
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversationHistory,
        tools: tools,
      });

      // Clear typing indicator
      clearInterval(typingInterval);
      process.stdout.write("\r\n");

      // Add assistant's response to history
      if (response.choices[0].message) {
        conversationHistory.push(response.choices[0].message);
      }

      // Check if there are tool calls
      if (
        response.choices[0]?.message?.tool_calls &&
        response.choices[0].message.tool_calls.length > 0
      ) {
        console.log("AI: I'm using a tool to help answer your question...\n");

        // Handle tool calls (execute the actual functions)
        const toolResponses = await toolkit.handler({
          chatCompletion: response,
        });

        // Add tool responses to history
        for (const toolResponse of toolResponses) {
          conversationHistory.push(toolResponse);
        }

        // Get final response incorporating tool results
        const finalResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: conversationHistory,
        });

        // Add final response to history
        if (finalResponse.choices[0].message) {
          conversationHistory.push(finalResponse.choices[0].message);
        }

        // Display the final response
        console.log(`AI: ${finalResponse.choices[0].message.content}`);
      } else {
        // Display the direct response
        console.log(`AI: ${response.choices[0].message.content}`);
      }
    } catch (error: any) {
      console.error("\nError:", error.message);
    }

    // Continue the conversation
    promptUser();
  });
}

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  console.log("\n\nGoodbye! Thanks for chatting.\n");
  rl.close();
  process.exit(0);
});

main().catch(console.error);

export { openai, toolkit };
