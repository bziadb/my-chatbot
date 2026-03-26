// ═══════════════════════════════════════════════════════════════
//  EMBEDDABLE CHATBOT WIDGET
//  Drop this script on any website to add the chatbot
//  Usage: <script src="https://your-server.com/widget.js"
//          data-server="https://your-server.com"></script>
// ═══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  const script = document.currentScript;
  const SERVER = script?.getAttribute("data-server") || "";

  // ─── State ───
  let isOpen = false;
  let messages = [];
  let settings = {
    botName: "Aria",
    welcomeMessage: "Hello! I'm your AI assistant. How can I help you today?",
    primaryColor: "#0F6FFF",
  };

  // ─── Fetch Settings ───
  async function loadSettings() {
    try {
      const res = await fetch(`${SERVER}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        settings = { ...settings, ...data };
        messages = [{ role: "bot", text: settings.welcomeMessage }];
        render();
      }
    } catch (e) {
      console.warn("Chatbot: Could not load settings", e);
    }
  }

  // ─── Send Message ───
  async function sendMessage(text) {
    if (!text.trim()) return;
    messages.push({ role: "user", text: text.trim() });
    render();

    // Show typing
    const typingId = Date.now();
    messages.push({ role: "typing", id: typingId });
    render();
    scrollToBottom();

    try {
      const res = await fetch(`${SERVER}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.filter((m) => m.role !== "typing").slice(-10),
        }),
      });
      const data = await res.json();

      // Remove typing indicator
      messages = messages.filter((m) => m.id !== typingId);

      if (data.reply) {
        messages.push({ role: "bot", text: data.reply });
      } else {
        messages.push({
          role: "bot",
          text: "Sorry, I encountered an error. Please try again.",
        });
      }
    } catch {
      messages = messages.filter((m) => m.id !== typingId);
      messages.push({
        role: "bot",
        text: "Sorry, I couldn't connect to the server. Please try again later.",
      });
    }

    render();
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = document.getElementById("cb-messages");
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  // ─── Render ───
  function render() {
    let container = document.getElementById("ai-chatbot-widget");
    if (!container) {
      container = document.createElement("div");
      container.id = "ai-chatbot-widget";
      document.body.appendChild(container);
    }

    const c = settings.primaryColor;

    container.innerHTML = `
      <style>
        #ai-chatbot-widget * { box-sizing: border-box; margin: 0; padding: 0; }
        #ai-chatbot-widget {
          position: fixed; bottom: 24px; right: 24px; z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #cb-bubble {
          width: 60px; height: 60px; border-radius: 50%;
          background: ${c}; color: #fff; border: none; cursor: pointer;
          box-shadow: 0 4px 20px ${c}44, 0 2px 8px rgba(0,0,0,0.15);
          display: ${isOpen ? "none" : "flex"}; align-items: center; justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        #cb-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 28px ${c}55; }
        #cb-window {
          display: ${isOpen ? "flex" : "none"}; flex-direction: column;
          width: 380px; height: 560px; max-height: 80vh;
          border-radius: 16px; overflow: hidden;
          background: #fff; box-shadow: 0 12px 48px rgba(0,0,0,0.18);
          animation: cbSlideUp 0.3s ease;
        }
        @keyframes cbSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 440px) {
          #cb-window { width: calc(100vw - 32px); height: 70vh; bottom: 80px; right: 0; }
        }
        #cb-header {
          padding: 16px 18px; display: flex; align-items: center; gap: 12px;
          background: linear-gradient(135deg, ${c}, ${c}CC); flex-shrink: 0;
        }
        #cb-header-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.2); display: flex;
          align-items: center; justify-content: center;
        }
        #cb-header-name { font-weight: 700; color: #fff; font-size: 15px; }
        #cb-header-status { font-size: 11px; color: rgba(255,255,255,0.75); }
        #cb-close {
          margin-left: auto; background: rgba(255,255,255,0.15); border: none;
          color: #fff; width: 30px; height: 30px; border-radius: 50%;
          cursor: pointer; font-size: 18px; display: flex;
          align-items: center; justify-content: center;
        }
        #cb-close:hover { background: rgba(255,255,255,0.25); }
        #cb-messages {
          flex: 1; overflow-y: auto; padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
          background: #f9fafb;
        }
        .cb-msg { display: flex; gap: 8px; align-items: flex-end; max-width: 85%; animation: cbFadeIn 0.25s ease; }
        .cb-msg-user { margin-left: auto; flex-direction: row-reverse; }
        @keyframes cbFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }
        .cb-msg-avatar {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          background: ${c}15; display: flex; align-items: center;
          justify-content: center; color: ${c}; font-size: 12px;
        }
        .cb-msg-bubble {
          padding: 10px 14px; font-size: 14px; line-height: 1.5;
          white-space: pre-wrap; word-break: break-word;
        }
        .cb-msg-bot .cb-msg-bubble {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 4px 14px 14px 14px; color: #1f2937;
        }
        .cb-msg-user .cb-msg-bubble {
          background: ${c}; color: #fff; border-radius: 14px 4px 14px 14px;
        }
        .cb-typing { display: flex; gap: 4px; padding: 12px 16px; }
        .cb-typing-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #9ca3af; animation: cbBounce 1.2s infinite;
        }
        .cb-typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .cb-typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes cbBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        #cb-input-area {
          padding: 12px; border-top: 1px solid #e5e7eb;
          display: flex; gap: 8px; align-items: center;
          background: #fff; flex-shrink: 0;
        }
        #cb-input {
          flex: 1; padding: 10px 14px; border-radius: 12px;
          border: 1px solid #e5e7eb; font-size: 14px;
          font-family: inherit; outline: none; color: #1f2937;
          background: #f9fafb;
        }
        #cb-input:focus { border-color: ${c}; box-shadow: 0 0 0 3px ${c}18; }
        #cb-send {
          width: 40px; height: 40px; border-radius: 10px; border: none;
          background: ${c}; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: opacity 0.15s;
        }
        #cb-send:disabled { opacity: 0.4; cursor: default; }
        #cb-powered {
          text-align: center; padding: 6px; font-size: 10px;
          color: #9ca3af; background: #fff;
        }
      </style>

      <!-- Floating Bubble -->
      <button id="cb-bubble" aria-label="Open chat">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>

      <!-- Chat Window -->
      <div id="cb-window">
        <div id="cb-header">
          <div id="cb-header-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>
          </div>
          <div>
            <div id="cb-header-name">${settings.botName}</div>
            <div id="cb-header-status">Online</div>
          </div>
          <button id="cb-close">&times;</button>
        </div>

        <div id="cb-messages">
          ${messages
            .map((m) => {
              if (m.role === "typing") {
                return `<div class="cb-msg cb-msg-bot"><div class="cb-msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg></div><div class="cb-msg-bubble"><div class="cb-typing"><div class="cb-typing-dot"></div><div class="cb-typing-dot"></div><div class="cb-typing-dot"></div></div></div></div>`;
              }
              const cls = m.role === "user" ? "cb-msg-user" : "cb-msg-bot";
              const avatar =
                m.role === "user"
                  ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
                  : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>`;
              // Escape HTML to prevent XSS
              const safe = m.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
              return `<div class="cb-msg ${cls}">${m.role === "bot" ? `<div class="cb-msg-avatar">${avatar}</div>` : ""}<div class="cb-msg-bubble">${safe}</div>${m.role === "user" ? `<div class="cb-msg-avatar" style="background:${c}20;color:${c}">${avatar}</div>` : ""}</div>`;
            })
            .join("")}
        </div>

        <div id="cb-input-area">
          <input id="cb-input" type="text" placeholder="Type a message..." autocomplete="off" />
          <button id="cb-send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          </button>
        </div>
        <div id="cb-powered">Powered by AI</div>
      </div>
    `;

    // ─── Event Listeners ───
    document.getElementById("cb-bubble")?.addEventListener("click", () => {
      isOpen = true;
      render();
      scrollToBottom();
      setTimeout(() => document.getElementById("cb-input")?.focus(), 100);
    });

    document.getElementById("cb-close")?.addEventListener("click", () => {
      isOpen = false;
      render();
    });

    const input = document.getElementById("cb-input");
    const sendBtn = document.getElementById("cb-send");

    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const val = input.value;
        input.value = "";
        sendMessage(val);
      }
    });

    sendBtn?.addEventListener("click", () => {
      const val = input?.value || "";
      if (input) input.value = "";
      sendMessage(val);
    });
  }

  // ─── Initialize ───
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadSettings();
      render();
    });
  } else {
    loadSettings();
    render();
  }
})();
