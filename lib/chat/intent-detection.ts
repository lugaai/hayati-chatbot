export type UserIntent =
  | 'greeting'
  | 'identity_question'
  | 'compliment'
  | 'bored'
  | 'goodbye'
  | 'emotional_support'
  | 'general';

interface IntentRule {
  intent: UserIntent;
  patterns: RegExp[];
  promptHint: string;
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'greeting',
    patterns: [
      // Najdi/Gulf
      /شلون[كجيه]|وش أخبار[كجيه]|وش علوم[كجيه]|هلا والله|يا هلا|أهلين|هلا بيك|هلا فيك/,
      /هلا\b|مرحبا\b|السلام عليكم|وعليكم السلام|أهلاً?/,
      // Levantine
      /كيف[كجيه]|شو أخبار[كجيه]|شخبار[كجيه]|شو الأخبار|كيف حال[كجيه]/,
      /شو عم تعمل[يه]|شو عم تسو[يه]/,
      // Egyptian
      /إزي[كجيه]|أخبار[كجيه] إيه|عامل[ةه] إيه|إزيك يا/,
      // General Arabic
      /صباح الخير|مساء الخير|صباح النور|مساء النور|صباح الورد/,
      // English
      /^(hey|hi|hello|what'?s up|sup|yo|heya|hiya)\b/i,
      /\bhow are you\b|\bhow r u\b|\bhow('s| is) it going\b/i,
    ],
    promptHint:
      '[CONTEXT: User is greeting/checking in. Reply with a quick personal state + 1 question about their mood or day. Keep under 2 lines. No bio, no formal intro, no self-introduction.]',
  },
  {
    intent: 'identity_question',
    patterns: [
      // Arabic - name questions
      /وش اسم[كجيه]|شو اسم[كجيه]|ايش اسم[كجيه]|إيش اسم[كجيه]|ما اسم[كجيه]/,
      // Arabic - who are you
      /مين (أنت[ي]?|إنت[ي]?|انت[ي]?)|من (أنت[ي]?|إنت[ي]?|انت[ي]?)/,
      // Arabic - tell me about yourself
      /عرفيني (عن|ب)نفس[كجيه]|حكيلي عن (حال[كجيه]|نفس[كجيه])/,
      /قوليلي عن نفس[كجيه]|كلميني عن نفس[كجيه]|احكيلي عن نفس[كجيه]/,
      // Arabic - what do you do
      /وش تشتغل[ين]|شو بتشتغل[ي]|إيش شغل[كج]/,
      // English
      /what('?s| is) your name/i,
      /who are you/i,
      /tell me about yourself/i,
    ],
    promptHint:
      '[CONTEXT: User is asking your name/identity. Give your first name + 1 relevant personal detail (your interest or what you do). Do NOT recite your full bio, occupation, city, or background. Keep it to 1 line.]',
  },
  {
    intent: 'compliment',
    patterns: [
      // Arabic - beauty
      /حلو[ةه]|جميل[ةه]|زين[ةه]|رائع[ةه]|أحلى وحد[ةه]/,
      // Arabic - sweet
      /عسل|سكر|ملاك|يا حلو[ةه]|يا جميل[ةه]/,
      // Arabic - admiration
      /حبيت كلام[كج]|حبيت[كج]|تجنن[ين]|تهبل[ين]|ذوق[كج] حلو|كلام[كج] حلو/,
      // Arabic - more compliments
      /مره حلو[ةه]|واجد حلو[ةه]|كتير حلو[ةه]|أحلى شي|أجمل شي/,
      /يا ناعم[ةه]|يا ذوق|يا قمر/,
      // English
      /\b(beautiful|gorgeous|cute|pretty|stunning|lovely)\b/i,
      /you('re| are) (so )?(amazing|sweet|wonderful|incredible)\b/i,
    ],
    promptHint:
      '[CONTEXT: User is complimenting you. Accept with playful warmth or cute modesty in 1 line. Bounce the energy back. Do NOT over-thank or get formal.]',
  },
  {
    intent: 'bored',
    patterns: [
      // Arabic - boredom
      /مل[لة]|ملّيت|مالي خلق|ماعندي سالفة|ما أدري وش أسوي/,
      /زهقان[ةه]?|زهقت|مش فاض[ي]|ما فيني شي/,
      // Arabic - nothing to do
      /ما عندي شي أسويه|مافي شي أعمله|ما أدري شو أعمل/,
      /يوم طويل|اليوم ممل|ملل الدنيا/,
      // English
      /\b(bored|boring|nothing to do)\b/i,
      /\bso bored\b/i,
    ],
    promptHint:
      '[CONTEXT: User is bored. Energize them with 2 quick fun options or a spontaneous topic. Do NOT lecture about finding hobbies. Be fun and playful.]',
  },
  {
    intent: 'goodbye',
    patterns: [
      // Arabic - goodnight
      /تصبح[ين]? على خير|ليلة سعيدة|تسبح[ين]? على خير/,
      // Arabic - goodbye
      /مع السلامة|يلا أشوف[كج]|لازم أروح|باي|يلا باي/,
      /الله يحفظ[كج]|في أمان الله|يلا\s*(باي)?$/,
      // Arabic - leaving
      /بروح أنام|رايح أنام|رايحة أنام|خلاص لازم أمشي|بشوف[كج] بكرا/,
      /يلا تصبح[ين]?/,
      // English
      /\bgood\s*night\b|\bbye\b|\bgotta go\b|\bsee you\b|\bsee ya\b/i,
      /\bgn\b|\bnighty?\b/i,
    ],
    promptHint:
      '[CONTEXT: User is saying goodbye/goodnight. Give a short, warm send-off in 1 line max. Do NOT try to extend the conversation or ask more questions.]',
  },
  {
    intent: 'emotional_support',
    patterns: [
      // Arabic - tired/stressed
      /تعبان[ةه]?|مضاي[قج][ةه]?|زعلان[ةه]?|حزين[ةه]?|مكتئب[ةه]?/,
      /ضاي[قج][ةه]?|خاي[فج][ةه]?|قلقان[ةه]?/,
      // Arabic - lonely
      /حاسس? حال[يه] لحال[يه]|وحيد[ةه]?|لحال[يه]/,
      // Arabic - need someone
      /محتاج[ةه]? أحد يسمعني|محتاج[ةه]? أتكلم|مو بخير|مش بخير|مش كويس[ةه]?/,
      // Arabic - overwhelmed
      /ما أقدر أكمل|تعبت من كل شي|حاسس? بضيق|مختنق[ةه]?|مش عارف[ةه] شو أسوي/,
      /الدنيا صعبة|اليوم كان صعب|يوم صعب/,
      // English
      /\b(stressed|sad|upset|lonely|depressed|anxious|worried)\b/i,
      /\b(not okay|i'?m not fine|feeling down|feel(ing)? bad)\b/i,
      /\b(having a (bad|rough|hard) (day|time|night))\b/i,
    ],
    promptHint:
      '[CONTEXT: User is expressing distress. Lead with empathy, NOT advice. Validate their feeling in 1 line, then offer warm comfort. Do NOT be clinical or suggest professional help immediately.]',
  },
];

/**
 * Detect the user's intent from their latest message.
 * Returns the matched intent and the prompt hint to inject into the system prompt.
 */
export function detectIntent(userMessage: string): {
  intent: UserIntent;
  promptHint: string;
} {
  const trimmed = userMessage.trim();

  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) {
        return {
          intent: rule.intent,
          promptHint: rule.promptHint,
        };
      }
    }
  }

  return {
    intent: 'general',
    promptHint: '',
  };
}
