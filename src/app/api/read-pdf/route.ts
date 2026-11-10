import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/server/env';
import { BadRequest, fail, limit, readJson } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Read a PDF the browser could not (scans, unusual fonts). The model transcribes the text once;
 * nothing is stored. The text then goes through the normal intake or refusal flow.
 */
export async function POST(req: Request) {
  const blocked = limit(req, 'read-pdf', 12);
  if (blocked) return blocked;
  try {
    const { data } = await readJson<{ data: string }>(req, 4_200_000);
    if (typeof data !== 'string' || data.length < 100) throw new BadRequest('No PDF received.');
    const ai = new Anthropic({ apiKey: env.anthropicKey() });
    const res = (await ai.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 4000,
      thinking: { type: 'disabled' },
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } },
          { type: 'text', text: 'Transcribe all the text in this document, in reading order, as plain text. Do not summarise, add or interpret anything. Return only the text.' },
        ],
      }],
    } as never)) as unknown as Anthropic.Message;
    console.log(`[llm] read-pdf in=${res.usage.input_tokens} out=${res.usage.output_tokens} stop=${res.stop_reason}`);
    const text = res.content.map(c => (c.type === 'text' ? c.text : '')).join('').trim();
    if (text.length < 20) throw new BadRequest('That PDF has no readable text.');
    return NextResponse.json({ text });
  } catch (e) {
    return fail(e);
  }
}
