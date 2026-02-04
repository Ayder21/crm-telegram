import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchKnowledgeBase(url: string): Promise<string> {
  if (!url) return "";
  try {
    // Превращаем ссылку вида /edit в /export?format=txt
    // Пример: https://docs.google.com/document/d/DOC_ID/edit -> https://docs.google.com/document/d/DOC_ID/export?format=txt

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return "";

    const docId = match[1];
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const res = await fetch(exportUrl);
    if (!res.ok) return "";

    const text = await res.text();
    return text.slice(0, 20000); // Ограничиваем размер (чтобы не переполнить контекст)
  } catch (e) {
    console.error("Error fetching knowledge base:", e);
    return "";
  }
}

export async function generateAIResponse(systemPrompt: string, contextMessages: { role: 'user' | 'assistant'; content: string }[], knowledgeBaseUrl?: string) {
  try {
    let fullSystemPrompt = systemPrompt;

    if (knowledgeBaseUrl) {
      const kbContent = await fetchKnowledgeBase(knowledgeBaseUrl);
      if (kbContent) {
        fullSystemPrompt += `\n\n=== KNOWLEDGE BASE (Use this information to answer) ===\n${kbContent}\n==================================================`;
      }
    }

    // HIDDEN INSTRUCTIONS FOR CRM
    fullSystemPrompt += `
    
    ### CRM SYSTEM INSTRUCTIONS (Hidden from user) ###
    You have access to a tool 'update_status'. You MUST use this tool IMMEDIATELY when the conversation stage changes.
    Rules:
    1. If the user provides a PHONE NUMBER or asks for a CALL -> call update_status({ status: 'waiting_call' }).
    2. If the user asks about PRICE, DETAILS, or shows INTEREST -> call update_status({ status: 'interested' }).
    3. If a meeting/call is SCHEDULED for a specific time -> call update_status({ status: 'scheduled' }).
    4. If the user says NO, REFUSES, or is NOT INTERESTED -> call update_status({ status: 'closed_lost' }).
    5. If the user CONFIRMS PAYMENT or AGREES TO BUY -> call update_status({ status: 'closed_won' }).
    
    Do not ask for permission. Just call the tool if the intent is clear.
    `;

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "update_status",
          description: "Update the CRM status of the conversation based on user intent.",
          parameters: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["interested", "waiting_call", "scheduled", "closed_lost", "closed_won"],
                description: "The new status of the lead."
              }
            },
            required: ["status"]
          }
        }
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2-2025-12-11",
      messages: [
        { role: "system", content: fullSystemPrompt },
        ...contextMessages
      ],
      tools: tools,
      tool_choice: "auto"
    });

    const msg = completion.choices[0].message;

    // Check if AI wants to call a tool
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const toolCall = msg.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'update_status') {
        const args = JSON.parse(toolCall.function.arguments);

        // We return a special marker string that the Telegram Service will detect
        // format: [[UPDATE_STATUS:interested]]
        // Then we recursively call AI to get the actual text response, or just return text if provided.
        // For simplicity, we'll append a hidden command to the response

        // Re-call to get text response
        const secondResponse = await openai.chat.completions.create({
          model: "gpt-5.2-2025-12-11",
          messages: [
            { role: "system", content: fullSystemPrompt },
            ...contextMessages,
            msg,
            { role: "tool", tool_call_id: toolCall.id, content: "Status updated successfully." }
          ]
        });

        const text = secondResponse.choices[0].message.content || "";
        return `[[UPDATE_STATUS:${args.status}]]${text}`;
      }
    }

    return msg.content || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return "I am currently experiencing issues. Please try again later.";
  }
}
