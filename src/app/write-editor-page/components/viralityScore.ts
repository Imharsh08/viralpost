// Virality score calculator — pure function, no DOM/React.
// Returns a 0-100 score plus per-criterion breakdown and improvement tips.
// Implements the heuristics from PRD §6.3: hook strength, readability,
// paragraph length, ends-with-question, bullet usage, hashtag count.

export interface CriterionResult {
  id: string;
  label: string;
  // 0..maxScore
  score: number;
  maxScore: number;
  // 'pass' = at or near max, 'warn' = partial, 'fail' = zero or near zero
  status: 'pass' | 'warn' | 'fail';
  // Shown as actionable advice when status !== 'pass'
  tip: string;
}

export interface ViralityResult {
  /** Overall 0-100 score */
  score: number;
  /** Letter grade derived from the score band */
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  /** Short verdict shown next to the score */
  verdict: string;
  /** Per-criterion breakdown the UI can render */
  breakdown: CriterionResult[];
}

const QUESTION_STARTERS = [
  'what', 'how', 'why', 'when', 'who', 'which', 'where',
  'have you', 'do you', 'did you', 'are you', 'would you', 'could you',
  'is it', 'will you', 'should you',
];

function countSyllables(word: string): number {
  // Flesch-Kincaid approximation. Not perfect but stable.
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const cleaned = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const matches = cleaned.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function fleschReadingEase(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  // Classic Flesch Reading Ease: higher is easier. ~60-80 is conversational.
  return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
}

function scoreHook(text: string): CriterionResult {
  // First non-empty line is the hook. Strong hooks contain a number, a
  // bold claim word, or a question-grabbing structure.
  const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  if (firstLine.length === 0) {
    return {
      id: 'hook', label: 'Hook strength', score: 0, maxScore: 25, status: 'fail',
      tip: 'Write a first line that earns the second. Try a specific number, a bold claim, or a tension your reader feels.',
    };
  }

  let score = 0;
  // Has a number → specificity
  if (/\b\d[\d,.]*\b/.test(firstLine)) score += 8;
  // Bold-claim or counterintuitive markers
  if (/\b(most|nobody|stop|everyone|never|always|secret|truth|wrong|truth is)\b/i.test(firstLine)) score += 6;
  // Question hook
  if (/\?/.test(firstLine)) score += 5;
  // Length sweet spot: 30-100 chars (long enough to be substantive, short enough to scan)
  if (firstLine.length >= 30 && firstLine.length <= 120) score += 6;
  else if (firstLine.length > 0 && firstLine.length < 30) score += 2;

  const status: 'pass' | 'warn' | 'fail' = score >= 18 ? 'pass' : score >= 8 ? 'warn' : 'fail';
  const tip =
    status === 'pass'
      ? 'Strong opener — readers will stop scrolling.'
      : firstLine.length > 120
      ? 'Your hook is long. Trim it to one punchy sentence (30-120 chars).'
      : 'Make the first line bolder. Add a specific number, a counterintuitive claim, or name the tension your reader feels.';

  return { id: 'hook', label: 'Hook strength', score, maxScore: 25, status, tip };
}

function scoreReadability(text: string): CriterionResult {
  const ease = fleschReadingEase(text);
  // Map Flesch score (target ~60-80) to 0-15
  let score: number;
  if (ease >= 60 && ease <= 90) score = 15;
  else if (ease >= 50 && ease < 60) score = 12;
  else if (ease > 90) score = 12;
  else if (ease >= 40) score = 8;
  else if (ease >= 30) score = 4;
  else score = 0;

  const status: 'pass' | 'warn' | 'fail' = score >= 12 ? 'pass' : score >= 6 ? 'warn' : 'fail';
  const tip =
    status === 'pass'
      ? 'Reads smoothly on mobile — keep it up.'
      : ease < 50
      ? 'Sentences feel dense. Break long sentences in two and swap a few long words for short ones.'
      : 'Almost there. Aim for ~15-word sentences and conversational language.';

  return { id: 'readability', label: 'Readability', score, maxScore: 15, status, tip };
}

function scoreParagraphs(text: string): CriterionResult {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) {
    return {
      id: 'paragraphs', label: 'Paragraph length', score: 0, maxScore: 15, status: 'fail',
      tip: 'Break the post into short paragraphs separated by blank lines.',
    };
  }

  const sentenceCounts = paragraphs.map((p) => p.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);
  const longParas = sentenceCounts.filter((n) => n > 3).length;
  const tinyParas = sentenceCounts.filter((n) => n === 0).length;

  let score = 15;
  // Each paragraph over 3 sentences costs 4 points (capped)
  score -= Math.min(longParas * 4, 12);
  score -= tinyParas;
  // Bonus if the post has at least 3 distinct paragraphs (visual rhythm)
  if (paragraphs.length >= 3 && longParas === 0) score = Math.min(score + 2, 15);
  score = Math.max(score, 0);

  const status: 'pass' | 'warn' | 'fail' = score >= 12 ? 'pass' : score >= 6 ? 'warn' : 'fail';
  const tip =
    status === 'pass'
      ? 'Good visual rhythm — easy to scan.'
      : longParas > 0
      ? `Split your longest paragraph${longParas > 1 ? 's' : ''} (currently > 3 sentences) into shorter chunks. Mobile readers bail on walls of text.`
      : 'Add blank lines between ideas so the post breathes on a phone screen.';

  return { id: 'paragraphs', label: 'Paragraph length', score, maxScore: 15, status, tip };
}

