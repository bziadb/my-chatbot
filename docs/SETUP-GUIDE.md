# 🤖 AI Chatbot for WordPress — Complete Setup Guide

## What You're Building

A fully working AI chatbot that:
- Answers customer questions using YOUR documents (PDFs, Word docs, text files)
- Has a beautiful floating chat widget on your WordPress site
- Includes an admin dashboard to upload documents and customize the bot
- Powered by Claude AI (Anthropic)

---

## Architecture Overview

```
Your WordPress Site          Your Server (Railway/Render)
┌──────────────────┐        ┌──────────────────────────┐
│                  │        │  Node.js Backend          │
│  Widget Script ──┼──────► │  ├── Document Processing  │
│  (chatbot-       │        │  ├── Knowledge Search     │
│   widget.js)     │◄──────┼──├── Claude API            │
│                  │        │  └── Admin Panel           │
└──────────────────┘        └──────────────────────────┘
```

---

## STEP 1: Get Your Anthropic API Key

1. Go to **https://console.anthropic.com**
2. Sign up or log in
3. Navigate to **Settings → API Keys**
4. Click **Create Key**
5. Copy the key — it starts with `sk-ant-api03-...`
6. Save it somewhere safe (you'll need it in Step 3)

> **Cost**: Claude Sonnet costs ~$3 per million input tokens. A typical chatbot conversation costs less than $0.01. For most small-medium sites, expect $5-20/month.

---

## STEP 2: Choose a Hosting Provider (Free Options Available)

Your chatbot backend needs a server. Here are the best options:

### Option A: Railway (Recommended — Easiest)
- **Free tier**: $5 free credit/month (plenty for a chatbot)
- **URL**: https://railway.app
- **Setup time**: ~5 minutes

### Option B: Render
- **Free tier**: Available (spins down after inactivity)
- **URL**: https://render.com
- **Setup time**: ~5 minutes

### Option C: Your Own VPS (DigitalOcean, Hetzner, etc.)
- **Cost**: $4-6/month
- **Best for**: Full control, always-on

---

## STEP 3: Deploy to Railway (Recommended Path)

### 3.1 — Prepare Your Code

1. Download the chatbot project ZIP from this chat
2. Unzip it — you'll see this structure:

```
chatbot-project/
├── server/
│   └── index.js          ← Backend server
├── admin/
│   └── index.html        ← Admin dashboard
├── widget/
│   └── chatbot-widget.js ← Embeddable chat widget
├── package.json
├── .env.example
└── README.md
```

3. Create a `.env` file (copy from `.env.example`):

```
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
ADMIN_PASSWORD=pick-a-strong-password
PORT=3001
```

### 3.2 — Push to GitHub

1. Create a new repo on **https://github.com/new**
2. Name it something like `my-chatbot`
3. Upload all files from the chatbot-project folder
4. **Important**: Do NOT upload your `.env` file (it contains secrets)

### 3.3 — Deploy on Railway

1. Go to **https://railway.app** and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your `my-chatbot` repository
4. Railway will auto-detect it as a Node.js project
5. Go to your project **Variables** tab and add:
   - `ANTHROPIC_API_KEY` = your Anthropic key
   - `ADMIN_PASSWORD` = your admin password
   - `PORT` = 3001
6. Go to **Settings** → **Networking** → **Generate Domain**
7. You'll get a URL like: `https://my-chatbot-production-abc123.up.railway.app`

### 3.4 — Test It

- Open `https://YOUR-RAILWAY-URL/admin` — you should see the admin login
- Log in with your admin password
- Upload a test document

---

## STEP 4: Upload Your Documents

1. Go to your admin panel: `https://YOUR-SERVER-URL/admin`
2. Log in with your admin password
3. Click **Knowledge Base** in the sidebar
4. Drag & drop your files:
   - **PDFs** — product guides, FAQs, manuals
   - **Word docs** — policies, procedures
   - **Text files** — any plain text content
   - **CSV/JSON** — structured data
5. Each file gets automatically split into searchable chunks
6. The "Chunks" column shows how many pieces each doc was split into

> **Tip**: Upload your most important FAQ document first and test the chatbot. Then add more documents gradually.

---

## STEP 5: Customize Your Bot

### Appearance (Admin → Appearance tab)
- **Bot Name**: What users see (e.g., "Support Bot", "Ask Sarah")
- **Welcome Message**: First message when chat opens
- **Primary Color**: Matches your brand

### Settings (Admin → Bot Settings tab)
- **Model**: Claude Sonnet 4 (recommended balance of quality/cost)
- **System Prompt**: Instructions for the AI. Example:

```
You are a helpful customer support assistant for [Your Company].
Answer questions based ONLY on the provided knowledge base.
Be friendly and concise. If you don't know something,
suggest the customer contact support@yourcompany.com.
```

- **Temperature**: 0.2-0.4 for factual answers, higher for creative
- **Max Tokens**: 1024 is good for most answers

---

## STEP 6: Add to Your WordPress Site

### Method A: Using a Plugin (Easiest)

1. Install the **"Insert Headers and Footers"** plugin (by WPCode)
2. Go to **Code Snippets → Header & Footer**
3. In the **Footer** section, paste:

```html
<script src="https://YOUR-SERVER-URL/widget.js"
        data-server="https://YOUR-SERVER-URL"></script>
```

4. Replace `YOUR-SERVER-URL` with your actual Railway/Render URL
5. Save — the chat bubble now appears on every page!

### Method B: Theme Editor

1. Go to **Appearance → Theme File Editor**
2. Open `footer.php`
3. Paste the same script tag just before `</body>`
4. Save

### Method C: Specific Pages Only

1. Edit any page or post
2. Add a **Custom HTML** block
3. Paste the script tag
4. The chat bubble appears only on that page

---

## STEP 7: Test Everything

1. Visit your WordPress site
2. You should see a chat bubble in the bottom-right corner
3. Click it — the chat window opens
4. Ask a question related to your uploaded documents
5. The bot should answer based on your knowledge base

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Chat bubble doesn't appear | Check the script URL is correct. Open browser console (F12) for errors. |
| Bot says "API key not configured" | Make sure `ANTHROPIC_API_KEY` is set in your Railway/Render environment variables |
| Bot says "I don't have information" | Upload more relevant documents to the knowledge base |
| Slow responses | This is normal for AI — typically 2-5 seconds. Claude Haiku is faster but less capable. |
| Admin login fails | Check your `ADMIN_PASSWORD` environment variable matches what you're typing |

---

## Cost Breakdown

| Component | Monthly Cost |
|-----------|-------------|
| Railway hosting | $0-5 (free tier covers most small sites) |
| Anthropic API (Claude Sonnet) | $5-20 (depends on traffic) |
| **Total** | **~$5-25/month** |

> For very high traffic sites (1000+ conversations/day), costs increase. Consider using Claude Haiku ($0.25/million tokens) for simpler questions.

---

## Security Notes

- Your admin password protects document management — choose a strong one
- Your Anthropic API key is stored as an environment variable (never in code)
- The widget communicates over HTTPS
- User messages are sent to Claude for processing (see Anthropic's privacy policy)
- Documents are stored on your server, not shared with third parties

---

## Going Further

### Adding More Document Types
The server supports: PDF, DOCX, DOC, TXT, CSV, JSON, MD

### Scraping Website Pages
To add your website content as knowledge:
1. Copy the text content from important pages
2. Save each as a `.txt` file
3. Upload via the admin panel

### Custom Styling
Edit `widget/chatbot-widget.js` to change the widget appearance beyond what the admin panel offers.

### Multiple Bots
Run multiple instances with different databases by deploying separate Railway projects.

---

**Need help?** The most common issues are incorrect URLs and missing environment variables. Double-check those first!
