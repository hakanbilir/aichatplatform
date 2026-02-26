/**
 * Removes <think> tags from message content.
 * Optimized to skip regex if tag is not present.
 *
 * @param content The message content.
 * @param shouldTrim Whether to trim whitespace from the result. Defaults to true.
 *                   Pass false for streaming messages to preserve trailing spaces (better UX)
 *                   and avoid allocation overhead.
 */
export function cleanMessageContent(content: string, shouldTrim = true): string {
  // Optimization: If content doesn't contain <think>, skip the expensive regex
  if (!content.includes('<think>')) {
    return shouldTrim ? content.trim() : content;
  }
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '');
  return shouldTrim ? cleaned.trim() : cleaned;
}

/**
 * Determines if a tool output string is potentially valid JSON and should be parsed.
 * This is a heuristic to avoid expensive JSON.parse calls on partial streams.
 * Optimized to avoid expensive trim() allocation by checking from the end.
 */
export function shouldParseToolOutput(content: string): boolean {
  if (!content) return false;

  // Optimization: Check end for } or ] ignoring whitespace without allocating new string via trim()
  let i = content.length - 1;
  // Skip trailing whitespace
  while (i >= 0 && content[i] <= ' ') {
    i--;
  }

  // If string was all whitespace or empty
  if (i < 0) return false;

  const char = content[i];
  return char === '}' || char === ']';
}
