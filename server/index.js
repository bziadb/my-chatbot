// ═══════════════════════════════════════════════════════════════
//  CHATBOT BACKEND SERVER
//  Handles: document upload/indexing, vector search, Claude API
// ═══════════════════════════════════════════════════════════════

import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ─── Config ───
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";
const DATA_DIR = path.join(__dirname, "../data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ─── File Upload ───
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const id = crypto.randomUUID();
    cb(null, `${id}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".docx", ".doc", ".txt", ".csv", ".json", ".md"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ─── Initialize Data Directory ───
async function initDataDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(INDEX_FILE);
  } catch {
    await fs.writeFile(INDEX_FILE, JSON.stringify({ documents: [], settings: getDefaultSettings() }));
  }
}

function getDefaultSettings() {
  return {
    botName: "Aria",
    welcomeMessage: "Hello! I'm your AI assistant. How can I help you today?",
    primaryColor: "#0F6FFF",
    model: "claude-sonnet-4-20250514",
    systemPrompt:
      "You are a helpful customer support assistant. Answer questions based ONLY on the provided knowledge base documents. If the answer is not in the documents, say so honestly and suggest contacting human support. Be concise and friendly.",
    temperature: 0.3,
    maxTokens: 1024,
  };
}

async function readIndex() {
  const data = await fs.readFile(INDEX_FILE, "utf-8");
  return JSON.parse(data);
}

async function writeIndex(data) {
  await fs.writeFile(INDEX_FILE, JSON.stringify(data, null, 2));
}

// ═══════════════════════════════════════════════════════════════
//  DOCUMENT PROCESSING
//  Extracts text and splits into chunks for retrieval
// ═══════════════════════════════════════════════════════════════

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt" || ext === ".md" || ext === ".csv") {
    return await fs.readFile(filePath, "utf-8");
  }

  if (ext === ".json") {
    const raw = await fs.readFile(filePath, "utf-8");
    const obj = JSON.parse(raw);
    return JSON.stringify(obj, null, 2);
  }

  if (ext === ".pdf") {
    // Use pdf-parse for PDF text extraction
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === ".docx" || ext === ".doc") {
    // Use mammoth for Word document extraction
    const mammoth = await import("mammoth");
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return "";
}

function chunkText(text, chunkSize = 500, overlap = 50) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().split(/\s+/).length > chunkSize) {
      if (current.trim()) chunks.push(current.trim());
      // Keep overlap from end of previous chunk
      const words = current.trim().split(/\s+/);
      current = words.slice(-overlap).join(" ") + " " + sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ═══════════════════════════════════════════════════════════════
//  SIMPLE KEYWORD SEARCH (no external vector DB needed)
//  Uses TF-IDF style scoring for document retrieval
// ═══════════════════════════════════════════════════════════════

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function searchChunks(query, documents, topK = 5) {
  const queryTokens = tokenize(query);
  const scored = [];

  for (const doc of documents) {
    if (!doc.chunks) continue;
    for (const chunk of doc.chunks) {
      const chunkTokens = tokenize(chunk);
      let score = 0;
      for (const qt of queryTokens) {
        const count = chunkTokens.filter((ct) => ct.includes(qt) || qt.includes(ct)).length;
        score += count;
      }
      // Boost exact phrase matches
      if (chunk.toLowerCase().includes(query.toLowerCase())) {
        score += 10;
      }
      if (score > 0) {
        scored.push({ chunk, docName: doc.name, score });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ═══════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════
//  API ROUTES — ADMIN
// ═══════════════════════════════════════════════════════════════

// Login
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// Get all documents
app.get("/api/admin/documents", requireAdmin, async (req, res) => {
  try {
    const index = await readIndex();
    const docs = index.documents.map(({ chunks, ...rest }) => ({
      ...rest,
      chunkCount: chunks?.length || 0,
    }));
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload & index document
app.post("/api/admin/documents", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const text = await extractText(filePath);
    const chunks = chunkText(text);

    const index = await readIndex();
    const doc = {
      id: crypto.randomUUID(),
      name: req.file.originalname,
      size: `${(req.file.size / 1024).toFixed(0)} KB`,
      uploadedAt: new Date().toISOString(),
      status: "indexed",
      filePath: req.file.filename,
      chunks,
    };
    index.documents.push(doc);
    await writeIndex(index);

    res.json({
      id: doc.id,
      name: doc.name,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      chunkCount: chunks.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete document
app.delete("/api/admin/documents/:id", requireAdmin, async (req, res) => {
  try {
    const index = await readIndex();
    const doc = index.documents.find((d) => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Remove file
    try {
      await fs.unlink(path.join(UPLOADS_DIR, doc.filePath));
    } catch {}

    index.documents = index.documents.filter((d) => d.id !== req.params.id);
    await writeIndex(index);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get settings
app.get("/api/admin/settings", requireAdmin, async (req, res) => {
  const index = await readIndex();
  res.json({ settings: index.settings || getDefaultSettings() });
});

// Update settings
app.put("/api/admin/settings", requireAdmin, async (req, res) => {
  try {
    const index = await readIndex();
    index.settings = { ...getDefaultSettings(), ...index.settings, ...req.body };
    await writeIndex(index);
    res.json({ settings: index.settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public settings (no auth needed — for the widget)
app.get("/api/settings", async (req, res) => {
  const index = await readIndex();
  const s = index.settings || getDefaultSettings();
  res.json({
    botName: s.botName,
    welcomeMessage: s.welcomeMessage,
    primaryColor: s.primaryColor,
  });
});

// ═══════════════════════════════════════════════════════════════
//  API ROUTES — CHAT (public, used by widget)
// ═══════════════════════════════════════════════════════════════

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: "API key not configured. Set ANTHROPIC_API_KEY environment variable.",
      });
    }

    const index = await readIndex();
    const settings = index.settings || getDefaultSettings();

    // Search knowledge base
    const results = searchChunks(message, index.documents, 5);
    const context = results.map((r) => `[Source: ${r.docName}]\n${r.chunk}`).join("\n\n---\n\n");

    // Build system prompt with context
    const systemPrompt = `${settings.systemPrompt}

KNOWLEDGE BASE CONTEXT:
${context || "No relevant documents found in the knowledge base."}

INSTRUCTIONS:
- Answer ONLY based on the knowledge base context above.
- If the context doesn't contain the answer, say: "I don't have information about that in my knowledge base. Please contact our support team for help."
- Always be helpful, concise, and friendly.
- Cite which document the information came from when possible.`;

    // Build message history
    const messages = [
      ...history.slice(-10).map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      })),
      { role: "user", content: message },
    ];

    // Call Claude
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: settings.model,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0]?.text || "I'm sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to generate response. " + err.message });
  }
});

// ─── Serve Admin Panel & Widget ───
app.use("/admin", express.static(path.join(__dirname, "../admin")));
app.get("/widget.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(__dirname, "../widget/chatbot-widget.js"));
});

// ─── Start Server ───
await initDataDir();
app.listen(PORT, () => {
  console.log(`\n🤖 Chatbot server running on http://localhost:${PORT}`);
  console.log(`📋 Admin panel:  http://localhost:${PORT}/admin`);
  console.log(`💬 Widget API:   http://localhost:${PORT}/api/chat\n`);
});
