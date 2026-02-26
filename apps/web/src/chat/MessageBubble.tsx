import { useState, memo, useMemo } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { useEcoMode } from '../hooks/useEcoMode';
import { cleanMessageContent, shouldParseToolOutput } from '../utils/chatUtils';

import { ThinkingBubble } from './ThinkingBubble';
import { ArtifactRenderer } from './ArtifactRenderer';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any;
  thinkingText?: string;
  isThinking?: boolean;
  isStreaming?: boolean;
}

// Optimized with React.memo to prevent re-renders of list items during streaming
const MessageBubbleComponent = ({
  role,
  content,
  images,
  meta,
  thinkingText,
  isThinking,
  isStreaming,
}: MessageBubbleProps) => {
  const { t } = useTranslation('chat');
  const { isEcoMode } = useEcoMode();
  const isUser = role === 'user';
  const isTool = role === 'tool';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Artifact detection
  // Optimized: useMemo avoids re-parsing JSON on every render (e.g. EcoMode toggle, copy state)
  const artifact = useMemo(() => {
    if (!isTool) return null;
    // Optimization: Skip expensive JSON.parse for partial streams that are guaranteed to fail
    if (!shouldParseToolOutput(content)) return null;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uiResult = results.find(
        (r: any) => r.tool === 'generate_ui' && r.result?.status === 'generated',
      );

      if (uiResult) {
        return uiResult.result;
      }
    } catch {
      // not json
    }
    return null;
  }, [isTool, content]);

  const thought = thinkingText || (meta && meta.thought);

  // Optimized: useMemo prevents expensive regex operations on every render
  const cleanContent = useMemo(() => {
    if (artifact) return '';
    // Skip trimming for streaming messages to preserve trailing spaces (UX) and avoid allocation
    return cleanMessageContent(content, !isStreaming);
  }, [content, artifact, isStreaming]);

  const renderContent = () => {
    if (artifact) {
      return <ArtifactRenderer title={artifact.title} type={artifact.type} code={artifact.code} />;
    }

    // Legacy <think> parsing + new thought bubble
    // If we have explicit thought prop, show it.

    const elements = [];

    if (thought || isThinking) {
      elements.push(
        <ThinkingBubble key="thought" text={thought || ''} isThinking={!!isThinking} />,
      );
    }

    if (cleanContent) {
      elements.push(
        <Typography key="content" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {cleanContent}
        </Typography>,
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
          <summary>{t('tools.toolOutput')}</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{content}</pre>
        </details>
      </Box>
    );
  }

  const BubbleComponent = isUser || artifact ? Box : GlassPanel;
  const bubbleProps = isUser || artifact ? {} : { refractive: !isEcoMode };

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
      sx={{
        width: '100%', // Ensure full width available for left-aligned messages
        '&:hover .message-actions': {
          opacity: 1,
        },
      }}
    >
      <BubbleComponent
        {...bubbleProps}
        sx={{
          maxWidth: artifact ? '100%' : '80%', // Allow artifacts to be wider
          width: artifact ? '100%' : 'auto',
          px: artifact ? 0 : 2, // Remove padding for artifacts wrapper
          py: artifact ? 0 : 1.5,
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : artifact ? 'transparent' : undefined,
          color: isUser ? 'white' : 'text.primary',
          boxShadow: isUser ? '0 14px 36px rgba(124,77,255,0.6)' : artifact ? 'none' : undefined,
          position: 'relative',
        }}
      >
        {/* Images */}
        {images && images.length > 0 && (
          <Box display="flex" gap={1} mb={1} flexWrap="wrap">
            {images.map((img, idx) => (
              <Box key={idx} sx={{ borderRadius: 2, overflow: 'hidden', maxWidth: '100%' }}>
                <img
                  src={img}
                  alt="attachment"
                  loading="lazy"
                  decoding="async"
                  style={{ maxWidth: '100%', maxHeight: 300, display: 'block' }}
                />
              </Box>
            ))}
          </Box>
        )}

        {/* Content Wrapper */}
        <Box sx={{ px: artifact ? 0 : 0 }}>{renderContent()}</Box>

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
                sx={{
                  color: 'text.secondary',
                  bgcolor: 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(4px)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {copied ? (
                  <CheckIcon fontSize="small" sx={{ fontSize: 16 }} />
                ) : (
                  <ContentCopyIcon fontSize="small" sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </BubbleComponent>
    </Box>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
