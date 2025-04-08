const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load the system message into memory
let systemMessage = '';

try {
  const systemMessagePath = path.join(process.cwd(), 'public', 'system_message.txt'); // Adjust path for Vercel
  systemMessage = fs.readFileSync(systemMessagePath, 'utf-8');
} catch (error) {
  console.error('Failed to load system message:', error.message);
}

module.exports = async (req, res) => {
  try {
    console.log('Request Body:', req.body); // Log incoming request for debugging

    const { prompt, knowledgeBase } = req.body;

    if (!prompt || !knowledgeBase) {
      console.error('Missing required fields: prompt or knowledgeBase');
      return res.status(400).json({ error: 'Prompt and Knowledge Base are required' });
    }

    let knowledgeBaseContent = '';
    try {
      console.log('Loading knowledge base:', knowledgeBase);
      const knowledgeBasePath = path.join(process.cwd(), 'public', knowledgeBase); // Adjust path for Vercel
      knowledgeBaseContent = fs.readFileSync(knowledgeBasePath, 'utf-8');
    } catch (error) {
      console.error('Failed to load knowledge base:', error.message);
      return res.status(500).json({ error: 'Failed to load knowledge base' });
    }

    // Combine system message, knowledge base, and user prompt
    const augmentedPrompt = `System Message:\n${systemMessage}\n\nKnowledge Base:\n${knowledgeBaseContent}\n\nUser Prompt:\n${prompt}`;

    console.log('Sending augmented prompt to OpenAI:', augmentedPrompt);

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

    console.log('API Response:', response.data);

    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0 &&
      response.data.choices[0].message
    ) {
      res.status(200).json({ reply: response.data.choices[0].message.content });
    } else {
      console.error('Unexpected API response structure:', response.data);
      res.status(500).json({ error: 'Unexpected API response structure' });
    }
  } catch (error) {
    console.error('Serverless function error:', error); // Log any unhandled errors
    res.status(500).json({
      error: error.message || 'Internal Server Error',
    });
  }
};
