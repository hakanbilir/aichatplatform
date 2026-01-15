import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, images }) => {
  const isUser = role === 'user';
  const { speak, cancel, speaking, supported } = useSpeechSynthesis();

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={2}
      className="micro-fade-in"
      position="relative"
      sx={{
         '&:hover .message-actions': { opacity: 1 }
      }}
    >
      <Box
        sx={{
          maxWidth: '85%',
          px: 2,
          py: 1.5,
          borderRadius: 3,
          borderTopRightRadius: isUser ? 0 : 3,
          borderTopLeftRadius: isUser ? 3 : 0,
          bgcolor: isUser ? 'primary.main' : 'rgba(30,32,45,0.95)',
          color: 'white',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: isUser ? '0 4px 20px rgba(124,77,255,0.3)' : '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Images */}
        {images && images.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt="attachment"
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
              />
            ))}
          </Box>
        )}

        {/* Markdown Content */}
        <Box sx={{
          '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
          '& pre': {
             bg: 'rgba(0,0,0,0.5)',
             p: 1.5,
             borderRadius: 2,
             overflowX: 'auto',
             fontSize: '0.85em',
             border: '1px solid rgba(255,255,255,0.1)'
          },
          '& code': {
             fontFamily: 'monospace',
             bg: 'rgba(255,255,255,0.1)',
             px: 0.5,
             borderRadius: 0.5
          },
          '& pre code': { bg: 'transparent', p: 0 },
          '& ul, & ol': { pl: 2.5 },
          '& a': { color: '#90caf9' },
          '& table': { borderCollapse: 'collapse', width: '100%', mb: 1 },
          '& th, & td': { border: '1px solid rgba(255,255,255,0.2)', p: 0.5 },
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </Box>
      </Box>

      {/* Actions (Copy, Speak) */}
      {!isUser && (
         <Box
            className="message-actions"
            sx={{
               opacity: 0,
               transition: 'opacity 0.2s',
               position: 'absolute',
               bottom: -24,
               left: 0,
               display: 'flex',
               gap: 0.5
            }}
         >
           <CopyButton text={content} />
           {supported && (
             <Tooltip title={speaking ? "Stop" : "Speak"}>
               <IconButton size="small" onClick={speaking ? cancel : () => speak(content)}>
                 {speaking ? <StopIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
               </IconButton>
             </Tooltip>
           )}
         </Box>
      )}
    </Box>
  );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip title={copied ? "Copied" : "Copy"}>
      <IconButton size="small" onClick={handleCopy}>
        {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};
