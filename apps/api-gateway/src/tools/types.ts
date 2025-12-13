// apps/api-gateway/src/tools/types.ts

export interface ToolContext {
  userId: string;
  orgId: string | null;
  conversationId: string | null;
}

export interface ToolDefinition<Args = unknown, Result = unknown> {
  /** Unique tool name, e.g. "time.now" or "org.usageSnapshot" */
  name: string;
  /** Human-friendly description, for prompt injection into the LLM */
  description: string;
  /** JSON schema for args (loosely typed here, but you can plug in Zod or similar) */
  argsSchema: any;
  /** Execute the tool with validated args */
  execute: (args: Args, ctx: ToolContext) => Promise<Result>;
}

export interface ToolCall {
  tool: string;
  args: unknown;
}

export interface ToolExecutionResult {
  tool: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Envelope that the LLM can emit when it wants to call tools.
 *
 * Example JSON:
 * {
 *   "toolCalls": [
 *     { "tool": "time.now", "args": {} },
 *     { "tool": "org.usageSnapshot", "args": { "windowDays": 30 } }
 *   ]
 * }
 */
export interface ToolCallEnvelope {
  toolCalls: ToolCall[];
}