function scoreEndingQuestion(text: string): CriterionResult {
  // Look at the last non-empty line
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? '';
  const endsWithQuestion = lastLine.endsWith('?');
  const startsWithGoodWord = QUESTION_STARTERS.some((q) => lastLine.toLowerCase().startsWith(q));

  let score = 0;
  if (endsWithQuestion) score += 15;
  if (endsWithQuestion && startsWithGoodWord) score += 5; // bonus: open-ended

  const status: 'pass' | 'warn' | 'fail' = score >= 15 ? 'pass' : score > 0 ? 'warn' : 'fail';
  const tip =
    status === 'pass'
      ? 'Strong CTA — comments boost algorithmic reach.'
      : endsWithQuestion
      ? 'Start your closing question with What / How / Have you to make it open-ended.'
      : 'End with one question your reader can\'t scroll past. Posts with closing questions get up to 3x more comments.';

  return { id: 'question', label: 'Ends with question', score, maxScore: 20, status, tip };
}

function scoreBullets(text: string): CriterionResult {
  const bulletRe = /^[\s]*(?:→|->|–|—|-|\*|•|\d+\.|[a-z]\))\s/gm;
  const bulletLines = text.split('\n').filter((l) => /^[\s]*(?:→|->|–|—|-|\*|•|\d+\.|[a-z]\))\s/.test(l)).length;
  // Bullets are nice-to-have, not required. Max 10 pts at 3+ bullets.
  let score: number;
  if (bulletLines >= 3) score = 10;
  else if (bulletLines === 2) score = 6;
  else if (bulletLines === 1) score = 3;
  else score = 0;

  const status: 'pass' | 'warn' | 'fail' = score >= 6 ? 'pass' : score > 0 ? 'warn' : 'fail';
  const tip =
    status === 'pass'
      ? 'Bullets make complex ideas scannable — nice.'
      : bulletLines > 0
      ? 'Add a couple more bullets so the post has a clear scannable section.'
      : 'When listing steps, lessons, or takeaways, use bullets (→ or -). Lists are 40% more likely to be shared.';

  void bulletRe; // (kept the regex grouped above for readability; not strictly needed)
  return { id: 'bullets', label: 'Bullet usage', score, maxScore: 10, status, tip };
}

function scoreHashtags(hashtagCount: number): CriterionResult {
  // Optimal: 3-5 hashtags (per PRD §6.3 P2 — 3-5 = optimal)
  let score: number;
  if (hashtagCount >= 3 && hashtagCount <= 5) score = 15;
  else if (hashtagCount === 2 || hashtagCount === 6) score = 10;
  else if (hashtagCount === 1 || hashtagCount === 7) score = 5;
  else if (hashtagCount === 0) score = 0;
  else score = 2; // 8+ hashtags: spam territory

  const status: 'pass' | 'warn' | 'fail' = score >= 12 ? 'pass' : score >= 5 ? 'warn' : 'fail';
  const tip =
    status === 'pass'
      ? `${hashtagCount} hashtags is the sweet spot.`
      : hashtagCount === 0
      ? 'Add 3-5 relevant hashtags so the right readers discover this post.'
      : hashtagCount > 7
      ? `${hashtagCount} hashtags looks spammy. Trim to 3-5 of the most relevant ones.`
      : `${hashtagCount} is light. 3-5 hashtags is the sweet spot for discovery.`;

  return { id: 'hashtags', label: 'Hashtag count', score, maxScore: 15, status, tip };
}

export function computeViralityScore(text: string, hashtagCount: number): ViralityResult {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      grade: 'F',
      verdict: 'Start writing to see your score',
      breakdown: [],
    };
  }

  const breakdown: CriterionResult[] = [
    scoreHook(text),
    scoreReadability(text),
    scoreParagraphs(text),
    scoreEndingQuestion(text),
    scoreBullets(text),
    scoreHashtags(hashtagCount),
  ];

  const totalScore = breakdown.reduce((s, c) => s + c.score, 0);
  // Max possible total = 25+15+15+20+10+15 = 100
  const score = Math.round(totalScore);

  let grade: ViralityResult['grade'];
  let verdict: string;
  if (score >= 90) { grade = 'A+'; verdict = 'Viral-ready'; }
  else if (score >= 80) { grade = 'A'; verdict = 'Excellent'; }
  else if (score >= 65) { grade = 'B'; verdict = 'Strong'; }
  else if (score >= 50) { grade = 'C'; verdict = 'Solid draft'; }
  else if (score >= 30) { grade = 'D'; verdict = 'Needs work'; }
  else { grade = 'F'; verdict = 'Just started'; }

  return { score, grade, verdict, breakdown };
}
