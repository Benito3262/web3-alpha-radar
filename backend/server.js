
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://web3-alpha-radar.vercel.app', 'http://localhost:3001', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let cachedTrends = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheValid() {
  return cachedTrends && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

function parseJSON(raw) {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch(e) {
    const match = raw.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse JSON from AI response");
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Trends ──────────────────────────────────────────────────
app.get("/api/trends", async (req, res) => {
  try {
    if (isCacheValid()) {
      return res.json({ trends: cachedTrends, cached: true });
    }
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: "You are a senior Web3 trend analyst with deep knowledge of DeFi, Layer 2s, Bitcoin ecosystem, AI+crypto, restaking, and governance. Respond with valid JSON only. No markdown, no extra text whatsoever.",
        },
        {
          role: "user",
          content: `Generate 8 highly specific, detailed, realistic emerging narratives in Web3 and crypto as of early 2026. Name real protocols. Explain real technical context. This data will be used by content creators to write posts so it must be rich and specific.

Return ONLY a valid JSON array of exactly 8 objects:
[
  {
    "id": "unique-kebab-slug",
    "title": "Specific Narrative Title",
    "category": "DeFi | Layer2 | AI+Crypto | Infrastructure | NFT/Gaming | Bitcoin | Governance | Tooling",
    "summary": "2-3 sentences explaining what this trend is and why it is gaining traction right now with specific protocol names",
    "detail": "6-8 sentences covering the technical background, which specific projects are leading, what on-chain data shows, who the key stakeholders are, recent developments, and what the near-term catalyst is",
    "signalScore": 60-99,
    "momentum": "rising | surging | stable | breaking",
    "sources": ["Specific source 1", "Specific source 2", "Specific source 3"],
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "relatedProjects": ["Project1", "Project2", "Project3"],
    "mentionGrowth": "+XX%",
    "devActivity": "low | medium | high | very high",
    "fundingSignal": true or false,
    "timeframe": "Last 24h | Last 48h | Last week",
    "keyStats": ["Specific stat 1", "Specific stat 2", "Specific stat 3"]
  }
]`,
        },
      ],
    });
    const data = parseJSON(response.choices[0].message.content);
    cachedTrends = data;
    cacheTimestamp = Date.now();
    res.json({ trends: data, cached: false });
  } catch (err) {
    console.error("Trends error:", err);
    res.status(500).json({ error: "Failed to fetch trends", details: err.message });
  }
});

