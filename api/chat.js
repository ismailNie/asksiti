const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load the system message into memory
let systemMessage = '';

try {
  systemMessage = fs.readFileSync(path.join(__dirname, 'system_message.txt'), 'utf-8');
} catch (error) {
  console.error('Failed to load system message:', error.message);
}

module.exports = async (req, res) => {
  const { prompt, knowledgeBase } = req.body;

  if (!prompt || !knowledgeBase) {
    return res.status(400).json({ error: 'Prompt and Knowledge Base are required' });
  }

  let knowledgeBaseContent = '';

  try {
    // Dynamically load the selected knowledge base
    knowledgeBaseContent = fs.readFileSync(path.join(__dirname, knowledgeBase), 'utf-8');
  } catch (error) {
    console.error('Failed to load knowledge base:', error.message);
    return res.status(500).json({ error: 'Failed to load knowledge base' });
  }

  try {
    // Combine system message, knowledge base, and user prompt
    const augmentedPrompt = `System Message:\n${systemMessage}\n\nKnowledge Base:\n${knowledgeBaseContent}\n\nUser Prompt:\n${prompt}`;

    const response = await axios.post(
      'https://spaq-oai-instance-01.openai.azure.com/openai/deployments/GPT-4/chat/completions?api-version=2024-06-01',
      {
        messages: [{ role: 'user', content: augmentedPrompt }],
        max_tokens: 100,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    res.status(200).json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch response from OpenAI API' });
  }
};
