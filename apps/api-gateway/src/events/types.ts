// apps/api-gateway/src/events/types.ts

export type EventType =
  | 'auth.login_succeeded'
  | 'auth.login_failed'
  | 'conversation.created'
  | 'conversation.message_sent'
  | 'conversation.tool_call'
  | 'conversation.rag_used'
  | 'knowledge.document_ingested'
  | 'org.ai_policy_updated'
  | 'org.preset_created'
  | 'org.preset_updated';

export interface BaseEventContext {
  orgId: string;
  userId?: string | null;
}

export interface ConversationEventContext extends BaseEventContext {
  conversationId: string;
}

export interface MessageEventContext extends ConversationEventContext {
  messageId: string;
}

export interface EmitEventParams {
  type: EventType;
  context: BaseEventContext & {
    conversationId?: string;
    messageId?: string;
  };
  metadata?: Record<string, any>;
}

