export interface MockPost {
  id: string;
  title: string;
  excerpt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
  };
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  pointsEarned: number;
  timeAgo: string;
  publishedAt: string;
  isLiked: boolean;
  isTrending: boolean;
  isAiEnhanced: boolean;
}

export const mockPosts: MockPost[] = [
  {
    id: 'post-001',
    title: 'I quit my $180k job to write on the internet. Here\'s what nobody tells you.',
    excerpt: 'Everyone talks about the freedom. Nobody talks about the first 6 months where you make $0 and question every decision you\'ve ever made.\n\nI left my senior engineering role at a fintech company in March 2025. My savings runway: 8 months. My plan: write daily, build an audience, figure out monetization as I go.\n\nMonth 1: 43 followers. Month 6: 28,000 followers and $4,200/month from writing alone.',
    author: {
      id: 'user-001',
      username: 'rajan_writes',
      displayName: 'Rajan Mehta',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
      isVerified: true,
    },
    tags: ['CreatorEconomy', 'Writing', 'CareerChange'],
    likes: 3847,
    comments: 412,
    shares: 891,
    views: 42300,
    pointsEarned: 423,
    timeAgo: '4h ago',
    publishedAt: '2026-05-14T10:00:00Z',
    isLiked: false,
    isTrending: true,
    isAiEnhanced: true,
  },
  {
    id: 'post-002',
    title: 'The 3-sentence LinkedIn post format that got me 2.1M impressions last month',
    excerpt: 'I tested 47 different post formats over 90 days. One format consistently outperformed everything else by 8x.\n\nSentence 1: Bold, specific claim that challenges conventional wisdom\nSentence 2: The counterintuitive reason why\nSentence 3: Question that makes the reader feel seen\n\nThat\'s it. No threads, no carousels, no long-form essays. Just 3 sentences that hit the algorithm like a freight train.',
    author: {
      id: 'user-002',
      username: 'priya_content',
      displayName: 'Priya Nair',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
      isVerified: true,
    },
    tags: ['ContentStrategy', 'LinkedIn', 'PersonalBranding'],
    likes: 5621,
    comments: 683,
    shares: 1204,
    views: 89100,
    pointsEarned: 891,
    timeAgo: '7h ago',
    publishedAt: '2026-05-14T07:00:00Z',
    isLiked: true,
    isTrending: true,
    isAiEnhanced: true,
  },
  {
    id: 'post-003',
    title: 'Why most "productivity gurus" are lying to you',
    excerpt: 'They sell you the 5 AM wake-up. The 3-hour morning routine. The cold plunge.\n\nNone of that is what made them successful. What made them successful was shipping work consistently for 3–5 years before anyone was watching.\n\nThe real secret to productivity? It\'s embarrassingly simple: show up and do the work, even on the days you don\'t feel like it. That\'s the whole thing.',
    author: {
      id: 'user-003',
      username: 'marcus_builds',
      displayName: 'Marcus Okonkwo',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
      isVerified: false,
    },
    tags: ['Productivity', 'MindsetShift', 'Creators'],
    likes: 2193,
    comments: 287,
    shares: 445,
    views: 18700,
    pointsEarned: 187,
    timeAgo: '12h ago',
    publishedAt: '2026-05-14T02:00:00Z',
    isLiked: false,
    isTrending: false,
    isAiEnhanced: false,
  },
  {
    id: 'post-004',
    title: 'Thread: Everything I know about building an audience from 0 → 50k',
    excerpt: 'I started with zero followers, no brand, no network, and no idea what I was doing.\n\nTwo years later: 51,400 followers, a newsletter with 8,200 subscribers, and a course that generated $67k in its first launch.\n\nHere\'s the complete playbook — no fluff, no paid courses to sell, just what actually worked for me in 2024–2025.',
    author: {
      id: 'user-004',
      username: 'sofia_creates',
      displayName: 'Sofia Andersson',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
      isVerified: true,
    },
    tags: ['AudienceBuilding', 'Newsletter', 'CreatorEconomy'],
    likes: 7834,
    comments: 923,
    shares: 2109,
    views: 124000,
    pointsEarned: 1240,
    timeAgo: '1d ago',
    publishedAt: '2026-05-13T14:00:00Z',
    isLiked: true,
    isTrending: true,
    isAiEnhanced: true,
  },
  {
    id: 'post-005',
    title: 'The uncomfortable truth about "passive income" from writing',
    excerpt: 'Passive income from content is real. But it takes 2–3 years of very active work to get there.\n\nMy writing earns me $8,400/month on autopilot now. But for 26 months, I published 4x per week and made less than $200/month total.\n\nEveryone shows you the passive phase. Nobody shows you the brutal active phase that precedes it.',
    author: {
      id: 'user-005',
      username: 'daniel_k',
      displayName: 'Daniel Kim',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
      isVerified: false,
    },
    tags: ['PassiveIncome', 'Writing', 'HonestTake'],
    likes: 4102,
    comments: 531,
    shares: 876,
    views: 56300,
    pointsEarned: 563,
    timeAgo: '1d ago',
    publishedAt: '2026-05-13T08:00:00Z',
    isLiked: false,
    isTrending: false,
    isAiEnhanced: true,
  },
  {
    id: 'post-006',
    title: 'I analyzed 1,000 viral posts. The pattern that showed up 94% of the time surprised me.',
    excerpt: 'After manually reading and categorizing 1,000 posts that each got over 50,000 impressions, one structural pattern appeared in 94% of them.\n\nIt wasn\'t the topic. It wasn\'t the posting time. It wasn\'tthe follower count.\n\nIt was the opening line structure. Every single viral post opened with either a specific number, a first-person confession, or a direct challenge to a commonly held belief.',
    author: {
      id: 'user-006',
      username: 'aisha_analytics',
      displayName: 'Aisha Obi',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
      isVerified: true,
    },
    tags: ['DataDriven', 'ContentStrategy', 'ViralContent'],
    likes: 9241,
    comments: 1047,
    shares: 2891,
    views: 187400,
    pointsEarned: 1874,
    timeAgo: '2d ago',
    publishedAt: '2026-05-12T16:00:00Z',
    isLiked: false,
    isTrending: true,
    isAiEnhanced: true,
  },
  {
    id: 'post-007',
    title: 'Unpopular opinion: consistency is overrated. Quality compounds faster.',
    excerpt: 'Every creator coach tells you to post every single day no matter what. I did that for 8 months and burned out completely.\n\nThen I switched to posting 3x per week — only when I had something genuinely worth saying.\n\nResult: 40% higher average engagement rate, 2x follower growth rate, and I actually enjoy writing again.',
    author: {
      id: 'user-007',
      username: 'tomasz_w',
      displayName: 'Tomasz Wiśniewski',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop&crop=face',
      isVerified: false,
    },
    tags: ['UnpopularOpinion', 'ContentCreation', 'CreatorBurnout'],
    likes: 1876,
    comments: 342,
    shares: 289,
    views: 22100,
    pointsEarned: 221,
    timeAgo: '2d ago',
    publishedAt: '2026-05-12T09:00:00Z',
    isLiked: false,
    isTrending: false,
    isAiEnhanced: false,
  },
  {
    id: 'post-008',
    title: 'How I used AI to 10x my writing output without sounding like a robot',
    excerpt: 'The mistake most creators make with AI: they let it write for them.\n\nThe right approach: use AI to enhance your raw ideas, not replace them.\n\nMy workflow: write a rough 200-word draft in my authentic voice → AI optimizes structure and hooks → I edit the AI output back into my voice → publish.\n\nOutput went from 2 posts/week to 8 posts/week. Engagement rate stayed the same. Authenticity intact.',
    author: {
      id: 'user-001',
      username: 'rajan_writes',
      displayName: 'Rajan Mehta',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
      isVerified: true,
    },
    tags: ['AIWriting', 'ContentStrategy', 'ViralPost'],
    likes: 3102,
    comments: 298,
    shares: 612,
    views: 34800,
    pointsEarned: 348,
    timeAgo: '3d ago',
    publishedAt: '2026-05-11T11:00:00Z',
    isLiked: true,
    isTrending: false,
    isAiEnhanced: true,
  },
  {
    id: 'post-009',
    title: 'The niche trap: why going broad actually helped me grow faster',
    excerpt: 'For 18 months I stayed hyper-niche: B2B SaaS growth tactics only. Slow, steady growth.\n\nThen I started writing about the broader experience of building a career in tech — the failures, the pivots, the mental health stuff.\n\nFollower growth rate tripled. Engagement doubled. Turns out people follow people, not topics.',
    author: {
      id: 'user-004',
      username: 'sofia_creates',
      displayName: 'Sofia Andersson',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
      isVerified: true,
    },
    tags: ['NicheStrategy', 'PersonalBrand', 'Growth'],
    likes: 2567,
    comments: 189,
    shares: 334,
    views: 29400,
    pointsEarned: 294,
    timeAgo: '4d ago',
    publishedAt: '2026-05-10T13:00:00Z',
    isLiked: false,
    isTrending: false,
    isAiEnhanced: false,
  },
  {
    id: 'post-010',
    title: 'My first $10,000 month from writing: the exact breakdown',
    excerpt: 'October 2025 was the first month I crossed $10k from writing alone. Here\'s the exact split:\n\n→ Newsletter sponsorships: $4,200\n→ Digital product sales: $3,100\n→ Consulting (2 clients): $2,400\n→ Platform ad revenue: $340\n\nThe ad revenue is the smallest piece — but it\'s the only truly passive one. Every view earns, even while I sleep.',
    author: {
      id: 'user-005',
      username: 'daniel_k',
      displayName: 'Daniel Kim',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
      isVerified: false,
    },
    tags: ['CreatorIncome', 'Monetization', 'Transparency'],
    likes: 6438,
    comments: 782,
    shares: 1567,
    views: 98200,
    pointsEarned: 982,
    timeAgo: '5d ago',
    publishedAt: '2026-05-09T10:00:00Z',
    isLiked: false,
    isTrending: true,
    isAiEnhanced: true,
  },
];

