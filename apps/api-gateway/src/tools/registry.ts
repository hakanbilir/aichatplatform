// apps/api-gateway/src/tools/registry.ts

import { ToolDefinition } from './types';
import { timeNowTool } from './timeNowTool';
import { orgUsageSnapshotTool } from './orgUsageSnapshotTool';
import { conversationSearchTool } from './conversationSearchTool';

const TOOLS: ToolDefinition<unknown, unknown>[] = [
  timeNowTool as ToolDefinition<unknown, unknown>,
  orgUsageSnapshotTool as ToolDefinition<unknown, unknown>,
  conversationSearchTool as ToolDefinition<unknown, unknown>
];

export function listAllTools(): ToolDefinition[] {
  return TOOLS.slice();
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.name === name);
}

