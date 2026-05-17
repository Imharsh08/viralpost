import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getUserIdFromAuth(authHeader: string | null): string | null {
  if (!authHeader) return null;
  try {
    const payload = JSON.parse(atob(authHeader.replace('Bearer ', '').split('.')[1]));
    return payload.sub ?? null;
  } catch { return null; }
}

// Look up the signed-in user's niche tags so the AI can match audience tone.
// Returns [] for anonymous users or on any failure.
async function getNicheTags(authHeader: string | null): Promise<string[]> {
  const userId = getUserIdFromAuth(authHeader);
  if (!userId) return [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return [];
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await supabase
      .from('users')
      .select('niche_tags')
      .eq('id', userId)
      .maybeSingle();
    const tags = data?.niche_tags;
    return Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

// Maps niche tag → audience guidance (tone + platform conventions the
// rewrite should respect). Falls back to a neutral profile if no match.
const AUDIENCE_PROFILES: Record<string, string> = {
  Tech: 'Technical readers on LinkedIn/X. They value specificity, real numbers, and tradeoffs over hype. Use concrete examples (stack names, metrics, error rates) when present in the source.',
  Startup: 'Founders and operators on LinkedIn/X. They want pattern-recognition and honest failure stories, not generic advice. Open with a counterintuitive observation if the source supports one.',
  Business: 'Business professionals on LinkedIn. Slightly more formal tone. Frame insights in terms of outcomes, decisions, or frameworks.',
  Career: 'Job seekers and mid-career professionals on LinkedIn. Use a personal, story-driven hook. Lead with the lesson the reader gets.',
  Finance: 'Finance-curious readers on LinkedIn/X. Be precise about numbers. Avoid hype, avoid investment advice phrasing.',
  Marketing: 'Marketers on LinkedIn. They respond to specific channels, metrics, and counterintuitive takes. Lead with a result or a number when present.',
  Design: 'Designers on LinkedIn/X. Value craft, taste, and visual language. Concise prose with strong opinions lands best.',
  AI: 'AI builders and researchers on X/LinkedIn. Reference specific models, papers, or behaviors when the source mentions them. Avoid generic AI hype.',
  Productivity: 'Knowledge workers. They want concrete, copy-able tactics — not motivation. Lead with a specific change the reader can make today.',
  Lifestyle: 'General audience on LinkedIn/Instagram. Warmer, story-driven tone. The hook should be a relatable moment, not a stat.',
  Writing: 'Writers and content creators. Meta-level craft observations land well. The post itself should model good writing.',
  CreatorEconomy: 'Independent creators on LinkedIn/X. They want honest numbers (revenue, hours, conversion). Avoid platitudes.',
};

function audienceProfileFrom(tags: string[]): string {
  const matched = tags
    .map((t) => AUDIENCE_PROFILES[t])
    .filter((s): s is string => !!s);
  if (matched.length === 0) {
    return 'General professional audience on LinkedIn-style platforms. Default to specificity over generality, and a warm but confident tone.';
  }
  // First two niches give the strongest signal; cap to avoid prompt drift.
  return matched.slice(0, 2).join(' ');
}

export async function POST(request: Request) {
  try {
    const { text, title } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    const nicheTags = await getNicheTags(authHeader);
    const audienceProfile = audienceProfileFrom(nicheTags);
    const nichesLabel = nicheTags.length > 0 ? nicheTags.join(', ') : 'general';
    const titleLine = typeof title === 'string' && title.trim()
      ? `Title (optional context, do not echo verbatim): "${title.trim()}"\n\n`
      : '';

    // Google Gemini API key (preferred). Falls back to ANTHROPIC_API_KEY
    // if someone later wants to swap back to Claude — both flows are tried
    // in order. If neither is set, we fall through to the rule-based mock.
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const systemPrompt = `You are a viral social media post writer who tailors every rewrite to the author's specific audience. You ALWAYS output valid JSON and nothing else — no markdown, no explanation, no code fences. Raw JSON only.`;

    const userPrompt = `Rewrite the post below for the author's target audience.

AUDIENCE
The author writes for: ${nichesLabel}.
Audience profile: ${audienceProfile}

GOAL
Make this post more engaging and shareable for that audience — without changing what the author is actually saying.

HARD RULES
- Preserve the author's original message, facts, numbers, names, and voice. Do NOT invent details, statistics, anecdotes, or quotes.
- If the source post is thin on specifics, the rewrite must stay thin too. Better short and true than padded and generic.
- Match the audience tone described above. Don't sound like LinkedIn motivation if the audience is technical; don't sound like a research paper if the audience is lifestyle.
- Open with a first line that earns the second — a bold claim, a surprising fact from the source, a specific number, or a relatable tension the audience feels. NOT a generic hook ("Here's the truth about X").
- Short paragraphs (1–3 sentences). Blank line between them. Reading should feel light on mobile.
- End with ONE question that invites a comment from this specific audience. The question must connect to the post's actual content.
- Max 300 words. No hashtags inside the body.
- Output exactly 5 hashtags as a separate array. Mix 2–3 niche-specific tags (drawn from "${nichesLabel}") with 2–3 broader engagement tags. CamelCase, include the # symbol.

PROHIBITED — these patterns make the post look unprofessional and template-y:
- Do NOT repeat any line or paragraph. Each idea appears exactly once.
- Do NOT include filler boilerplate like "Here's what most people get wrong about this:", "The 3 things that actually matter:", "Let me explain:", "But here's the thing:", or any other generic transition that adds no information.
- Do NOT echo the original post verbatim followed by your rewrite — REPLACE the original, don't append.
- Do NOT use ALL-CAPS for emphasis or fake-urgency phrases ("STOP scrolling", "Pay attention").
- No leading emoji decoration on every paragraph.

${titleLine}ORIGINAL POST
"""
${text.trim()}
"""

Output ONLY this JSON, nothing else:
{"enhanced_text":"<full rewritten post here, use \\n for line breaks>","hashtags":["#Tag1","#Tag2","#Tag3","#Tag4","#Tag5"]}`;

    if (geminiKey) {
      // Gemini model is configurable via GEMINI_MODEL env var so you can
      // upgrade (e.g. gemini-2.5-flash, gemini-2.5-pro, or any future
      // gemini-3-* when Google ships it) without a code redeploy. Default
      // is gemini-2.0-flash — fast + free-tier friendly + stable today.
      // responseMimeType forces raw JSON so we don't have to extract it.
      try {
        const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1400,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          // 404 specifically means the model name doesn't exist — surface
          // that loud and clear instead of a generic "API error".
          if (response.status === 404) {
            throw new Error(`Gemini model "${model}" not found. Set GEMINI_MODEL to a valid id (e.g. gemini-2.0-flash, gemini-2.5-flash).`);
          }
          throw new Error(`Gemini API ${response.status} (${model}): ${errBody.slice(0, 200)}`);
        }

        const data = await response.json() as any;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (!content) throw new Error('Empty Gemini response');

        // With responseMimeType=application/json the body should be pure JSON,
        // but be defensive in case Gemini wraps it in a code-fence anyway.
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid Gemini response format');

        const result = JSON.parse(jsonMatch[0]);
        return Response.json({ ...result, provider: 'gemini', model });
      } catch (geminiErr: any) {
        // Don't 500 — surface what happened in the log and try Anthropic
        // (if configured), or fall through to the mock so the user still
        // gets a usable post instead of an opaque error.
        console.error('[enhance] Gemini failed, falling back:', geminiErr?.message);
      }
    }

    if (anthropicKey) {
      // Anthropic Claude — kept as an opt-in fallback if you ever swap back.
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1400,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.content?.[0]?.text || '';

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');

      const result = JSON.parse(jsonMatch[0]);
      return Response.json({ ...result, provider: 'anthropic' });
    }

    // Mock fallback — runs when no AI provider is configured OR every
    // configured provider above failed. Returns the same shape so the
    // client never has to know.
    const keywords = extractKeywords(text);
    const hashtags = generateHashtags(keywords, nicheTags);
    const enhanced = buildSmartMock(text);
    return Response.json({
      enhanced_text: enhanced,
      hashtags,
      mock: true,
      provider: 'mock',
    });
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

function generateHashtags(keywords: string[], nicheTags: string[]): string[] {
  const niche = nicheTags.map((t) => `#${t}`);
  const keywordTags = keywords.map((k) => `#${k.charAt(0).toUpperCase() + k.slice(1)}`);
  const fallback = ['#ContentStrategy', '#PersonalBranding', '#CreatorEconomy', '#Writing', '#ViralContent', '#Growth'];
  return [...new Set([...niche, ...keywordTags, ...fallback])].slice(0, 5);
}

function buildSmartMock(original: string): string {
  // Normalize the input so we never end up with the same line stitched in
  // multiple times (the previous version did `hook` + body, which when the
  // hook was already the first line of the body produced duplicate text).
  // Also collapse Windows line endings and any run of 2+ blank lines.
  const cleaned = original
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split on blank lines so we treat each paragraph as a unit, then dedupe
  // adjacent identical paragraphs (a common copy-paste mistake) and trim
  // each one.
  const seen = new Set<string>();
  const paragraphs: string[] = [];
  for (const para of cleaned.split(/\n{2,}/)) {
    const p = para.trim();
    if (!p) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    paragraphs.push(p);
  }

  // If the source is a single big block, keep it as one paragraph; if it's
  // already structured, preserve the author's structure. We DO NOT inject
  // a synthetic "Here's what most people get wrong..." line anymore — that
  // was the source of unprofessional, repetitive output.
  const body = paragraphs.join('\n\n');

  // Append exactly one closing question — only if the source doesn't
  // already end with a question mark. Keeps the post feeling like an
  // article ending, not a forced template.
  const endsWithQuestion = /\?\s*$/.test(body);
  if (endsWithQuestion) return body;

  return `${body}\n\nWhat do you think — should responses like this be the new normal?`;
}
