/**
 * Arabizi (Romanized Arabic) to Arabic script converter.
 * Handles common informal transliteration patterns used in chat.
 */

// Common whole-word Arabizi -> Arabic mappings
const WORD_MAP: Record<string, string> = {
  // Greetings
  ahlan: 'أهلاً',
  marhaba: 'مرحبا',
  salam: 'سلام',
  'al salam 3alaykom': 'السلام عليكم',
  hala: 'هلا',
  'hala wallah': 'هلا والله',
  // Terms of endearment
  habibi: 'حبيبي',
  habibti: 'حبيبتي',
  '7abibti': 'حبيبتي',
  '7abibi': 'حبيبي',
  '7ayati': 'حياتي',
  '3omri': 'عمري',
  'ya 3omri': 'يا عمري',
  'ya 2albi': 'يا قلبي',
  ro7i: 'روحي',
  // How are you variants
  keefik: 'كيفك',
  keefak: 'كيفك',
  kifak: 'كيفك',
  kifik: 'كيفك',
  kiefik: 'كيفك',
  shlonik: 'شلونك',
  shlonich: 'شلونك',
  shlonk: 'شلونك',
  ezayak: 'إزيك',
  ezzayak: 'إزيك',
  // Love expressions
  ba7ebik: 'بحبك',
  ba7ebek: 'بحبك',
  b7bk: 'بحبك',
  b7ebek: 'بحبك',
  a7bik: 'أحبك',
  a7bek: 'أحبك',
  a7ebek: 'أحبك',
  ba3sha2ek: 'بعشقك',
  // Missing you
  wa7ashtini: 'وحشتيني',
  wa7shni: 'وحشني',
  we7eshtini: 'وحشتيني',
  mashta2: 'مشتاق',
  mashta2a: 'مشتاقة',
  meshta2: 'مشتاق',
  meshta2a: 'مشتاقة',
  // Common words
  yalla: 'يلا',
  yallah: 'يلا',
  wallah: 'والله',
  walla: 'والله',
  wallahi: 'والله',
  inshallah: 'إن شاء الله',
  'in sha allah': 'إن شاء الله',
  insha2allah: 'إن شاء الله',
  mashallah: 'ما شاء الله',
  'ma sha allah': 'ما شاء الله',
  la2: 'لا',
  la: 'لا',
  na3am: 'نعم',
  aiwa: 'أيوا',
  eh: 'إيه',
  ah: 'آه',
  shukran: 'شكراً',
  merci: 'ميرسي',
  '3afwan': 'عفواً',
  // Time-related
  saba7: 'صباح',
  'saba7 el kheir': 'صباح الخير',
  'saba7 el noor': 'صباح النور',
  masa2: 'مساء',
  'masa2 el kheir': 'مساء الخير',
  leila: 'ليلة',
  bukra: 'بكرا',
  ba3den: 'بعدين',
  hal2: 'هلأ',
  hala2: 'هلأ',
  al7een: 'الحين',
  il7in: 'الحين',
  dilwa2ti: 'دلوقتي',
  // Common adjectives/expressions
  tamam: 'تمام',
  '7elwe': 'حلوة',
  '7elo': 'حلو',
  '7ilwe': 'حلوة',
  jameele: 'جميلة',
  jameel: 'جميل',
  khalas: 'خلاص',
  '5alas': 'خلاص',
  bas: 'بس',
  kaman: 'كمان',
  kda: 'كده',
  kida: 'كده',
  leh: 'ليه',
  '3adi': 'عادي',
  tayeb: 'طيب',
  '6ayeb': 'طيب',
  '6ab': 'طب',
  tab: 'طب',
  mashi: 'ماشي',
  // Pronouns
  ana: 'أنا',
  enta: 'إنت',
  enti: 'إنتي',
  inte: 'إنت',
  inti: 'إنتي',
  howa: 'هو',
  heya: 'هي',
  e7na: 'إحنا',
  ni7na: 'نحنا',
  // Question words
  shou: 'شو',
  chou: 'شو',
  sho: 'شو',
  wesh: 'وش',
  wish: 'وش',
  wen: 'وين',
  wayn: 'وين',
  fein: 'فين',
  fen: 'فين',
  lesh: 'ليش',
  leish: 'ليش',
  // Verbs/actions
  baddi: 'بدي',
  biddi: 'بدي',
  '3ayez': 'عايز',
  '3ayza': 'عايزة',
  abgha: 'أبغى',
  abi: 'أبي',
  // Other common
  lessa: 'لسه',
  hassa: 'هسع',
  '2awi': 'قوي',
  '8awi': 'قوي',
  '3asal': 'عسل',
  // Goodnight/goodbye
  bye: 'باي',
  bai: 'باي',
  'ma3 el salame': 'مع السلامة',
  // Feelings
  ta3ban: 'تعبان',
  ta3bane: 'تعبانة',
  za3lan: 'زعلان',
  za3lane: 'زعلانة',
  '7azeen': 'حزين',
  '7azeene': 'حزينة',
  malal: 'ملل',
  zah2an: 'زهقان',
};

