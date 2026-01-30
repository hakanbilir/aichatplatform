import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { ThinkingBubble } from './ThinkingBubble';
import { ArtifactRenderer } from './ArtifactRenderer';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  meta?: any;
  thinkingText?: string;
  isThinking?: boolean;
}

// Optimized with React.memo to prevent re-renders of list items during streaming
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ role, content, images, meta, thinkingText, isThinking }) => {
  const { t } = useTranslation('chat');
  const isUser = role === 'user';
  const isTool = role === 'tool';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Artifact detection
  let artifact = null;
  if (isTool) {
      try {
          // Tool content is usually stringified JSON
          const json = JSON.parse(content);
          // Check for array of results or single result
          // The structure from chatEngine is usually `[{ tool: 'name', result: ... }]` (array of ToolExecutionResult)
          // BUT executeToolEnvelope returns array.
          // And chatEngine saves: `content: JSON.stringify(toolResults, null, 2)`
          // So it is an array.
          // I need to find the generate_ui result in the array.

          const results = Array.isArray(json) ? json : [json];
          const uiResult = results.find((r: any) => r.tool === 'generate_ui' && r.result?.status === 'generated');

          if (uiResult) {
              artifact = uiResult.result;
          }
      } catch (e) {
          // not json
      }
  }

  const thought = thinkingText || (meta && meta.thought);

  const renderContent = () => {
    if (artifact) {
        return (
            <ArtifactRenderer
                title={artifact.title}
                type={artifact.type}
                code={artifact.code}
            />
        );
    }

    // Legacy <think> parsing + new thought bubble
    // If we have explicit thought prop, show it.

    const elements = [];

    if (thought || isThinking) {
        elements.push(
            <ThinkingBubble key="thought" text={thought || ''} isThinking={!!isThinking} />
        );
    }

    // Strip <think> tags from content if present (backward compatibility or if leaked)
    const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    if (cleanContent) {
        elements.push(
            <Typography key="content" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {cleanContent}
            </Typography>
        );
    }

    return elements;
  };

  if (isTool && !artifact) {
      // Hide generic tool outputs or show simplified?
      // Usually we hide raw tool outputs unless debugging.
      // But for now let's show them in a collapsed way or just code block.
      return (
        <Box mb={1} sx={{ opacity: 0.6, fontSize: '0.8rem' }}>
            <details>
                <summary>Tool Output</summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</pre>
            </details>
        </Box>
      );
  }

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
      sx={{
        width: '100%', // Ensure full width available for left-aligned messages
        '&:hover .message-actions': {
          opacity: 1
        }
      }}
    >
      <Box
        sx={{
          maxWidth: artifact ? '100%' : '80%', // Allow artifacts to be wider
          width: artifact ? '100%' : 'auto',
          px: artifact ? 0 : 1.8, // Remove padding for artifacts wrapper
          py: artifact ? 0 : 1.2,
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : (artifact ? 'transparent' : 'rgba(15,17,35,0.9)'),
          color: isUser || !artifact ? 'white' : 'text.primary',
          border: isUser || artifact ? 'none' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: isUser ? '0 14px 36px rgba(124,77,255,0.6)' : (artifact ? 'none' : '0 10px 24px rgba(0,0,0,0.65)'),
          position: 'relative',
        }}
      >
        {/* Images */}
        {images && images.length > 0 && (
          <Box display="flex" gap={1} mb={1} flexWrap="wrap">
            {images.map((img, idx) => (
              <Box key={idx} sx={{ borderRadius: 2, overflow: 'hidden', maxWidth: '100%' }}>
                <img src={img} alt="attachment" style={{ maxWidth: '100%', maxHeight: 300, display: 'block' }} />
              </Box>
            ))}
          </Box>
        )}

        {/* Content Wrapper */}
        <Box sx={{ px: artifact ? 0 : 0 }}>
             {renderContent()}
        </Box>

        {!isTool && !artifact && (
        <Box
            className="message-actions"
            sx={{
                position: 'absolute',
                bottom: -28,
                right: isUser ? 0 : 'auto',
                left: isUser ? 'auto' : 0,
                opacity: 0,
                transition: 'opacity 0.2s',
                display: 'flex',
                gap: 0.5,
                zIndex: 1,
            }}
        >
            <Tooltip title={copied ? t('message.copied', 'Copied') : t('message.copy', 'Copy')}>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  aria-label={copied ? t('message.copied', 'Copied') : t('message.copy', 'Copy')}
                  sx={{ color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.2)' }}
                >
                    {copied ? <CheckIcon fontSize="small" sx={{ fontSize: 16 }} /> : <ContentCopyIcon fontSize="small" sx={{ fontSize: 16 }} />}
                </IconButton>
            </Tooltip>
        </Box>
        )}
      </Box>
    </Box>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);
