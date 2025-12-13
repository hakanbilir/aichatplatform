// apps/web/src/chat/ChatShellPage.tsx

import React from 'react';
import { Box } from '@mui/material';
import { Outlet, useParams } from 'react-router-dom';
import { ConversationSidebar } from './ConversationSidebar';

/**
 * Layout that combines the left conversation sidebar with the chat content area.
 *
 * Route pattern example:
 *   /app/orgs/:orgId/chat/:conversationId
 */
export const ChatShellPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();

  return (
    <Box display="flex" flex={1} minHeight={0}>
      <ConversationSidebar selectedConversationId={conversationId} />
      <Box flex={1} minWidth={0} display="flex" flexDirection="column">
        <Outlet />
      </Box>
    </Box>
  );
};

