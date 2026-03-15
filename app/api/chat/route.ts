export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { xai } from '@ai-sdk/xai';
import { CHARACTERS, Character } from '@/lib/models';
import { TRANSLATOR_MODELS } from '@/lib/services';
import { detectIntent } from '@/lib/chat/intent-detection';
import { generateAnchorsBlock, getDialectGroup } from '@/lib/chat/behavioral-anchors';
import { lintOutput } from '@/lib/chat/output-lint';
import { convertArabiziToArabic, isLikelyArabizi } from '@/lib/chat/arabizi';

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Dialect-specific style instructions for persona rewriting
const DIALECT_STYLE_PROMPTS: Record<
  string,
  { style: string; markers: string; avoid: string }
> = {
  RIY: {
    style: 'casual Najdi, warm, concise',
    markers: 'وش, علومك, الحين, أبد, تبي, دامك, على كيفك, أبشر, مرّة',
    avoid: 'formal MSA, شو (Levantine), إزيك (Egyptian), أنا ذكاء اصطناعي',
  },
  BEI: {
    style: 'natural Beiruti, expressive, witty, warm',
    markers: 'شو, عنجد, هيك, يعني, خلص, يا عيني, حلو, بدّي, هلّق, كتير',
    avoid: 'formal MSA, وش (Gulf), إزيك (Egyptian), أنا ذكاء اصطناعي',
  },
};

