import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { Code, Visibility } from '@mui/icons-material';

interface ArtifactRendererProps {
  title: string;
  type: 'html' | 'svg';
  code: string;
}

export function ArtifactRenderer({ title, type, code }: ArtifactRendererProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Paper sx={{ mt: 2, mb: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', px: 2, bgcolor: 'action.hover', height: 48 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {title || 'Generated Artifact'}
        </Typography>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ minHeight: 48 }}>
            <Tab label="Preview" icon={<Visibility sx={{ fontSize: 16 }} />} iconPosition="start" sx={{ minHeight: 48, py: 0 }} />
            <Tab label="Code" icon={<Code sx={{ fontSize: 16 }} />} iconPosition="start" sx={{ minHeight: 48, py: 0 }} />
        </Tabs>
      </Box>

      <Box sx={{ p: 0, bgcolor: 'background.paper', height: 400, overflow: 'hidden' }}>
        {activeTab === 0 && (
           <Box sx={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff' }}>
             {type === 'html' ? (
                <iframe
                  srcDoc={code}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  sandbox="allow-scripts allow-popups allow-forms"
                  title="artifact-preview"
                />
             ) : (
                <div dangerouslySetInnerHTML={{ __html: code }} style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'auto' }} />
             )}
           </Box>
        )}
        {activeTab === 1 && (
           <Box sx={{ p: 2, bgcolor: '#1e1e1e', height: '100%', overflow: 'auto' }}>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.8rem', color: '#d4d4d4', whiteSpace: 'pre-wrap' }}>
                {code}
              </pre>
           </Box>
        )}
      </Box>
    </Paper>
  );
}
