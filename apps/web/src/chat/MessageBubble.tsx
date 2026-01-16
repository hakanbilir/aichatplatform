import React, { useMemo } from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

const ThinkingBlock: React.FC<{ content: string }> = ({ content }) => {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        bgcolor: 'rgba(0,0,0,0.2)',
        color: 'rgba(255,255,255,0.7)',
        mb: 1,
        borderRadius: 1,
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />}
        sx={{ minHeight: 32, '& .MuiAccordionSummary-content': { margin: '8px 0' } }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <PsychologyIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
            Thought Process
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1 }}>
        <Typography variant="caption" component="div" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {content}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';

  // Parse <think> blocks
  const { thought, mainContent } = useMemo(() => {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      return {
        thought: thinkMatch[1].trim(),
        mainContent: content.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
      };
    }
    return { thought: null, mainContent: content };
  }, [content]);

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
      sx={{ position: 'relative', '&:hover .message-actions': { opacity: 1 } }}
    >
      <Box
        sx={{
          maxWidth: '85%',
          px: 1.8,
          py: 1.2,
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : 'rgba(15,17,35,0.9)',
          color: 'white',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: isUser ? '0 14px 36px rgba(124,77,255,0.6)' : '0 10px 24px rgba(0,0,0,0.65)',
        }}
      >
        {thought && <ThinkingBlock content={thought} />}

        <Box
          sx={{
            '& p': { m: 0, mb: 1 },
            '& p:last-child': { mb: 0 },
            '& pre': {
              bgcolor: 'rgba(0,0,0,0.3)',
              p: 1.5,
              borderRadius: 2,
              overflowX: 'auto',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            '& code': {
              fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              fontSize: '0.9em',
            },
            '& a': { color: '#90caf9' },
            '& table': { borderCollapse: 'collapse', width: '100%', mb: 2 },
            '& th, & td': { border: '1px solid rgba(255,255,255,0.2)', p: 1 },
          }}
        >
          {/* If streaming thought only (mainContent empty), show thought only or spinner?
              If we have thought, we showed it above. If mainContent is empty but thought exists, it's fine.
          */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {mainContent}
          </ReactMarkdown>
        </Box>
      </Box>
    </Box>
  );
};

