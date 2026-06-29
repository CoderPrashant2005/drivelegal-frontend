// chatbot.route.js — Express route for SmartRoad chatbot using Groq AI
// Place this in your backend routes folder and mount at /api/chatbot

const express = require("express");
const router = express.Router();

// Groq API key is loaded from .env — never hardcode it.
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// System prompt — scopes the bot to traffic law topics only
const SYSTEM_PROMPT = `You are SmartRoad's Traffic Law Assistant — a helpful, concise AI
specializing in Indian traffic laws, road penalties, challan procedures, and SmartRoad
platform services. Answer clearly and stay on-topic. If a question is unrelated to traffic
laws or SmartRoad services, politely redirect the user back to relevant topics.`;

router.post("/", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format." });
    }

    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set in environment variables.");
      return res.status(500).json({ error: "Server configuration error." });
    }

    // Build the full message list with system prompt prepended
    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
       model: "llama-3.3-70b-versatile",   
        messages: groqMessages,
        max_tokens: 512,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq API error:", response.status, errText);
      return res.status(502).json({ error: "Groq API request failed.", detail: errText });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim()
      || "Sorry, I couldn't generate a response. Please try again.";

    return res.json({ reply });

  } catch (err) {
    console.error("Chatbot route error:", err.message);
    return res.status(500).json({ error: "Internal server error.", detail: err.message });
  }
});

module.exports = router;