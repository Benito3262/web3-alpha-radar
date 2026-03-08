
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
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
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
          content: "You are a senior Web3 trend analyst with deep knowledge of DeFi, Layer 2s, Bitcoin ecosystem, AI+crypto, restaking, governance, and on-chain data. Always respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Generate 8 highly detailed, realistic, and current emerging narratives in the Web3 and crypto ecosystem as of early 2026. Each narrative must be specific, name real or plausible protocols, and explain technical context clearly.

Return ONLY a valid JSON array of exactly 8 objects:
[
  {
    "id": "unique-kebab-slug",
    "title": "Specific Narrative Title",
    "category": "DeFi | Layer2 | AI+Crypto | Infrastructure | NFT/Gaming | Bitcoin | Governance | Tooling",
    "summary": "2-3 sentences explaining what this trend is and why it is gaining traction right now, with specific protocol names",
    "detail": "5-6 sentences covering the technical background, which specific projects are leading, what on-chain data shows, who the key stakeholders are, and what the near-term catalyst is",
    "signalScore": 60-99,
    "momentum": "rising | surging | stable | breaking",
    "sources": ["Specific source 1", "Specific source 2", "Specific source 3"],
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "relatedProjects": ["Project1", "Project2", "Project3"],
    "mentionGrowth": "+XX%",
    "devActivity": "low | medium | high | very high",
    "fundingSignal": true or false,
    "timeframe": "Last 24h | Last 48h | Last week",
    "keyStats": ["Stat or data point 1", "Stat or data point 2", "Stat or data point 3"]
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
          content: "You are a crypto alpha analyst. Always respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Generate 6 urgent, specific, and realistic crypto and Web3 alpha alerts for early 2026. Name real or plausible protocols. Include protocol launches, exploits, partnerships, governance votes, whale movements, and funding rounds.

Return ONLY a valid JSON array of 6 objects sorted critical first:
[
  {
    "id": "alert-unique-slug",
    "title": "Specific alert title naming the protocol",
    "description": "3-4 sentences explaining exactly what happened, which addresses or protocols are involved, the dollar amount if relevant, and why this matters to the ecosystem",
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
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: "You are an expert Web3 content strategist and viral content creator. Always respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Generate rich content ideas for this Web3 trend:

Title: ${trend.title}
Category: ${trend.category}
Summary: ${trend.summary}
Detail: ${trend.detail || ''}
Related Projects: ${(trend.relatedProjects || []).join(', ')}
Tags: ${(trend.tags || []).join(', ')}

Return ONLY valid JSON:
{
  "tweets": [
    {
      "hook": "The single opening line that grabs attention",
      "body": "Full tweet text under 280 characters including hashtags",
      "type": "alpha | educational | contrarian | viral"
    }
  ],
  "threads": [
    {
      "title": "Full thread title",
      "angle": "educational | investigative | contrarian | storytelling",
      "outline": [
        "1/ Full first tweet text - the hook that makes people stop scrolling",
        "2/ Second tweet with specific data point or context",
        "3/ Third tweet explaining the technical background",
        "4/ Fourth tweet naming key players and what they are doing",
        "5/ Fifth tweet on what this means for the broader ecosystem",
        "6/ Sixth tweet on risks or counterarguments",
        "7/ Seventh tweet on what to watch next",
        "8/ Final tweet with call to action and summary"
      ]
    }
  ],
  "hooks": [
    "Full viral hook sentence 1",
    "Full viral hook sentence 2",
    "Full viral hook sentence 3",
    "Full viral hook sentence 4",
    "Full viral hook sentence 5"
  ],
  "angles": [
    {
      "title": "Angle name",
      "description": "2-3 sentences on how to approach this angle, what to say, and why it will resonate",
      "platform": "Twitter | LinkedIn | YouTube | Newsletter"
    }
  ]
}

Generate 4 tweets, 2 full detailed threads with 8 tweets each, 5 hooks, and 4 angles.`,
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
    tweet: `Write ONE powerful tweet about this topic. 
Rules:
- Maximum 280 characters
- Start with a strong hook
- Include a specific data point or insight if possible
- End with 2-3 relevant hashtags
- Make it punchy, shareable, and informative`,

    thread: `Write a complete, detailed Twitter/X thread with exactly 10 tweets.
Rules:
- Format each tweet starting with its number: 1/, 2/, 3/ etc
- Tweet 1 must be an irresistible hook that makes people stop scrolling
- Tweets 2-8 must each make ONE specific point with supporting detail, data, or example
- Tweet 9 must address risks or counterarguments
- Tweet 10 must be a strong call to action asking people to follow, retweet, or share
- Each tweet must be under 280 characters
- Be specific, name protocols, use real numbers where plausible
- The thread must feel like it was written by a genuine crypto insider`,

    linkedin: `Write a complete LinkedIn post about this topic.
Rules:
- Start with a single bold hook line that stands alone
- Then a blank line
- Write 4-6 short paragraphs separated by blank lines
- Include specific insights, data points, and protocol names
- Professional but approachable tone
- End with an engaging question to drive comments
- Total length 200-350 words
- Do NOT use bullet points — write in flowing paragraphs`,
  };

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2500,
      messages: [
        {
          role: "system",
          content: "You are a top Web3 content writer who creates viral, high-quality posts for crypto-native audiences. You write with authority, use specific data and protocol names, and always deliver content that feels authentic and valuable. Always respond with valid JSON only. No markdown fences.",
        },
        {
          role: "user",
          content: `Write a ${format} about this Web3 topic: "${topic}"

${formatInstructions[format] || formatInstructions.tweet}

Return ONLY valid JSON with no markdown:
{
  "title": "Short descriptive title for this post",
  "content": "The complete written post exactly as it should be published, with proper line breaks using \\n",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4"],
  "tips": [
    "Specific tip to improve engagement for this post",
    "Another specific tip"
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
          content: "You are a senior Web3 research analyst. Always respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Do a deep, detailed research analysis on this Web3 topic: "${topic}"

Be specific. Name real protocols, real teams, real data points. Write as a genuine crypto researcher would.

Return ONLY valid JSON:
{
  "overview": "4-5 sentence comprehensive overview naming specific protocols and explaining the technical context",
  "keyPlayers": [
    { "name": "Protocol or person name", "role": "Specific role or contribution to this narrative" }
  ],
  "recentDevelopments": [
    "Specific development 1 with protocol name and detail",
    "Specific development 2",
    "Specific development 3",
    "Specific development 4"
  ],
  "bullCase": "3-4 sentences on why this narrative could be significant, with specific catalysts",
  "bearCase": "3-4 sentences on risks, counterarguments, and what could go wrong",
  "onChainSignals": [
    "Specific on-chain metric or signal 1",
    "Specific on-chain metric or signal 2",
    "Specific on-chain metric or signal 3"
  ],
  "contentOpportunities": [
    "Specific content opportunity 1 with suggested angle",
    "Specific content opportunity 2",
    "Specific content opportunity 3"
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
          content: "You are a crypto market analyst. Always respond with valid JSON only. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Provide a detailed ecosystem pulse for Web3 and crypto in early 2026. Be specific about which chains, protocols, and narratives are dominating.

Return ONLY valid JSON:
{
  "overallSentiment": "bullish | neutral | bearish | mixed",
  "sentimentScore": 0-100,
  "topEcosystems": [
    { "name": "Ecosystem name", "activity": "Specific activity description", "momentum": "up | down | stable" }
  ],
  "dominantNarratives": ["Narrative 1", "Narrative 2", "Narrative 3", "Narrative 4"],
  "marketContext": "3-4 sentences giving specific market context with protocol names and data points",
  "developerActivity": "low | medium | high | very high",
  "vcActivity": "quiet | moderate | active | very active",
  "weeklyInsight": "One specific, actionable insight about what is happening this week in Web3"
}`,
        },
      ],
    });
    const pulse = parseJSON(response.choices[0].message.content);
    res.json({ pulse });
  } catch (err) {
    console.error("Pulse error:", err);
    res.status(500).json({ error: "Failed to fetch ecosystem pulse", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Web3 Alpha Radar backend running on port ${PORT}`);
});
```

Save that. Now open `frontend/index.html`, find this function:

```javascript
function filterAndNavigate(tag) {
  state.activeTag = tag;
  document.querySelector('.nav-item:nth-child(2)').click();
  setTimeout(() => {
```

Replace it with:

```javascript
function filterAndNavigate(tag) {
  state.activeTag = tag;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const trendsBtn = [...document.querySelectorAll('.nav-item')].find(el => el.textContent.includes('Trends'));
  if (trendsBtn) trendsBtn.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-trends').classList.add('active');
  document.getElementById('page-title').textContent = 'Trend Scanner';
  closeSidebar();
  setTimeout(() => {
    document.querySelectorAll('#global-tags .tag').forEach(el =>
      el.classList.toggle('active', el.dataset.tag === tag));
    document.getElementById('clear-filter-btn').classList.add('visible');
    renderTrends();
  }, 100);
}