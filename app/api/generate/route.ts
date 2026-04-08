import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.ZHIPU_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { prompt, wordList } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'ZHIPU_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4.7-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 65536,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('GLM API error:', errorData);
      return NextResponse.json(
        { error: errorData.error || `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 });
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}