function takeCompleteSentences(buf: string): { sentences: string[]; remainder: string } {
  const re = /([\.!\?؟…\n])(?:[""»')\]]*)\s+/g;
  const matches = Array.from(buf.matchAll(re));
  if (matches.length === 0) {
    return { sentences: [], remainder: buf };
  }
  const sentences: string[] = [];
  let lastIndex = 0;
  for (const match of matches) {
    const endIndex = match.index! + match[0].length;
    const sentence = buf.slice(lastIndex, endIndex).trim();
    if (sentence) sentences.push(sentence);
    lastIndex = endIndex;
  }
  return { sentences, remainder: buf.slice(lastIndex) };
}

async function translateToDialect(
    text: string,
    dialectKey: 'RIY' | 'BEI',
    localizerHints?: Character['localizerHints'],
): Promise<string | null> {
    if (!text.trim()) return text;
    const modelToken = TRANSLATOR_MODELS[dialectKey];
    if (!modelToken) return text;

    const dialectName = dialectKey === 'RIY' ? 'Arabic Riyadh dialect' : 'Arabic Beirut dialect';
    console.log('[POST /api/chat] [Translation] Start', {
        dialect: dialectKey,
        url: modelToken.url,
        inputLength: text.length,
        inputPreview: text.length > 60 ? text.slice(0, 60) + '…' : text,
    });

    try {
        const dialectStyle = DIALECT_STYLE_PROMPTS[dialectKey];

        // Build persona-aware prompt
        let promptText: string;

        if (localizerHints && localizerHints.fewShotPairs.length > 0) {
            // Persona rewriter mode (character-specific)
            const fewShotBlock = localizerHints.fewShotPairs
                .map((pair) => `Input: ${pair.input}\nOutput: ${pair.output}`)
                .join('\n\n');

            const avoidList = [
                ...(dialectStyle?.avoid ? [dialectStyle.avoid] : []),
                ...(localizerHints.avoidPatterns ?? []),
            ].join(', ');

            promptText = `Rewrite the following text into natural ${dialectName}.
Tone: ${localizerHints.toneLabel}. Keep it casual and short.
Use these dialect markers naturally: ${localizerHints.slangExamples.join(', ')}.
Never use: ${avoidList}.
Output only the rewritten text, nothing else.

${fewShotBlock}

Input: ${text}
Output:`;
        } else if (dialectStyle) {
            // Dynamic fallback based on dialect spec
            promptText = `Rewrite the following text into natural ${dialectName}.
Style: ${dialectStyle.style}.
Use dialect markers like: ${dialectStyle.markers}.
Avoid: ${dialectStyle.avoid}.
Keep it casual, short, and natural-sounding. Output only the rewritten text, nothing else.
${text}`;
        } else {
            // Basic fallback for unknown dialects
            promptText = `Rewrite the following text into natural ${dialectName}. Keep it casual, short, and natural-sounding. Output only the rewritten text, nothing else.\n${text}`;
        }

        let response: Response;
        try {
            response = await fetch(modelToken.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inputs: `<s> [INST] ${promptText} [/INST]`,
                    parameters: {
                        max_new_tokens: 150,
                        temperature: 0.4,
                        top_p: 0.9,
                        return_full_text: false
                    }
                }),
            });
        } catch (firstError: any) {
            console.error('[POST /api/chat] [Translation] Network error (first attempt)', {
                dialect: dialectKey,
                url: modelToken.url,
                errorName: firstError?.name,
                errorMessage: firstError?.message,
                errorCode: (firstError as any)?.code,
                cause: firstError?.cause ? String(firstError.cause) : undefined,
                stack: firstError?.stack,
            });
            console.warn('[POST /api/chat] [Translation] Retrying in 1s…');
            await new Promise((r) => setTimeout(r, 1000));
            try {
                response = await fetch(modelToken.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        inputs: `<s> [INST] ${promptText} [/INST]`,
                        parameters: {
                            max_new_tokens: 150,
                            temperature: 0.4,
                            top_p: 0.9,
                            return_full_text: false
                        }
                    }),
                });
            } catch (retryError: any) {
                console.error('[POST /api/chat] [Translation] Network error (retry failed)', {
                    dialect: dialectKey,
                    url: modelToken.url,
                    errorName: retryError?.name,
                    errorMessage: retryError?.message,
                    errorCode: (retryError as any)?.code,
                    cause: retryError?.cause ? String(retryError.cause) : undefined,
                    stack: retryError?.stack,
                });
                return null;
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[POST /api/chat] [Translation] HTTP error', {
                dialect: dialectKey,
                url: modelToken.url,
                status: response.status,
                statusText: response.statusText,
                body: errorText,
            });
            return null;
        }

        const result = await response.json();
        let translated = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;

        if (translated && translated.trim().length > 0) {
            // Clean up common artifacts
            translated = translated
                .replace(/<div>|<\/div>|\[INST\]|\[\/INST\]/g, '')
                .replace(/^Output:\s*/i, '')
                .trim();
            console.log('[POST /api/chat] [Translation] Success', {
                dialect: dialectKey,
                outputLength: translated.length,
                outputPreview: translated.length > 60 ? translated.slice(0, 60) + '…' : translated,
            });
            return translated;
        }

        console.warn('[POST /api/chat] [Translation] Empty or invalid response', {
            dialect: dialectKey,
            url: modelToken.url,
            resultKeys: typeof result === 'object' && result ? Object.keys(result) : [],
        });
        return null;
    } catch (error: any) {
        console.error('[POST /api/chat] [Translation] Unexpected error', {
            dialect: dialectKey,
            errorName: error?.name,
            errorMessage: error?.message,
            errorCode: (error as any)?.code,
            cause: error?.cause ? String(error.cause) : undefined,
            stack: error?.stack,
        });
        return null;
    }
}

