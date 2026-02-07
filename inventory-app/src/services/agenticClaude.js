import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
  dangerouslyAllowBrowser: true
});

// Conversation memory - keeps context across interactions
class ConversationMemory {
  constructor() {
    this.messages = [];
    this.context = {
      scannedLocation: null,
      lastAction: null,
      recentItems: [],
      uncertainties: []
    };
  }

  addUserMessage(content) {
    this.messages.push({
      role: 'user',
      content
    });
  }

  addAssistantMessage(content) {
    this.messages.push({
      role: 'assistant',
      content
    });
  }

  updateContext(key, value) {
    this.context[key] = value;
  }

  getContext() {
    return this.context;
  }

  clear() {
    this.messages = [];
    this.context = {
      scannedLocation: null,
      lastAction: null,
      recentItems: [],
      uncertainties: []
    };
  }

  // Get last N messages for Claude
  getRecentMessages(count = 10) {
    return this.messages.slice(-count);
  }
}

// Single instance of conversation memory
const memory = new ConversationMemory();

/**
 * AGENTIC APPROACH: Let Claude handle EVERYTHING
 * - Item matching (fuzzy, synonyms, typos)
 * - Location inference
 * - Clarification questions
 * - Action confirmation
 * - Conversation flow
 */
export async function processConversation(userInput, scannedCode = null, allItems = []) {
  // Update context
  if (scannedCode) {
    memory.updateContext('scannedLocation', scannedCode);
  }

  // Build system prompt with context
  const systemPrompt = `You are an intelligent inventory assistant. You help users manage their warehouse inventory through natural conversation.

CURRENT CONTEXT:
${scannedCode ? `- Scanned Location: ${scannedCode}` : '- No location scanned'}
${memory.context.lastAction ? `- Last Action: ${memory.context.lastAction}` : ''}
${memory.context.recentItems.length > 0 ? `- Recent Items: ${memory.context.recentItems.join(', ')}` : ''}

AVAILABLE ITEMS IN DATABASE:
${allItems.length > 0 ? JSON.stringify(allItems.slice(0, 20), null, 2) : 'No items yet'}

YOUR CAPABILITIES:
1. ADD items to locations
2. REMOVE items from locations
3. MOVE items between locations
4. SEARCH for items

INTERACTION RULES:
- Be conversational and helpful
- Ask for clarification if ANYTHING is uncertain
- Handle typos, synonyms, and fuzzy matching
- Remember context from previous messages
- Confirm actions clearly
- If user says "those" or "them", refer to recent items
- If confidence < 80%, ask for confirmation

LOCATION NAMING:
- Normalize location names consistently
- "bin 1", "bin number 1", "bin number one" → "BIN-1"
- "bin 2", "bin two" → "BIN-2"
- "workbench a", "workbench A" → "WORKBENCH-A"
- "shelf 1", "shelf one" → "SHELF-1"
- "cabinet a" → "CABINET-A"
- Always use uppercase and hyphens for consistency

RESPONSE FORMAT (JSON):
{
  "action": "ADD" | "REMOVE" | "MOVE" | "SEARCH" | "CLARIFY" | "CONFIRM",
  "items": [{"description": "...", "quantity": number}],
  "from_location": "...",
  "to_location": "...",
  "response_message": "Friendly message to user",
  "needs_confirmation": boolean,
  "confidence": 0-100,
  "next_step": "What you need from user next (if anything)"
}

EXAMPLES:

User: "add 5 laser diodes"
→ {"action": "ADD", "items": [{"description": "laser diodes", "quantity": 5}], "to_location": "BIN-1", "response_message": "Got it! Adding 5 laser diodes to BIN-1.", "confidence": 95}

User: "add some stuff"
→ {"action": "CLARIFY", "response_message": "I'd be happy to help! What items would you like to add, and how many?", "needs_confirmation": true}

User: "move those to bin 2"
→ {"action": "MOVE", "items": [{"description": "laser diodes", "quantity": 5}], "from_location": "BIN-1", "to_location": "BIN-2", "response_message": "Moving 5 laser diodes from BIN-1 to BIN-2. Is that correct?", "needs_confirmation": true, "confidence": 70}`;

  // Add user message to memory
  memory.addUserMessage(userInput);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      messages: memory.getRecentMessages()
    });

    const responseText = response.content[0].text;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Claude response was not in expected format');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Add assistant response to memory
    memory.addAssistantMessage(responseText);

    // Update context based on action
    if (parsed.action === 'ADD' || parsed.action === 'REMOVE' || parsed.action === 'MOVE') {
      memory.updateContext('lastAction', parsed.action);
      if (parsed.items && parsed.items.length > 0) {
        memory.updateContext('recentItems', parsed.items.map(i => i.description));
      }
    }

    return parsed;

  } catch (error) {
    console.error('Agentic Claude error:', error);
    throw error;
  }
}

// Clear conversation memory (e.g., when starting fresh)
export function clearConversation() {
  memory.clear();
}

// Get current conversation context
export function getConversationContext() {
  return memory.getContext();
}

export default { processConversation, clearConversation, getConversationContext };
