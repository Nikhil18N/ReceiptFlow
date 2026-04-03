const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listVisibleModels() {
  try {
    const it = genAI.listModels();
    for await (const m of it) {
      console.log(m.name);
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listVisibleModels();
