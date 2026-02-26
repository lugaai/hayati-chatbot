export const dynamic = 'force-dynamic';

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { xai } from '@ai-sdk/xai';
import { GIRLFRIENDS } from '@/lib/models';
import { TRANSLATOR_MODELS } from '@/lib/services';

// Validate that translated text looks like Arabic (contains Arabic characters)
function isArabic(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text);
}

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

async function translateToDialect(text: string, dialectKey: 'RIY' | 'BEI') {
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

        const dialectName = dialectKey === 'RIY' ? 'Riyadh Saudi Arabic' : 'Beirut Lebanese Arabic';
        const prompt = `<s> [INST] Translate the following text to ${dialectName} dialect. Output only exactly the best one translation result, nothing else.\n${text} [/INST]`;

        const response = await fetch(modelToken.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 100,
                    temperature: 0.3,
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
        const translated = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;

        if (translated && translated.trim().length > 0) {
            return translated.trim();
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
    const girlfriendId = body.girlfriendId || 'layan';
    const modelId = body.modelId || 'grok-3-mini';
    const girlfriend = GIRLFRIENDS.find(g => g.id === girlfriendId) || GIRLFRIENDS[0];

    let modelProvider;
    if (modelId.includes('claude')) {
        modelProvider = anthropic(modelId);
    } else if (modelId.includes('grok')) {
        modelProvider = xai(modelId);
    } else {
        modelProvider = openai(modelId || 'gpt-4o-mini');
    }

    const result = await streamText({
        model: modelProvider as any,
        system: `${girlfriend.systemPrompt}. IMPORTANT: You MUST respond ONLY in English. Do not use Arabic.`,
        messages,
    });

    const encoder = new TextEncoder();
    const textStream = result.textStream;

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
                            const translated = await translateToDialect(sentence.trim(), girlfriend.dialect);
                            controller.enqueue(encoder.encode(`0:${JSON.stringify(translated + ' ')}\n`));
                        }
                        buffer = buffer.slice(sentences.join('').length);
                    }
                }
                // Flush remaining buffer
                if (buffer.trim()) {
                    const translated = await translateToDialect(buffer.trim(), girlfriend.dialect);
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(translated)}\n`));
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