export async function POST(req: Request) {
    const body = await req.json();
    const messages = body.messages;
    const characterId = body.girlfriendId || body.characterId || 'layan';
    const modelId = body.modelId || 'grok-3-mini';
    const character = CHARACTERS.find(g => g.id === characterId) || CHARACTERS[0];

    console.log('[POST /api/chat] Start', {
        characterId: character.id,
        characterName: character.name,
        dialect: character.dialect,
        modelId,
        messageCount: messages?.length ?? 0,
    });

    // Pre-process: normalize Arabizi input in the latest user message (for LLM only)
    const lastMessage = messages[messages.length - 1];
    let userText = lastMessage?.content || '';
    if (typeof userText === 'string' && isLikelyArabizi(userText)) {
        const converted = convertArabiziToArabic(userText);
        console.log(`[POST /api/chat] [Arabizi] Converted: "${userText}" -> "${converted}"`);
        // Replace content for LLM processing (original is preserved client-side)
        messages[messages.length - 1] = { ...lastMessage, content: converted };
        userText = converted;
    }

    // Build enhanced system prompt with behavioral anchors + intent detection
    const dialectGroup = getDialectGroup(character.location);
    const anchorsBlock = generateAnchorsBlock(dialectGroup);

    // Detect intent from latest user message
    const { intent, promptHint } = detectIntent(userText);
    if (intent !== 'general') {
        console.log(`[POST /api/chat] [Intent] Detected: ${intent}`);
    }

    const enhancedSystemPrompt =
        character.systemPrompt +
        anchorsBlock +
        (promptHint ? `\n\n${promptHint}` : '') +
        '\n\nIMPORTANT: You MUST respond ONLY in English. Do not use Arabic.';

    // User requested to ONLY use Grok model
    const modelProvider = xai("grok-4-fast-non-reasoning");

    const result = await streamText({
        model: modelProvider as any,
        system: enhancedSystemPrompt,
        messages,
        temperature: 0.8,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.6,
    });

    const encoder = new TextEncoder();
    const textStream = result.textStream;
    const enforceFeminine = character.gender === 'female';

    console.log('[POST /api/chat] [Stream] Start', { dialect: character.dialect });

    const stream = new ReadableStream({
        async start(controller) {
            let buffer = '';
            let sentenceIndex = 0;
            try {
                for await (const chunk of textStream) {
                    buffer += chunk;
                    const { sentences, remainder } = takeCompleteSentences(buffer);
                    buffer = remainder;
                    for (const sentence of sentences) {
                        const raw = sentence.trim();
                        sentenceIndex += 1;
                        console.log('[POST /api/chat] [Stream] Sentence', {
                            index: sentenceIndex,
                            length: raw.length,
                            preview: raw.length > 50 ? raw.slice(0, 50) + '…' : raw,
                        });
                        const translated = (await translateToDialect(
                            raw,
                            character.dialect,
                            character.localizerHints,
                        )) ?? raw;
                        if (translated === raw) {
                            console.log('[POST /api/chat] [Stream] Fallback to original (translation failed or empty)', {
                                index: sentenceIndex,
                                preview: raw.length > 50 ? raw.slice(0, 50) + '…' : raw,
                            });
                        }
                        const linted = lintOutput(translated, {
                            maxLength: Infinity,
                            enforceFeminine,
                        });
                        if (linted.violations.length > 0) {
                            console.log('[POST /api/chat] [Lint] Sentence violations:', linted.violations);
                        }
                        controller.enqueue(encoder.encode(`0:${JSON.stringify(linted.text + ' ')}\n`));
                    }
                }
                if (buffer.trim()) {
                    const raw = buffer.trim();
                    sentenceIndex += 1;
                    console.log('[POST /api/chat] [Stream] Final buffer', {
                        index: sentenceIndex,
                        length: raw.length,
                        preview: raw.length > 50 ? raw.slice(0, 50) + '…' : raw,
                    });
                    const translated = (await translateToDialect(
                        raw,
                        character.dialect,
                        character.localizerHints,
                    )) ?? raw;
                    if (translated === raw) {
                        console.log('[POST /api/chat] [Stream] Fallback to original for final buffer (translation failed or empty)', {
                            index: sentenceIndex,
                            preview: raw.length > 50 ? raw.slice(0, 50) + '…' : raw,
                        });
                    }
                    const linted = lintOutput(translated, {
                        maxLength: Infinity,
                        enforceFeminine,
                    });
                    if (linted.violations.length > 0) {
                        console.log('[POST /api/chat] [Lint] Final buffer violations:', linted.violations);
                    }
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(linted.text)}\n`));
                }
                console.log('[POST /api/chat] [Stream] Complete', { totalSentences: sentenceIndex });
            } catch (e: any) {
                console.error('[POST /api/chat] [Stream] Error', {
                    errorName: e?.name,
                    errorMessage: e?.message,
                    errorCode: (e as any)?.code,
                    cause: e?.cause ? String(e.cause) : undefined,
                    stack: e?.stack,
                    sentenceIndex,
                });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'x-vercel-ai-data-stream': 'v1'
        }
    });
}
