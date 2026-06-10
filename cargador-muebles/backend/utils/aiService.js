const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getAIResponse(systemPrompt, userContent, conversationHistory = [], imageBase64 = null, imageUrl = null) {
  try {
    const userMessageContent = [{ type: "text", text: userContent }];
    if (imageBase64) {
      userMessageContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
    } else if (imageUrl) {
      userMessageContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...conversationHistory, { role: 'user', content: userMessageContent }],
      temperature: 0.2
    }, { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` } });
    return response.data.choices[0].message.content;
  } catch (error) { throw new Error('Error en conexión con IA'); }
}

module.exports = { getAIResponse };
