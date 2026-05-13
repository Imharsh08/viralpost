export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      // Real Claude enhancement
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `You are a viral content expert. Transform the following post into a highly engaging, viral-worthy version using the AIDA framework (Attention, Interest, Desire, Action).

Rules:
- Keep the author's authentic voice and core message
- Open with a bold hook (specific number, confession, or challenge to common belief)
- Use short punchy paragraphs and line breaks
- End with a question that drives comments
- Suggest 5 relevant hashtags

Original post:
"""
${text}
"""

Respond with ONLY valid JSON in this exact format:
{
  "enhanced_text": "the full enhanced post here",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5"]
}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.content?.[0]?.text || '';

      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');

      const result = JSON.parse(jsonMatch[0]);
      return Response.json(result);
    }

    // Smart mock fallback (no API key) — incorporates the actual content
    const lines = text.trim().split('\n').filter((l: string) => l.trim());
    const firstLine = lines[0] || text.substring(0, 80);
    const keywords = extractKeywords(text);
    const hashtags = generateHashtags(keywords);

    const enhanced = buildSmartMock(text, firstLine);
    return Response.json({ enhanced_text: enhanced, hashtags });
  } catch (error) {
    console.error('AI enhance error:', error);
    return Response.json({ error: 'Enhancement failed' }, { status: 500 });
  }
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'i', 'my', 'you', 'your', 'it', 'this', 'that', 'have', 'had']);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopWords.has(w))
    .slice(0, 5);
}

function generateHashtags(keywords: string[]): string[] {
  const base = ['#ContentStrategy', '#PersonalBranding', '#CreatorEconomy', '#Writing', '#ViralContent', '#Growth', '#LinkedIn', '#Mindset'];
  const keywordTags = keywords.map((k) => `#${k.charAt(0).toUpperCase() + k.slice(1)}`);
  return [...new Set([...keywordTags, ...base])].slice(0, 5);
}

function buildSmartMock(original: string, hook: string): string {
  const lines = original.trim().split('\n').filter((l) => l.trim());
  const body = lines.slice(1).join('\n\n') || original;

  return `${hook}

Here's what most people get wrong about this:

${body}

The 3 things that actually matter:

→ Be specific, not generic
→ Lead with the outcome, not the process
→ End with a question your reader can't ignore

Which part resonates most with you?`;
}
