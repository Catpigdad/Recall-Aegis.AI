const OpenAI = require('openai');

let openaiClient = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// ---------------------------------------------------------------------------
// Conversation Summary
// ---------------------------------------------------------------------------

/**
 * Generates a concise summary of a conversation using OpenAI.
 * Falls back to a simple concatenated snippet when no API key is available.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string>}
 */
async function generateSummary(messages) {
  const client = getOpenAIClient();

  if (!client) {
    // Fallback: produce a simple summary from the user messages
    const userMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('; ');
    return userMessages.slice(0, 300) || 'Conversation with assistant.';
  }

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content:
          'You are a summarization assistant. Produce a single short sentence (15–25 words) that captures the main topic of the conversation. Do not start with "The user" — write in neutral, topic-focused language.',
      },
      {
        role: 'user',
        content: `Summarise this conversation in one sentence:\n\n${conversationText}`,
      },
    ],
    max_tokens: 60,
    temperature: 0.3,
  });

  return response.choices[0].message.content.trim();
}

// ---------------------------------------------------------------------------
// Semantic Similarity
// ---------------------------------------------------------------------------

/**
 * Computes cosine similarity between two embedding vectors.
 */
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

/**
 * Gets an embedding vector for a text using OpenAI.
 */
async function getEmbedding(client, text) {
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Keyword-based fallback similarity
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'i', 'we', 'you', 'he', 'she', 'it',
  'they', 'my', 'our', 'your', 'his', 'her', 'its', 'their', 'that', 'this',
  'about', 'last', 'time', 'talk', 'talked', 'speak', 'spoke', 'discuss',
  'discussed', 'what', 'how', 'when', 'where', 'why', 'which',
]);

function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Jaccard similarity between two token sets.
 */
function keywordSimilarity(textA, textB) {
  const setA = new Set(tokenise(textA));
  const setB = new Set(tokenise(textB));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((t) => setB.has(t)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// ---------------------------------------------------------------------------
// Public similarity function
// ---------------------------------------------------------------------------

/**
 * Evaluates whether a user's recall answer matches the stored conversation summary.
 *
 * @param {string} summary   - The stored (plaintext) conversation summary.
 * @param {string} userAnswer - The user's recall attempt.
 * @returns {Promise<{ score: number, matched: boolean, method: string }>}
 */
async function evaluateSimilarity(summary, userAnswer) {
  const threshold = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.70');
  const client = getOpenAIClient();

  if (client) {
    try {
      const [embA, embB] = await Promise.all([
        getEmbedding(client, summary),
        getEmbedding(client, userAnswer),
      ]);
      const score = cosineSimilarity(embA, embB);
      return { score, matched: score >= threshold, method: 'embedding' };
    } catch (err) {
      console.warn('OpenAI embedding error, falling back to keyword similarity:', err.message);
    }
  }

  // Keyword fallback — use lower threshold
  const fallbackThreshold = parseFloat(process.env.FALLBACK_THRESHOLD || '0.20');
  const score = keywordSimilarity(summary, userAnswer);
  return { score, matched: score >= fallbackThreshold, method: 'keyword' };
}

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------

/**
 * Sends a chat message to the AI assistant and returns its reply.
 *
 * @param {string} assistantName
 * @param {Array<{role: string, content: string}>} history  - Previous messages
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function chatWithAssistant(assistantName, history, userMessage) {
  const client = getOpenAIClient();

  if (!client) {
    return (
      `I'm ${assistantName}, your AI assistant. (Note: AI responses are disabled — set OPENAI_API_KEY to enable them.) ` +
      `You said: "${userMessage}"`
    );
  }

  const systemPrompt =
    `You are ${assistantName}, a helpful and friendly personal AI assistant. ` +
    `Be conversational, warm, and memorable. Keep responses concise (2–4 sentences).`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 200,
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { generateSummary, evaluateSimilarity, chatWithAssistant };
