export const dynamic = 'force-dynamic';

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

async function translateToDialect(
    text: string,
    dialectKey: 'RIY' | 'BEI',
    localizerHints?: Character['localizerHints'],
) {
    if (!text.trim()) return text;
    const modelToken = TRANSLATOR_MODELS[dialectKey];
    if (!modelToken) return text;

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (process.env.HUGGINGFACE_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.HUGGINGFACE_API_KEY}`;
        }

        const dialectName = dialectKey === 'RIY' ? 'Arabic Riyadh dialect' : 'Arabic Beirut dialect';
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

        const response = await fetch(modelToken.url, {
            method: 'POST',
            headers,
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

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Translation endpoint returned ${response.status}:`, errorText);
            return `[HF Error ${response.status}] ${text}`;
        }

        const result = await response.json();
        let translated = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;

        if (translated && translated.trim().length > 0) {
            // Clean up common artifacts
            translated = translated
                .replace(/<div>|<\/div>|\[INST\]|\[\/INST\]/g, '')
                .replace(/^Output:\s*/i, '')
                .trim();
            return translated;
        }

        return `[HF Empty Result] ${text}`;
    } catch (error: any) {
        console.error('Translation error:', error);
        return `[HF Network Error] ${text}`;
    }
}

export async function POST(req: Request) {
    const body = await req.json();
    const messages = body.messages;
    const characterId = body.girlfriendId || body.characterId || 'layan';
    const modelId = body.modelId || 'grok-3-mini';
    const character = CHARACTERS.find(g => g.id === characterId) || CHARACTERS[0];

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

    const stream = new ReadableStream({
        async start(controller) {
            let buffer = '';
            try {
                for await (const chunk of textStream) {
                    buffer += chunk;
                    // Try to split on sentence boundaries
                    const sentences = buffer.match(/[^.!?]+[.!?]+(\s|$)/g);
                    if (sentences) {
                        for (const sentence of sentences) {
                            const translated = await translateToDialect(
                                sentence.trim(),
                                character.dialect,
                                character.localizerHints,
                            );
                            // Lint the translated sentence
                            const linted = lintOutput(translated, {
                                maxLength: Infinity,
                                enforceFeminine,
                            });
                            if (linted.violations.length > 0) {
                                console.log('[POST /api/chat] [Lint] Sentence violations:', linted.violations);
                            }
                            controller.enqueue(encoder.encode(`0:${JSON.stringify(linted.text + ' ')}\n`));
                        }
                        buffer = buffer.slice(sentences.join('').length);
                    }
                }
                // Flush remaining buffer
                if (buffer.trim()) {
                    const translated = await translateToDialect(
                        buffer.trim(),
                        character.dialect,
                        character.localizerHints,
                    );
                    const linted = lintOutput(translated, {
                        maxLength: Infinity,
                        enforceFeminine,
                    });
                    if (linted.violations.length > 0) {
                        console.log('[POST /api/chat] [Lint] Final buffer violations:', linted.violations);
                    }
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(linted.text)}\n`));
                }
            } catch (e) {
                console.error('Streaming error:', e);
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
