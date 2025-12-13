// apps/api-gateway/src/services/chatEngineToolsPrompt.ts

import { ToolDefinition } from '../tools/types';

export function buildToolsSystemPrompt(tools: ToolDefinition[]): string {
  const toolLines = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');

  return (
    `You can optionally call tools to help you answer the user.\n\n` +
    `Available tools:\n${toolLines}\n\n` +
    `When you decide that tools are necessary, respond with a JSON object ONLY, ` +
    `using this structure (no extra text):\n\n` +
    `{"toolCalls": [{"tool": "tool.name", "args": { ... }}]}\n\n` +
    `If you do not need tools, respond normally in natural language. Do NOT mix normal language and the JSON object in the same response.`
  );
}

