interface Env {
  ANTHROPIC_API_KEY: string;
}

interface NicknameRequest {
  names: string[];
}

interface NicknameResponse {
  nicknames: Record<string, string>;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json() as NicknameRequest;
    
    if (!body.names || !Array.isArray(body.names) || body.names.length === 0) {
      return Response.json({ error: 'Names array is required' }, { status: 400 });
    }

    const namesList = body.names.join(', ');
    
    const prompt = `Generate creative, fun padel/tennis-themed nicknames for these players: ${namesList}

Requirements:
- Each nickname should be 1-3 words
- Be playful and sports-themed (power, speed, precision, etc.)
- Make them sound cool and memorable
- Each player gets a unique nickname

Return ONLY a JSON object mapping each name to their nickname, like:
{"Pete": "Thunder Smash", "John": "The Wall"}

No other text, just the JSON.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return Response.json({ error: 'Failed to generate nicknames' }, { status: 500 });
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const textContent = data.content.find(c => c.type === 'text');
    if (!textContent) {
      return Response.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse the JSON response from Claude
    let nicknames: Record<string, string>;
    try {
      // Clean up potential markdown code blocks
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      nicknames = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse nicknames:', textContent.text);
      // Fallback: generate simple nicknames
      nicknames = {};
      body.names.forEach((name, i) => {
        const fallbacks = ['The Ace', 'Power Shot', 'Net Ninja', 'Smash King', 'The Wall', 'Quick Draw', 'Spin Master', 'Rally King'];
        nicknames[name] = fallbacks[i % fallbacks.length];
      });
    }

    return Response.json({ nicknames } as NicknameResponse);
  } catch (error) {
    console.error('Error generating nicknames:', error);
    return Response.json({ error: 'Failed to generate nicknames' }, { status: 500 });
  }
};
