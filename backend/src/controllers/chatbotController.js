const { success, error } = require("../utils/response");
const { OpenAI } = require("openai");

const GROQ_API_KEY = process.env.CHATBOT_API_KEY;

const client = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_PROMPT = `You are a helpful AI assistant for a Smart Attendance Management System (SAMS). You help students with:
- How to mark attendance
- Face recognition verification process (liveness check, face scan)
- GPS location verification requirements
- Attendance history and reports
- Troubleshooting attendance marking issues
- Session information
- General questions about the system

Be friendly, concise, and professional. Use markdown for formatting when helpful.
If the question is outside your scope, politely redirect to admin support at admin@sams.com.
Always provide clear step-by-step guidance when needed.
Keep responses under 300 words.`;

// ─── POST /api/chatbot/chat ────────────────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const user = req.user;

    if (!message || !message.trim()) {
      return error(res, "Message is required", 400);
    }

    if (!GROQ_API_KEY) {
      console.error("Groq API Key not found. Set CHATBOT_API_KEY in .env");
      return error(res, "Chatbot is not configured", 503);
    }

    // Build messages array with system prompt and conversation history
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...conversationHistory,
      {
        role: "user",
        content: message,
      },
    ];

    // Call Groq API via OpenAI SDK
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const botMessage = completion.choices[0].message.content;

    return success(
      res,
      {
        message: botMessage,
        conversationId: user._id,
      },
      "Message processed successfully"
    );
  } catch (err) {
    console.error("Chatbot error:", err.message);
    const message =
      err.message ||
      "Unable to process your message. Please try again.";
    return error(res, message, 500);
  }
};

module.exports = { chat };
