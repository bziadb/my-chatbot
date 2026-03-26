# 🤖 AI Chatbot with Knowledge Base

A self-hosted AI chatbot powered by Claude that answers questions from your uploaded documents.
Embeddable on any website (WordPress, Shopify, custom HTML, etc.)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-username/my-chatbot.git
cd my-chatbot
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your Anthropic API key and admin password

# 3. Run
npm start
```

Then open:
- **Admin Panel**: http://localhost:3001/admin
- **API**: http://localhost:3001/api/chat

## Features

- 📄 Upload PDF, DOCX, TXT, CSV, JSON, MD documents
- 🔍 Automatic text extraction and chunking
- 🤖 Claude-powered responses grounded in your knowledge base
- 🎨 Customizable appearance (colors, name, welcome message)
- 🔒 Password-protected admin panel
- 📱 Responsive chat widget for any website
- ⚡ Simple keyword search (no vector DB required)

## Project Structure

```
├── server/index.js           # Express backend
├── admin/index.html          # Admin dashboard
├── widget/chatbot-widget.js  # Embeddable chat widget
├── data/                     # Auto-created: uploaded docs + index
├── package.json
├── .env.example
└── docs/SETUP-GUIDE.md       # Full deployment guide
```

## Embed on Your Website

```html
<script src="https://YOUR-SERVER/widget.js"
        data-server="https://YOUR-SERVER"></script>
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/chat` | POST | No | Send a message, get AI response |
| `/api/settings` | GET | No | Public bot settings (name, color) |
| `/api/admin/login` | POST | No | Admin login |
| `/api/admin/documents` | GET | Yes | List documents |
| `/api/admin/documents` | POST | Yes | Upload document |
| `/api/admin/documents/:id` | DELETE | Yes | Remove document |
| `/api/admin/settings` | GET/PUT | Yes | Bot settings |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `ADMIN_PASSWORD` | Yes | Admin panel password |
| `PORT` | No | Server port (default: 3001) |

## Deploy

See `docs/SETUP-GUIDE.md` for full deployment instructions (Railway, Render, VPS).

## License

MIT
