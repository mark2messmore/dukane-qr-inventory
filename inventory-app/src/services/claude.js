import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
  dangerouslyAllowBrowser: true // For development - in production, use a backend
});

export async function parseCommand(transcript, scannedCode = null) {
  const prompt = `You are a helpful inventory assistant. Parse this command: "${transcript}"
${scannedCode ? `\nCurrently scanned location: ${scannedCode}` : ''}

IMPORTANT: If ANYTHING is unclear or ambiguous, ask for clarification! Be conversational and helpful.

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
  "clarification_needed": "friendly question to ask user if ambiguous, or null",
  "confidence": 0.0 to 1.0
}

Rules & Examples:
- ALWAYS ask for clarification if confidence < 0.8
- If user says "add 5 laser diodes" and location is scanned, use scanned location
- If no location scanned and no location mentioned, ask: "Where would you like to add these items?"
- If item description is vague (e.g., "add some parts"), ask: "What type of parts would you like to add?"
- If quantity is unclear (e.g., "add a few lasers"), ask: "How many lasers exactly?"
- For "move" commands without both locations, ask for missing info
- Extract location IDs like BIN-1, SHELF-1, WORKBENCH-A, etc.
- Be specific in clarifications: "Did you mean to add 5 laser diodes to BIN-1?"

Examples:
User: "add 5 laser diodes" (BIN-1 scanned)
→ action: ADD, items: [{description: "laser diodes", quantity: 5}], to_location: "BIN-1", confidence: 1.0

User: "add some stuff"
→ clarification_needed: "What items would you like to add? Please be specific with the description and quantity."

User: "move lasers"
→ clarification_needed: "How many lasers would you like to move? And from where to where?"`;

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
