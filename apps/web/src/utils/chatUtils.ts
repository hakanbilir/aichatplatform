/**
 * Removes <think> tags from message content.
 * Optimized to skip regex if tag is not present.
 */
export function cleanMessageContent(content: string): string {
  // Optimization: If content doesn't contain <think>, skip the expensive regex
  if (!content.includes('<think>')) {
    return content.trim();
  }
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Determines if a tool output string is potentially valid JSON and should be parsed.
 * This is a heuristic to avoid expensive JSON.parse calls on partial streams.
 */
export function shouldParseToolOutput(content: string): boolean {
  const trimmed = content.trim();
  // Heuristic: Valid JSON objects end with } and arrays end with ]
  // This avoids parsing partial JSON streams which are guaranteed to fail
  return trimmed.endsWith('}') || trimmed.endsWith(']');
}
