
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['https://web3-alpha-radar.vercel.app', 'http://localhost:3001'],
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
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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
          content: "You are a Web3 trend analyst. Always respond with valid JSON only, no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Generate a realistic and current list of emerging narratives and trends in the Web3, crypto, and blockchain ecosystem as of early 2026.

Include trends around: DeFi protocols, Layer 2 developments, AI+blockchain integrations, restaking innovations, new token launches, developer activity, ecosystem funding, Bitcoin ecosystem developments.

Return ONLY a valid JSON array with exactly 8 trend objects. Each object must have:
{
  "id": "unique-slug",
  "title": "Narrative Title",
  "category": "one of: DeFi | Layer2 | AI+Crypto | Infrastructure | NFT/Gaming | Bitcoin | Governance | Tooling",
  "summary": "2-3 sentence explanation of what this trend is and why it is gaining traction",
  "signalScore": number from 60-99,
  "momentum": "rising | surging | stable | breaking",
  "sources": ["source1", "source2", "source3"],
  "tags": ["tag1", "tag2", "tag3"],
  "mentionGrowth": "+XX%",
  "devActivity": "low | medium | high | very high",
  "fundingSignal": true or false,
  "timeframe": "Last 24h | Last 48h | Last week"
}`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    const trends = parseJSON(text);
    cachedTrends = trends;
    cacheTimestamp = Date.now();
    res.json({ trends, cached: false });
  } catch (err) {
    console.error("Trends error:", err);
    res.status(500).json({ error: "Failed to fetch trends", details: err.message });
  }
});

app.post("/api/content-ideas", async (req, res) => {
  const { trend } = req.body;
  if (!trend) return res.status(400).json({ error: "trend is required" });

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: "You are an expert Web3 content strategist. Always respond with valid JSON only, no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Generate content ideas for this Web3 trend:

Title: ${trend.title}
Category: ${trend.category}
Summary: ${trend.summary}

Return ONLY valid JSON with this structure:
{
  "tweets": [
    { "hook": "compelling opening line", "body": "full tweet text under 280 chars", "type": "alpha | educational | contrarian | viral" }
  ],
  "threads": [
    { "title": "Thread title", "outline": ["point 1", "point 2", "point 3", "point 4", "point 5"], "angle": "educational | investigative | contrarian | storytelling" }
  ],
  "hooks": ["viral hook 1", "viral hook 2", "viral hook 3", "viral hook 4", "viral hook 5"],
  "angles": [
    { "title": "Angle name", "description": "How to approach this content", "platform": "Twitter | LinkedIn | YouTube | Newsletter" }
  ]
}

Generate 3 tweets, 2 threads, 5 hooks, and 3 angles.`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    const ideas = parseJSON(text);
    res.json({ ideas });
  } catch (err) {
    console.error("Content ideas error:", err);
    res.status(500).json({ error: "Failed to generate content ideas", details: err.message });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: "You are a crypto alpha analyst. Always respond with valid JSON only, no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Generate a realistic list of urgent crypto and Web3 alpha signals and alerts for early 2026. Include protocol launches, security incidents, partnerships, governance votes, whale movements, and funding announcements.

Return ONLY a valid JSON array of 6 alert objects:
[
  {
    "id": "alert-slug",
    "title": "Alert title",
    "description": "What happened and why it matters",
    "severity": "critical | high | medium | low",
    "type": "launch | exploit | partnership | governance | funding | whale | technical",
    "protocol": "protocol or project name",
    "ecosystem": "Ethereum | Solana | Bitcoin | Multi-chain | etc",
    "timestamp": "2h ago",
    "actionable": "What a creator or researcher should do with this info",
    "verified": true or false
  }
]`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    const alerts = parseJSON(text);
    res.json({ alerts });
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ error: "Failed to fetch alerts", details: err.message });
  }
});

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
          content: "You are a Web3 research analyst. Always respond with valid JSON only, no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Do a deep research analysis on this Web3 topic: "${topic}"

Return ONLY valid JSON:
{
  "overview": "comprehensive 3-4 sentence overview",
  "keyPlayers": [{ "name": "name", "role": "role or contribution" }],
  "recentDevelopments": ["development 1", "development 2", "development 3", "development 4"],
  "bullCase": "why this narrative could be significant",
  "bearCase": "risks and counterarguments",
  "onChainSignals": ["signal 1", "signal 2", "signal 3"],
  "contentOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "sources": ["source 1", "source 2", "source 3"]
}`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    const research = parseJSON(text);
    res.json({ research });
  } catch (err) {
    console.error("Deep dive error:", err);
    res.status(500).json({ error: "Failed to perform deep dive", details: err.message });
  }
});

app.get("/api/ecosystem-pulse", async (req, res) => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: "You are a crypto market analyst. Always respond with valid JSON only, no markdown, no extra text.",
        },
        {
          role: "user",
          content: `Provide a current ecosystem pulse and market intelligence snapshot for the Web3 and crypto space in early 2026.

Return ONLY valid JSON:
{
  "overallSentiment": "bullish | neutral | bearish | mixed",
  "sentimentScore": number from 0 to 100,
  "topEcosystems": [{ "name": "ecosystem", "activity": "description", "momentum": "up | down | stable" }],
  "dominantNarratives": ["narrative 1", "narrative 2", "narrative 3"],
  "marketContext": "2-3 sentence market overview",
  "developerActivity": "low | medium | high | very high",
  "vcActivity": "quiet | moderate | active | very active",
  "weeklyInsight": "One key insight about what is happening this week"
}`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    const pulse = parseJSON(text);
    res.json({ pulse });
  } catch (err) {
    console.error("Ecosystem pulse error:", err);
    res.status(500).json({ error: "Failed to fetch ecosystem pulse", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Web3 Alpha Radar backend running on port ${PORT}`);
});