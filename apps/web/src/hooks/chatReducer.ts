import { ConversationDetails } from '../api/conversations';

export type ChatStatus = 'idle' | 'connecting' | 'streaming' | 'error';

export interface ChatState {
  optimisticMessages: ConversationDetails['messages'];
  streamingText: string;
  thinkingText: string;
  isThinking: boolean;
  toolStatus: string | null;
  status: ChatStatus;
  error: Error | null;
}

export type ChatAction =
  | { type: 'SET_MESSAGES'; messages: ConversationDetails['messages'] }
  | { type: 'START_STREAM'; userMessage: ConversationDetails['messages'][0] }
  | { type: 'TOKEN'; token: string }
  | { type: 'THOUGHT_START' }
  | { type: 'THOUGHT_TOKEN'; token: string }
  | { type: 'THOUGHT_END' }
  | { type: 'TOOL_START'; toolName: string }
  | { type: 'TOOL_END' }
  | { type: 'STREAM_END'; finalMessage?: ConversationDetails['messages'][0] }
  | { type: 'ERROR'; error: Error }
  | { type: 'RESET_STREAM' }
  | { type: 'DELETE_MESSAGES_AFTER'; index: number };

export const initialChatState: ChatState = {
  optimisticMessages: [],
  streamingText: '',
  thinkingText: '',
  isThinking: false,
  toolStatus: null,
  status: 'idle',
  error: null,
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return {
        ...state,
        optimisticMessages: action.messages,
      };

    case 'START_STREAM':
      return {
        ...state,
        optimisticMessages: [...state.optimisticMessages, action.userMessage],
        streamingText: '',
        thinkingText: '',
        isThinking: false, // Reset, wait for thought_start
        toolStatus: null,
        status: 'connecting',
        error: null,
      };

    case 'TOKEN':
      return {
        ...state,
        status: 'streaming',
        streamingText: state.streamingText + action.token,
        // If we get a token, we assume thinking might have ended if it was active,
        // but usually THOUGHT_END comes first. Safe to ensure isThinking is false?
        // Let's rely on explicit events for now, but update status.
      };

    case 'THOUGHT_START':
      return {
        ...state,
        status: 'streaming',
        isThinking: true,
        thinkingText: '',
      };

    case 'THOUGHT_TOKEN':
      return {
        ...state,
        thinkingText: state.thinkingText + action.token,
      };

    case 'THOUGHT_END':
      return {
        ...state,
        isThinking: false,
      };

    case 'TOOL_START':
      return {
        ...state,
        status: 'streaming',
        toolStatus: `Using tool: ${action.toolName}...`,
      };

    case 'TOOL_END':
      // We might want to keep the status until the next token or end
      return {
        ...state,
        toolStatus: null,
      };

    case 'STREAM_END': {
      const newMessages = [...state.optimisticMessages];
      if (action.finalMessage) {
        newMessages.push(action.finalMessage);
      }
      return {
        ...state,
        status: 'idle',
        streamingText: '',
        thinkingText: '',
        isThinking: false,
        toolStatus: null,
        optimisticMessages: newMessages,
      };
    }

    case 'ERROR':
      return {
        ...state,
        status: 'error',
        error: action.error,
        streamingText: '',
        thinkingText: '',
        isThinking: false,
      };

    case 'RESET_STREAM':
      return {
        ...state,
        streamingText: '',
        thinkingText: '',
        isThinking: false,
        toolStatus: null,
        status: 'idle',
      };

    case 'DELETE_MESSAGES_AFTER':
      return {
        ...state,
        optimisticMessages: state.optimisticMessages.slice(0, action.index),
      };

    default:
      return state;
  }
}
