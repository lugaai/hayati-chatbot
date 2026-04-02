export const LLM_MODELS = {
  GROK: 'grok-3-mini',
  CLAUDE: 'claude-3-5-sonnet-20241022',
  GPT4: 'gpt-4o-mini',
};

// Translator model URLs are fetched at runtime from Firebase Remote Config
// (keys: RIYtranslatorURL, BEItranslatorURL). See lib/remote-config.ts.
