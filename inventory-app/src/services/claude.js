import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
  dangerouslyAllowBrowser: true // For development - in production, use a backend
});

export async function parseCommand(transcript, scannedCode = null) {
  const prompt = `Parse this inventory command: "${transcript}"
${scannedCode ? `\nScanned code: ${scannedCode}` : ''}

Return ONLY valid JSON with this structure:
{
  "action": "ADD" | "REMOVE" | "MOVE" | "SEARCH",
  "items": [
    {
      "description": "item name/description",
      "quantity": number or null
    }
  ],
  "from_location": "location ID or null",
  "to_location": "location ID or null",
  "clarification_needed": "question to ask user if ambiguous, or null"
}

Rules:
- For optics (lenses, connectors, etc.), extract quantity if mentioned
- For fixtures/parts, quantity is always 1
- Extract location IDs like BIN-047, LAB-TABLE-1, etc.
- If action is unclear, set clarification_needed
- For "move X from Y to Z", set from_location and to_location
- For "add X to Y", set to_location only
- For "remove X from Y", set from_location only`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response (Claude sometimes wraps it in markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

export async function searchWithClaude(query, allItems) {
  const prompt = `User is searching for: "${query}"

Here are all items in inventory:
${JSON.stringify(allItems, null, 2)}

Find items that match the search query. Consider:
- Synonyms (lens = optic, fixture = jig)
- Partial matches (f40 should match "2 micron f40 collimating lens")
- Fuzzy matching

Return ONLY valid JSON:
{
  "matches": [
    {
      "item_id": "...",
      "confidence": 0.0 to 1.0
    }
  ],
  "suggestion": "helpful message if no matches or clarification needed"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Claude search error:', error);
    throw error;
  }
}

export default { parseCommand, searchWithClaude };
