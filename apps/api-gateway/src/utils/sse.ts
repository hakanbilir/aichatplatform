import { FastifyReply } from 'fastify';

/**
 * Helper to set up Server-Sent Events headers
 */
export function setSSEHeaders(reply: FastifyReply) {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering for Nginx/proxies
  });
}

/**
 * Helper to send an SSE event
 */
export function sendSSEEvent(reply: FastifyReply, data: any, event?: string) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  let message = '';
  if (event) {
    message += `event: ${event}\n`;
  }
  message += `data: ${payload}\n\n`;
  reply.raw.write(message);
}

/**
 * Helper to close the SSE stream
 */
export function endSSEStream(reply: FastifyReply) {
  reply.raw.end();
}
