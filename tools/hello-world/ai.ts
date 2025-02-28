import OpenAI from "openai";
import toolkit from "./toolkit";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI(
    {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: "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"
    }
);

let messages = [
    { role: "user", content: "What is the current time?" }
] as ChatCompletionMessageParam[]

async function sendMessage() {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        tools: toolkit.openai()
    });


    messages.push(response.choices[0].message);


    const toolCallResponse = await toolkit.handler({ chatCompletion: response })


    if (!toolCallResponse) {
        console.log("No tool call response");
        return;
    }


    messages.push(...toolCallResponse);

    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: toolkit.openai()
    });

    // print every message content
    console.log(chatCompletion.choices[0].message.content);

}

sendMessage();
