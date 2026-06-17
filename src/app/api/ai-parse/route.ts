import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { rawText, systemPrompt } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: rawText }
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || '[]'

  let result
  try {
    const clean = text.replace(/```json\n?|```\n?/g, '').trim()
    result = JSON.parse(clean)
  } catch {
    result = []
  }

  return NextResponse.json({ result })
}
