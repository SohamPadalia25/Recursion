// FREE LLM: Groq API — https://console.groq.com (free tier, no credit card)
// Models available free: llama3-8b-8192, llama3-70b-8192, mixtral-8x7b-32768
// Add to .env:  GROQ_API_KEY=your_key_here

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Core chat completion — all agents use this
const chatWithGroq = async (messages, model = "llama3-8b-8192", jsonMode = false) => {
  const response = await groq.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    response_format: jsonMode ? { type: "json_object" } : undefined,
  });
  return response.choices[0].message.content;
};

export { groq, chatWithGroq };