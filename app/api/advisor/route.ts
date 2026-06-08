import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { messages, financialContext } = await req.json()

  const systemPrompt = `You are FinFix India's AI financial advisor — a sharp, direct, no-fluff advisor for salaried Indians facing debt and cash-flow problems.

${financialContext ? `USER'S FINANCIAL CONTEXT:
${financialContext}

Always anchor your advice to these specific numbers. Never give generic advice.` : ''}

BEHAVIOR RULES:
- Be direct and specific. Use the user's actual numbers in every response.
- No motivational language. No "you can do it!". No textbook explanations.
- Lead with the most important thing to do first.
- Use ₹ amounts. Use Indian number format (Lakhs, Crores).
- Responses should be concise — 3 to 5 short paragraphs maximum.
- When asked about debt strategy, always reference the user's actual loans.
- When asked about Dubai or international moves, factor in the Indian loan obligations.
- Executive tone. Board-ready language. Consulting-grade precision.`

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
