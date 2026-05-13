# ✦ Nova AI Chatbot

A sleek AI chatbot powered by **Groq** (free & blazing fast) built with **Next.js**.

---

## 🚀 Deploy in 5 Minutes

### Step 1 — Get Groq API Key (Free)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with Google/GitHub
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

---

### Step 2 — Upload to GitHub
1. Go to [github.com](https://github.com) → **New Repository**
2. Name it `nova-chatbot` → Create
3. Upload all these files (drag & drop)
4. Click **Commit changes**

---

### Step 3 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **Add New Project** → Import your `nova-chatbot` repo
4. Before deploying, go to **Environment Variables**:
   - Name: `GROQ_API_KEY`
   - Value: `gsk_your_key_here`
5. Click **Deploy** 🎉

Your chatbot is now LIVE! 🚀

---

## 💻 Run Locally

```bash
npm install
cp .env.example .env.local
# Add your GROQ_API_KEY in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ✨ Features
- ⚡ Groq powered (ultra fast, free)
- 💬 Multi-turn conversation memory
- 😊 Emoji reactions on messages
- ⎘ Copy any message
- 🗑 Clear chat with confirmation
- ⏱ Timestamps on every message
- 🔢 Character counter
- 🌙 Beautiful dark UI with animations
