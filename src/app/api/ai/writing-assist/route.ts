import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function callOllama(model: string, prompt: string, options: Record<string, unknown> = {}): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, ...options }),
  });

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}`);
  }

  const data = await res.json();
  return (data.response as string) || '';
}

function extractJson<T>(text: string, fallback: T): T {
  // Try direct parse first
  try {
    return JSON.parse(text.trim()) as T;
  } catch { /* fall through */ }

  // Find first { or [ block
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]) as T; } catch { /* fall through */ }
  }

  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) as T; } catch { /* fall through */ }
  }

  return fallback;
}

export async function POST(req: NextRequest) {
  const { action, text, partial } = await req.json();

  try {
    if (action === 'ghost') {
      const prompt = partial
        ? `Complete the partial word "${partial}" as it appears in this sentence: "${text}". Return ONLY the one complete word, nothing else.`
        : `Return the single most likely next word to follow: "${text}". Return ONLY that one word, nothing else.`;
      const raw = await callOllama('smollm2:135m', prompt, {
        options: { num_predict: 5, temperature: 0.3 },
      });
      const continuation = raw.trim().split(/\s+/)[0].replace(/[^a-zA-Z'-]/g, '');
      return NextResponse.json({ continuation });
    }

    if (action === 'grammar') {
      const prompt = `You are a grammar checker. Check this text for grammar and style mistakes.
Return ONLY valid JSON in this exact format: {"issues":[{"start":0,"end":5,"message":"explanation","suggestion":"fix"}]}
If no issues found, return: {"issues":[]}

Text: ${text}`;
      const raw = await callOllama('qwen3:0.6b', prompt, {
        think: false,
        options: { num_predict: 400, temperature: 0.1 },
      });
      const parsed = extractJson<{ issues: Array<{ start: number; end: number; message: string; suggestion: string }> }>(
        raw,
        { issues: [] }
      );
      return NextResponse.json(parsed);
    }

    if (action === 'rewrite') {
      const prompt = `Rewrite the following text keeping the same meaning but improving clarity and flow. Return only the rewritten text with no explanation:\n\n${text}`;
      const raw = await callOllama('qwen3:0.6b', prompt, {
        think: false,
        options: { num_predict: 600, temperature: 0.4 },
      });
      return NextResponse.json({ rewritten: raw.trim() });
    }

    if (action === 'titles') {
      const prompt = `Generate 5 SEO-friendly blog post titles (under 60 characters each) for the following content. Return ONLY a JSON array of strings, no explanation:\n\n${text}`;
      const raw = await callOllama('qwen3:0.6b', prompt, {
        think: false,
        options: { num_predict: 300, temperature: 0.5 },
      });
      const titles = extractJson<string[]>(raw, []);
      return NextResponse.json({ titles: Array.isArray(titles) ? titles : [] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[writing-assist]', err);
    // Return empty results so the UI degrades gracefully
    if (action === 'grammar') return NextResponse.json({ issues: [] });
    if (action === 'ghost') return NextResponse.json({ continuation: '' });
    if (action === 'rewrite') return NextResponse.json({ rewritten: '' });
    if (action === 'titles') return NextResponse.json({ titles: [] });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
