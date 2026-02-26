# Prompt for New Chatbot App Construction

Copy and paste the following prompt into a new AI session to build your separate evaluation chatbot.

---

## Technical Context & Goal
Build a separate, simplified Next.js chatbot application based on the existing "Hayati" codebase. The goal is to create a evaluation platform where users can chat with AI "Girlfriend" models with real-time Arabic dialect translation.

### Requirements:
1.  **Tech Stack**: Next.js (App Router), Tailwind CSS, Lucide React, Framer Motion, and Firebase/Firestore.
2.  **Authentication**: NONE. All conversations are public and stored in a shared collection.
3.  **Core Features**:
    -   AI Chat with multiple "Girlfriend" personas.
    -   Real-time translation to Beirut (BEI) or Riyadh (RIY) dialects using Hugging Face endpoints.
    -   Simplified Firestore storage for public chat history.
4.  **Aesthetics**: Premium, modern, dark-themed UI with smooth animations (similar to the current Hayati app).

---

## 1. LLM & Translation Service Setup
Create a `lib/services.ts` file to handle LLM models and translation endpoints:

```typescript
export const LLM_MODELS = {
  GROK: 'grok-3-mini',
  CLAUDE: 'claude-3-5-sonnet-20241022',
  GPT4: 'gpt-4o-mini',
};

export const TRANSLATOR_MODELS = {
  RIY: {
    id: 'RIY',
    name: 'Riyadh',
    url: 'https://tluj1t5daqjygkwk.us-east-1.aws.endpoints.huggingface.cloud',
  },
  BEI: {
    id: 'BEI',
    name: 'Beirut',
    url: 'https://lb8jazc1zfvc4hik.us-east-1.aws.endpoints.huggingface.cloud',
  }
};
```

## 2. Model Persona Registry
Extract the following model (persona) definitions into `lib/models.ts`:

- **Layan**: 22y, Riyadh. Friendly, talkative, uses Riyadh dialect.
- **Camille**: 24y, Beirut. Sophisticated, elegant, uses Beirut dialect.
- (Draft personas based on `lib/models/` in hayati-v2 including system prompts and openers).

## 3. Simplified Chat API
Create `app/api/chat/route.ts` using the Vercel AI SDK (`ai` package). 
- Integrate the translation logic: when the AI streams a full sentence, call the Hugging Face translation endpoint for the target dialect.
- Use `streamText` or `streamObject`.
- Save the final conversation to a public Firestore collection `public_chats`.

## 4. UI Components
### Chat Interface
- **Sidebar/List**: Show available "Girlfriends".
- **Chat Window**: 
    - Header with model avatar and info.
    - Message list with Framer Motion animations.
    - Support for "thought" indicators or streaming text.
    - Audio playback for translated text (optional but recommended if using TTS).

## 5. Deployment Step: Detailed Walkthrough

### Step A: New GitHub Repository
1.  **Create Repository**: Go to GitHub and create a new repository (e.g., `hayati-eval-bot`).
2.  **Initialize Locally**:
    ```bash
    git init
    git add .
    git commit -m "initial commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/hayati-eval-bot.git
    git push -u origin main
    ```

### Step B: New Firebase Project
1.  **Firebase Console**: Create a new project at [console.firebase.google.com](https://console.firebase.google.com/).
2.  **Firestore**: Click "Firestore Database" -> "Create database". Use "Start in production mode" and choose a region (e.g., `us-central1`).
    - **Security Rules**: Set rules to allow public read/write for the evaluation phase (or keep them restricted to authorized keys).
3.  **App Registration**: Add a "Web" app to the project. Copy the `firebaseConfig` object for client-side use.
4.  **Service Account**: Go to Project Settings -> Service Accounts -> Generate new private key. This is for your Next.js API (Admin SDK).

### Step C: Vercel Deployment
1.  **Import**: Connect your Vercel account to GitHub and import the repo.
2.  **Environment Variables**: Add the following keys in Vercel Settings:
    -   `NEXT_PUBLIC_FIREBASE_CONFIG`: (Base64 of the client config)
    -   `FIREBASE_SERVICE_ACCOUNT`: (Base64 of the service account key)
    -   `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
    -   `HUGGINGFACE_API_KEY` (for translation endpoints)
3.  **Deploy**: Click "Deploy". Your app will be live at `xxx.vercel.app`.

---

**Instruction to AI**: "Start by setting up the project structure and initializing the Firebase configuration. Create the public Firestore collection structure. Then implement the `lib/models.ts` with the provided personas and the translation logic in the API route. Finally, build a stunning chat UI using Tailwind and Framer Motion."