// ── Alerts ──────────────────────────────────────────────────
app.get("/api/alerts", async (req, res) => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2500,
      messages: [
        {
          role: "system",
          content: "You are a crypto alpha analyst. Respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Generate 6 urgent, specific, realistic crypto and Web3 alpha alerts for early 2026. Name real or plausible protocols. Be specific about amounts, addresses, and impact.

Return ONLY a valid JSON array of 6 objects sorted critical first:
[
  {
    "id": "alert-unique-slug",
    "title": "Specific alert title naming the protocol",
    "description": "3-4 sentences explaining exactly what happened, which protocols are involved, dollar amounts if relevant, and why this matters",
    "severity": "critical | high | medium | low",
    "type": "launch | exploit | partnership | governance | funding | whale | technical",
    "protocol": "Specific protocol name",
    "ecosystem": "Ethereum | Solana | Bitcoin | Arbitrum | Base | Multi-chain",
    "timestamp": "Xh ago",
    "actionable": "Specific action a content creator or researcher should take with this information",
    "tags": ["tag1", "tag2", "tag3"],
    "verified": true or false
  }
]`,
        },
      ],
    });
    const alerts = parseJSON(response.choices[0].message.content);
    res.json({ alerts });
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ error: "Failed to fetch alerts", details: err.message });
  }
});

// ── Content Ideas ────────────────────────────────────────────
app.post("/api/content-ideas", async (req, res) => {
  const { trend } = req.body;
  if (!trend) return res.status(400).json({ error: "trend is required" });
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: "You are an expert Web3 content creator who writes viral, human-sounding posts. You write like a real crypto insider sharing genuine insights — not a corporate marketer. Respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Generate rich, detailed content ideas for this Web3 trend:

Title: ${trend.title}
Category: ${trend.category}
Summary: ${trend.summary}
Detail: ${trend.detail || ''}
Related Projects: ${(trend.relatedProjects || []).join(', ')}
Key Stats: ${(trend.keyStats || []).join(', ')}
Tags: ${(trend.tags || []).join(', ')}

IMPORTANT: Write like a real human crypto creator. Use conversational language. Be specific. Name protocols. Share genuine insight. No generic phrases like "the future of finance" or "revolutionary technology".

Return ONLY valid JSON:
{
  "tweets": [
    {
      "hook": "One line opening that makes someone stop scrolling",
      "body": "Full tweet - conversational, specific, human. 150-280 characters. Include 2-3 hashtags at end.",
      "type": "alpha | educational | contrarian | viral"
    }
  ],
  "threads": [
    {
      "title": "Thread title",
      "angle": "educational | investigative | contrarian | storytelling",
      "outline": [
        "1/ The hook tweet - make it so compelling people HAVE to read on. Be specific and bold.",
        "2/ Set the scene - what is happening right now and why does it matter",
        "3/ The technical breakdown - explain how it actually works in plain English",
        "4/ Name the key players - which protocols or teams are leading this",
        "5/ The data - what do the numbers say. Be specific with stats",
        "6/ What most people are missing about this narrative",
        "7/ The risks - be honest about what could go wrong",
        "8/ Who benefits and who loses if this plays out",
        "9/ What to watch in the next 30 days as signals",
        "10/ The call to action - follow for more, share this thread, what should readers do next"
      ]
    }
  ],
  "hooks": [
    "Full compelling hook sentence that could open a viral post",
    "Full compelling hook sentence 2",
    "Full compelling hook sentence 3",
    "Full compelling hook sentence 4",
    "Full compelling hook sentence 5"
  ],
  "angles": [
    {
      "title": "Angle name",
      "description": "2-3 sentences on exactly how to approach this, what specific story to tell, and why this angle will resonate with a crypto audience",
      "platform": "Twitter | LinkedIn | YouTube | Newsletter"
    }
  ]
}

Generate 4 tweets, 2 detailed threads with 10 points each, 5 hooks, and 4 angles.`,
        },
      ],
    });
    const ideas = parseJSON(response.choices[0].message.content);
    res.json({ ideas });
  } catch (err) {
    console.error("Content ideas error:", err);
    res.status(500).json({ error: "Failed to generate content ideas", details: err.message });
  }
});

// ── Write Full Post ──────────────────────────────────────────
app.post("/api/write-post", async (req, res) => {
  const { topic, format } = req.body;
  if (!topic) return res.status(400).json({ error: "topic is required" });

  const formatInstructions = {
    tweet: `Write a single powerful X/Twitter post about this topic.

Style guide:
- Write like a real person sharing a genuine insight or discovery
- Sound excited, knowledgeable, and authentic — not like a press release
- Be specific: name protocols, mention numbers, share a real take
- Start with something that makes people stop scrolling
- Can be 1 paragraph or a few short punchy lines
- 150-280 characters maximum
- Add 3-4 relevant hashtags at the end
- Think of how someone would actually tweet after learning something interesting`,

    thread: `Write a complete, engaging Twitter/X thread with exactly 10 tweets about this topic.

Style guide:
- Write like a real crypto insider who just discovered something important
- Sound human, excited, and genuine — like you are sharing alpha with your followers
- Be specific: name real protocols, use real numbers, share actual insights
- Each tweet numbered: 1/, 2/, 3/ etc
- Tweet 1: A hook so good people cannot scroll past it. Bold claim or surprising fact.
- Tweets 2-4: Build the story. What is happening, why now, what most people do not know.
- Tweets 5-7: The deep stuff. Technical breakdown in plain English. Key players. Data.
- Tweet 8: The counterargument or risk. Show you are balanced and credible.
- Tweet 9: What to watch. Give people specific things to look out for.
- Tweet 10: Call to action. Ask for retweets, follows, or replies. Make it personal.
- Each tweet 150-280 characters
- No generic crypto cliches. Write things people actually want to read.`,

    linkedin: `Write a complete LinkedIn post about this topic.

Style guide:
- Open with ONE bold statement on its own line that stops people scrolling
- Then tell a story or share a discovery — write like a real person, not a consultant
- Use short paragraphs with a blank line between each one
- Be specific: name protocols, share numbers, give genuine insight
- Show personality — it is okay to be excited, surprised, or even skeptical
- Include a personal angle: "I was looking at this and noticed..." or "Most people overlook..."
- End with a genuine question that invites discussion
- 200-400 words total
- Do NOT use bullet points or numbered lists — flowing paragraphs only
- Do NOT use phrases like "In conclusion" or "It is worth noting"`,
  };

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `You are a top Web3 content creator who writes posts that go viral because they sound genuinely human and share real insight. 

Your writing style:
- Conversational and direct, like texting a smart friend
- Specific and data-driven but not boring
- Occasionally uses emphasis for key points
- Shares genuine opinions and takes
- Never uses corporate speak or AI-sounding phrases
- Sounds like someone who actually uses these protocols daily

Always respond with valid JSON only. No markdown fences. No extra text.`,
        },
        {
          role: "user",
          content: `Write a ${format} about this Web3 topic: "${topic}"

${formatInstructions[format] || formatInstructions.tweet}

Return ONLY valid JSON:
{
  "title": "Short descriptive title for this post",
  "content": "The complete written post exactly as it should be published. Use \\n for line breaks between paragraphs or tweets.",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4"],
  "tips": [
    "One specific, actionable tip to improve the reach of this exact post",
    "Another specific tip for this post"
  ],
  "estimatedReach": "low | medium | high | viral"
}`,
        },
      ],
    });
    const post = parseJSON(response.choices[0].message.content);
    res.json({ post });
  } catch (err) {
    console.error("Write post error:", err);
    res.status(500).json({ error: "Failed to write post", details: err.message });
  }
});

