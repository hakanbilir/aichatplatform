// apps/web/src/chat/useToolsPanel.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  ExecuteToolResponse,
  ListToolsResponse,
  ToolDescription,
  executeTool,
  listTools,
} from '../api/tools';

export interface ToolRunRecord {
  id: string;
  tool: string;
  argsJson: string;
  resultJson: string;
  ok: boolean;
  error?: string;
  createdAt: Date;
}

export function useToolsPanel(conversationId: string | null, orgId: string | null) {
  const { token } = useAuth();

  const [tools, setTools] = useState<ToolDescription[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const [runs, setRuns] = useState<ToolRunRecord[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function load() {
      if (!token) return; // Type guard / Tip koruması
      setLoadingTools(true);
      setToolsError(null);
      try {
        const res: ListToolsResponse = await listTools(token, {
          conversationId: conversationId ?? undefined,
          orgId: orgId ?? undefined,
        });
        if (cancelled) return;
        setTools(res.tools);
      } catch (err) {
        if (cancelled) return;
        setToolsError((err as Error).message || 'Failed to load tools');
      } finally {
        if (!cancelled) {
          setLoadingTools(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, conversationId, orgId]);

  const runTool = async (tool: string, argsJson: string): Promise<ExecuteToolResponse | null> => {
    if (!token) return null;

    let parsedArgs: unknown = {};

    if (argsJson.trim()) {
      try {
        parsedArgs = JSON.parse(argsJson);
      } catch (err) {
        setExecuteError('Args JSON is invalid.');
        return null;
      }
    }

    setExecuting(true);
    setExecuteError(null);

    try {
      const res = await executeTool(token, {
        conversationId,
        orgId,
        tool,
        args: parsedArgs,
      });

      const record: ToolRunRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        tool: res.tool,
        argsJson: argsJson || '{}',
        resultJson: JSON.stringify(res.ok ? res.result ?? {} : { error: res.error }, null, 2),
        ok: res.ok,
        error: res.error,
        createdAt: new Date(),
      };

      setRuns((prev) => [record, ...prev]);

      return res;
    } catch (err) {
      const msg = (err as Error).message || 'Tool execution failed';
      setExecuteError(msg);
      return null;
    } finally {
      setExecuting(false);
    }
  };

  return {
    tools,
    loadingTools,
    toolsError,
    runs,
    executing,
    executeError,
    runTool,
  };
}

