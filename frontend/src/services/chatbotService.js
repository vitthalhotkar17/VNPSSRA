import { api } from "./api.js";

export const chatbotService = {
  async sendMessage(message, conversationHistory = []) {
    try {
      const { data } = await api.post("/chatbot/chat", {
        message,
        conversationHistory,
      });
      return data.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || "Chatbot error");
    }
  },

  // System prompt for attendance assistant
  getSystemPrompt() {
    return `You are a helpful AI assistant for a Smart Attendance Management System (SAMS). You help students with:
- How to mark attendance
- Face recognition verification process
- GPS location verification requirements
- Attendance history and reports
- Troubleshooting attendance marking issues
- General questions about the system

Be friendly, concise, and professional. If the question is outside your scope, politely redirect to admin support.
Always provide clear step-by-step guidance when needed.`;
  },
};
