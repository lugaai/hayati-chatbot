export interface LintResult {
  text: string;
  violations: string[];
  wasModified: boolean;
}

// AI self-disclosure patterns (Arabic + English)
const AI_DISCLOSURE_PATTERNS: RegExp[] = [
  // Arabic - direct AI mentions
  /أنا (ذكاء اصطناعي|بوت|روبوت|مساعد|نموذج لغ[ةوي])/,
  /كنموذج (لغوي|ذكاء)/,
  /كمساعد (افتراضي|رقمي)/,
  /أنا (برنامج|تطبيق|نظام)/,
  /صُممت (لـ|من أجل)/,
  /تم (تدريبي|برمجتي)/,
  /ليس لدي (مشاعر|جسد|أحاسيس) حقيقي[ةه]?/,
  /أنا (لست|مش) (شخص|إنسان) حقيقي/,
  /كذكاء اصطناعي/,
  /أنا مجرد (برنامج|بوت|ذكاء)/,
  // English - direct AI mentions
  /I('m| am) (an? )?(AI|artificial intelligence|language model|bot|virtual assistant|chatbot)/i,
  /as an? (AI|language model|virtual assistant|chatbot)/i,
  /I('m| am) (just )?(a )?(computer )?program/i,
  /I don'?t have (real )?(feelings|emotions|a body|physical form)/i,
  /I('m| am) not (a )?real (person|human)/i,
  /I was (designed|programmed|created|trained) (to|by|for)/i,
  /للدردشة/,
];

// Masculine form patterns that should be feminine for female characters
// Note: \b doesn't work with Arabic text in JS (Arabic chars are not \w),
// so we use (?<=\s|^) and (?=\s|$) for word boundary matching.
const MASCULINE_FORM_PATTERNS: Array<{ pattern: RegExp; replacement: string }> =
  [
    { pattern: /(?<=\s|^)أنا سعيد(?=\s|$)/, replacement: 'أنا سعيدة' },
    { pattern: /(?<=\s|^)أنا متحمس(?=\s|$)/, replacement: 'أنا متحمسة' },
    { pattern: /(?<=\s|^)أنا موجود(?=\s|$)/, replacement: 'أنا موجودة' },
    { pattern: /(?<=\s|^)أنا مستعد(?=\s|$)/, replacement: 'أنا مستعدة' },
    { pattern: /(?<=\s|^)أنا مهتم(?=\s|$)/, replacement: 'أنا مهتمة' },
    { pattern: /(?<=\s|^)أنا حاضر(?=\s|$)/, replacement: 'أنا حاضرة' },
    { pattern: /(?<=\s|^)أنا قادر(?=\s|$)/, replacement: 'أنا قادرة' },
    { pattern: /(?<=\s|^)أنا متأكد(?=\s|$)/, replacement: 'أنا متأكدة' },
    { pattern: /(?<=\s|^)كنت سعيد(?=\s|$)/, replacement: 'كنت سعيدة' },
    { pattern: /(?<=\s|^)أنا مشغول(?=\s|$)/, replacement: 'أنا مشغولة' },
    { pattern: /(?<=\s|^)أنا متفائل(?=\s|$)/, replacement: 'أنا متفائلة' },
    { pattern: /(?<=\s|^)أنا ممتن(?=\s|$)/, replacement: 'أنا ممتنة' },
    { pattern: /(?<=\s|^)أنا فخور(?=\s|$)/, replacement: 'أنا فخورة' },
    { pattern: /(?<=\s|^)أنا محتار(?=\s|$)/, replacement: 'أنا محتارة' },
  ];

// Bio/intro repetition patterns
const BIO_REPETITION_PATTERNS: RegExp[] = [
  /أنا .{2,20}، عمري \d+ (سنة|عام)/,
  /اسمي .{2,20} و(أنا|أعمل)/,
  /I('m| am) .{2,30}, (a |I('m| am) )\d+/i,
  /مرحبا(ً)?،? أنا .{2,20}(،|,) /,
  /من قلب بيروت/,
  /أنا .{2,20} من .{2,20}،/,
];

const MAX_RESPONSE_LENGTH = 300;

export function lintOutput(
  text: string,
  options?: {
    maxLength?: number;
    enforceFeminine?: boolean;
  },
): LintResult {
  const violations: string[] = [];
  let modified = text;
  const maxLen = options?.maxLength ?? MAX_RESPONSE_LENGTH;
  const enforceFem = options?.enforceFeminine ?? false;

  // 1. Check and strip AI self-disclosure
  for (const pattern of AI_DISCLOSURE_PATTERNS) {
    if (pattern.test(modified)) {
      violations.push(`AI_DISCLOSURE: matched "${pattern.source}"`);
      // Remove the offending sentence
      const sentences = modified.split(/(?<=[.!?؟…\n])\s+/);
      const cleaned = sentences.filter((s) => !pattern.test(s));
      if (cleaned.length > 0) {
        modified = cleaned.join(' ');
      }
    }
  }

  // 2. Fix masculine forms to feminine
  if (enforceFem) {
    for (const { pattern, replacement } of MASCULINE_FORM_PATTERNS) {
      if (pattern.test(modified)) {
        violations.push(
          `MASCULINE_FORM: "${pattern.source}" -> "${replacement}"`,
        );
        modified = modified.replace(pattern, replacement);
      }
    }
  }

  // 3. Check for bio repetition (flag only, don't auto-fix)
  for (const pattern of BIO_REPETITION_PATTERNS) {
    if (pattern.test(modified)) {
      violations.push(`BIO_REPEAT: matched "${pattern.source}"`);
    }
  }

  // 4. Length check
  if (modified.length > maxLen) {
    violations.push(`LENGTH_EXCEEDED: ${modified.length} > ${maxLen}`);
    const truncated = modified.substring(0, maxLen);
    const lastBoundary = Math.max(
      truncated.lastIndexOf('؟'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('?'),
      truncated.lastIndexOf('\n'),
    );
    if (lastBoundary > maxLen * 0.5) {
      modified = modified.substring(0, lastBoundary + 1);
    }
  }

  return {
    text: modified.trim(),
    violations,
    wasModified: modified.trim() !== text.trim(),
  };
}