// Words too ambiguous to count alone (common in English)
const AMBIGUOUS_WORDS = new Set(['la', 'eh', 'ah', 'tab', 'bas', 'hala', 'ana', 'bye', 'bai']);

/**
 * Detect if a string likely contains Arabizi.
 * Uses stricter heuristics to avoid false-positives on plain English text.
 */
export function isLikelyArabizi(text: string): boolean {
  const hasLatin = /[a-zA-Z]/.test(text);
  const hasArabicScript = /[\u0600-\u06FF]/.test(text);

  // If already mostly Arabic script or no Latin chars, skip
  if (hasArabicScript && !hasLatin) return false;
  if (!hasLatin) return false;

  // Check for Arabic-number-adjacent-to-letter patterns (strong Arabizi signal)
  // e.g., 7abibi, ba7ebik, 3omri — not standalone "5pm" or "room 237"
  const hasArabiziNumbers = /[a-zA-Z][23456789][a-zA-Z]|[a-zA-Z][23456789]$|^[23456789][a-zA-Z]/.test(text);

  // Check for known Arabizi words (excluding short ambiguous English words)
  const words = text.toLowerCase().split(/\s+/);
  const strongMatchCount = words.filter(
    (w) => WORD_MAP[w] !== undefined && !AMBIGUOUS_WORDS.has(w),
  ).length;
  const weakMatchCount = words.filter(
    (w) => WORD_MAP[w] !== undefined && AMBIGUOUS_WORDS.has(w),
  ).length;

  // Strong signals: 2+ strong Arabizi words, or 1 strong word + number pattern
  if (strongMatchCount >= 2) return true;
  if (strongMatchCount >= 1 && hasArabiziNumbers) return true;
  // Weak signal: ambiguous words only count with a number pattern
  if (weakMatchCount >= 1 && hasArabiziNumbers) return true;

  return false;
}

/**
 * Convert Arabizi text to Arabic script.
 * Returns the original text if it doesn't appear to be Arabizi.
 */
export function convertArabiziToArabic(text: string): string {
  if (!isLikelyArabizi(text)) return text;

  let result = text;

  // First pass: multi-word phrases (check before splitting)
  const multiWordPhrases = Object.entries(WORD_MAP).filter(([k]) =>
    k.includes(' '),
  );
  for (const [phrase, arabic] of multiWordPhrases) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, arabic);
  }

  // Second pass: whole-word replacements (case-insensitive)
  const words = result.split(/(\s+)/); // preserve whitespace
  const converted = words.map((word) => {
    const lower = word.toLowerCase();
    return WORD_MAP[lower] ?? word;
  });
  result = converted.join('');

  // Third pass: character-level numeric substitutions for remaining Latin segments
  // Handle multi-char mappings first
  result = result.replace(/3'/g, 'غ');
  result = result.replace(/9'/g, 'ض');

  // Single-char numeric substitutions (only in contexts that look like Arabizi)
  // We check if the number is adjacent to Latin characters
  result = result.replace(/(?<=[a-zA-Z])2|2(?=[a-zA-Z])/g, 'ء');
  result = result.replace(/(?<=[a-zA-Z])3|3(?=[a-zA-Z])/g, 'ع');
  result = result.replace(/(?<=[a-zA-Z])5|5(?=[a-zA-Z])/g, 'خ');
  result = result.replace(/(?<=[a-zA-Z])6|6(?=[a-zA-Z])/g, 'ط');
  result = result.replace(/(?<=[a-zA-Z])7|7(?=[a-zA-Z])/g, 'ح');
  result = result.replace(/(?<=[a-zA-Z])8|8(?=[a-zA-Z])/g, 'ق');
  result = result.replace(/(?<=[a-zA-Z])9|9(?=[a-zA-Z])/g, 'ص');

  return result;
}
