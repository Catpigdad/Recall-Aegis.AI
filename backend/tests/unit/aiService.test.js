// Unit tests for the AI service (keyword fallback — no API key needed)
// We explicitly do NOT set OPENAI_API_KEY so the fallback path runs.
delete process.env.OPENAI_API_KEY;

const { evaluateSimilarity } = require('../../services/aiService');

describe('aiService — keyword similarity fallback', () => {
  test('returns high similarity for closely related phrases', async () => {
    const { score, matched } = await evaluateSimilarity(
      'We discussed planning a trip to Japan.',
      'Japan travel plans'
    );
    expect(score).toBeGreaterThan(0);
    expect(matched).toBe(true);
  });

  test('returns low similarity for unrelated phrases', async () => {
    const { score } = await evaluateSimilarity(
      'We discussed planning a trip to Japan.',
      'Cooking recipes for pasta'
    );
    expect(score).toBeLessThan(0.5);
  });

  test('returns method "keyword" when no OpenAI key', async () => {
    const { method } = await evaluateSimilarity('Test summary', 'Test answer');
    expect(method).toBe('keyword');
  });

  test('exact same text has perfect score', async () => {
    const text = 'blockchain cryptocurrency investment';
    const { score } = await evaluateSimilarity(text, text);
    expect(score).toBe(1);
  });
});
