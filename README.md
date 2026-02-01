# Penny 💸  
*Penny is an AI-powered bank account game designed to boost financial literacy from a young age by letting young learners safely play around with a virtual bank account—learning saving, spending, and real-world money decisions through personalized guidance and voice feedback. 💸*

---

## 🚀 Inspiration

**Penny** started with a childhood misconception.

When I was younger, I thought ATM machines gave out free money. You put in a card, pressed a few buttons, and cash appeared, it felt almost magical! i didn't know *where that money came from*, how bank accounts worked, or why spending decisions mattered until much later.

Looking back, I realized that if I had learned money through something interactive, like a **bank account game** — I would have understood saving, spending, and limits much earlier.

That idea stayed with me.

For **ElleHacks 2026**, under the **Tech for Equity & Social Good** theme, Penny was built to turn that childhood confusion into clarity. Instead of overwhelming dashboards or adult-focused finance tools, Penny introduces money as something you *learn by doing*: seeing balances change, reflecting on monthly habits, and receiving friendly, age-appropriate guidance.

---

## 🎯 Hackathon Pillar

### **Empowerment** 💼⚖️

Penny targets the **Empowerment** pillar by helping young leaners understand how money actually works, not just how to spend it, but *why* decisions matter. Financial literacy is a life skill, and learning it early builds confidence, independence, and long-term stability.

This project also aligns with the sponsor challenge:  
**Wealthsimple — Best Financial Literacy Hack for Kids**

---

## 🧠 What I Learned

- **Kids don’t lack intelligence, they lack exposure**: Financial systems are invisible until someone explains them.
- **Games and simulations teach faster than lectures**: Seeing balances rise and fall builds intuition.
- **Tone matters**: Supportive, friendly feedback keeps users engaged instead of discouraged.
- **Small insights beat big dashboards**: Clear takeaways are more effective than complex charts for beginners.

---

## 🛠️ How Penny Works

### 🗄️ Database — MongoDB
- **MongoDB (Atlas-ready)** stores:
  - Users & authentication data
  - Simulated bank statements / spending entries
  - Monthly summaries
- Data models live in the `models/` directory and are accessed via API routes.

### 🤖 AI Guidance — Gemini API
- **Gemini API** generates personalized financial guidance based on spending context.
- **Zod** is used to validate inputs to the AI, ensuring safety and consistency.

### 🔊 Voice Feedback — ElevenLabs
- **ElevenLabs** converts generated advice into spoken feedback.
- Voice output makes learning feel more human and approachable, like a coach explaining money out loud instead of a wall of text.

### 🌐 Tech Stack
- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **MongoDB**
- **Gemini API**
- **ElevenLabs API**

---

## 📁 Project Structure (High-Level)

```txt
penny/
├── app/
│   ├── api/
│   │   ├── auth/        # signup, login, logout, me
│   │   ├── statement/  # create statements
│   │   ├── statements/ # list statements
│   │   └── month/      # monthly summaries
│   ├── login/
│   ├── signup/
│   ├── play/
│   └── layout.tsx
├── components/
├── lib/
├── models/
├── public/
└── middleware.ts
```

### ⚙️ Setup Instructions
1️⃣ Clone the Repository
git clone https://github.com/mashrufaorc/penny.git
cd penny
2️⃣ Install Dependencies
npm install
3️⃣ Create .env.local
Create a file named .env.local in the project root:

# ---------------------------
# Database
# ---------------------------
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbName>?retryWrites=true&w=majority"

# ---------------------------
# Authentication
# ---------------------------
JWT_SECRET="replace_with_a_long_random_secret"

# ---------------------------
# Gemini (AI Advice)
# ---------------------------
GEMINI_API_KEY="replace_with_your_gemini_api_key"
GEMINI_MODEL="gemini-2.5-flash"

# ---------------------------
# ElevenLabs (Text-to-Speech)
# ---------------------------
ELEVENLABS_API_KEY="replace_with_your_elevenlabs_api_key"
ELEVENLABS_VOICE_ID="optional_voice_id"


### 🧪 Running the App
npm run dev
Open your browser at:
http://localhost:3000


### 💡 Future Improvements
- Interactive bank account challenges (saving goals, spending limits)
- Progress tracking and habit streaks
- Age modes and accessibility-friendly explanations
- Optional guardian/parent view with privacy-first design
- Gamification (badges, milestones, rewards)
- Investements

### 🌱 Closing Note
Penny turns the mystery of “free ATM money” into understanding — helping younge learners grow up confident, informed, and empowered about their finances.

Built with ❤️ at ElleHacks 2026.