export interface TrendingTag {
  name: string;
  postCount: number;
}

export const trendingTags: TrendingTag[] = [
  { name: 'CreatorEconomy', postCount: 8421 },
  { name: 'ContentStrategy', postCount: 6203 },
  { name: 'AIWriting', postCount: 5891 },
  { name: 'PersonalBranding', postCount: 4734 },
  { name: 'ViralContent', postCount: 3902 },
  { name: 'Writing', postCount: 3187 },
  { name: 'Monetization', postCount: 2641 },
  { name: 'LinkedIn', postCount: 2198 },
];

export interface TopCreator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  weeklyViews: number;
}

export const topCreators: TopCreator[] = [
  {
    id: 'creator-001',
    username: 'aisha_analytics',
    displayName: 'Aisha Obi',
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
    weeklyViews: 187400,
  },
  {
    id: 'creator-002',
    username: 'sofia_creates',
    displayName: 'Sofia Andersson',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
    weeklyViews: 124000,
  },
  {
    id: 'creator-003',
    username: 'priya_content',
    displayName: 'Priya Nair',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
    weeklyViews: 89100,
  },
  {
    id: 'creator-004',
    username: 'daniel_k',
    displayName: 'Daniel Kim',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    weeklyViews: 98200,
  },
  {
    id: 'creator-005',
    username: 'rajan_writes',
    displayName: 'Rajan Mehta',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    weeklyViews: 76800,
  },
];