// ── Deep Dive ────────────────────────────────────────────────
app.post("/api/deep-dive", async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "topic is required" });
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: "You are a senior Web3 research analyst. Be specific, name real protocols and teams. Respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Do a deep, detailed research analysis on: "${topic}"

Be specific. Name real protocols. Write as a genuine crypto researcher would.

Return ONLY valid JSON:
{
  "overview": "4-5 sentences covering what this is, why it matters now, and what the key dynamics are",
  "keyPlayers": [
    { "name": "Protocol or person", "role": "Specific role or contribution" }
  ],
  "recentDevelopments": [
    "Specific recent development 1 with protocol name",
    "Specific recent development 2",
    "Specific recent development 3",
    "Specific recent development 4"
  ],
  "bullCase": "3-4 sentences on why this could be significant with specific catalysts",
  "bearCase": "3-4 sentences on risks and what could go wrong",
  "onChainSignals": [
    "Specific on-chain metric or signal 1",
    "Specific on-chain metric or signal 2",
    "Specific on-chain metric or signal 3"
  ],
  "contentOpportunities": [
    "Specific content angle 1 with suggested approach",
    "Specific content angle 2",
    "Specific content angle 3"
  ],
  "sources": ["Source or community 1", "Source 2", "Source 3"]
}`,
        },
      ],
    });
    const research = parseJSON(response.choices[0].message.content);
    res.json({ research });
  } catch (err) {
    console.error("Deep dive error:", err);
    res.status(500).json({ error: "Failed to perform deep dive", details: err.message });
  }
});

// ── Ecosystem Pulse ──────────────────────────────────────────
app.get("/api/ecosystem-pulse", async (req, res) => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: "You are a crypto market analyst. Respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Detailed ecosystem pulse for Web3 and crypto in early 2026. Be specific about chains, protocols, and narratives.

Return ONLY valid JSON:
{
  "overallSentiment": "bullish | neutral | bearish | mixed",
  "sentimentScore": 0-100,
  "topEcosystems": [
    { "name": "Ecosystem", "activity": "Specific activity description", "momentum": "up | down | stable" }
  ],
  "dominantNarratives": ["Narrative 1", "Narrative 2", "Narrative 3", "Narrative 4"],
  "marketContext": "3-4 sentences with specific protocol names and data points",
  "developerActivity": "low | medium | high | very high",
  "vcActivity": "quiet | moderate | active | very active",
  "weeklyInsight": "One specific actionable insight about what is happening this week"
}`,
        },
      ],
    });
    const pulse = parseJSON(response.choices[0].message.content);
    res.json({ pulse });
  } catch (err) {
    console.error("Pulse error:", err);
    res.status(500).json({ error: "Failed to fetch pulse", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});