// apps/api-gateway/src/promptStudio/render.ts

import { prisma } from '@ai-chat/db';

interface RenderContext {
  orgId: string;
  userId: string;
  conversationId?: string;
  variables?: Record<string, string>;
}

export async function renderSystemPromptFromProfile(
  chatProfileId: string,
  ctx: RenderContext
): Promise<string | null> {
  const profile = await prisma.chatProfile.findUnique({ where: { id: chatProfileId } });
  if (!profile || !profile.systemTemplateId || !profile.systemTemplateVersion) return null;

  const version = await prisma.promptTemplateVersion.findFirst({
    where: {
      templateId: profile.systemTemplateId,
      version: profile.systemTemplateVersion
    }
  });

  if (!version) return null;

  const vars = (version.variables as any) || {};

  const mergedVars: Record<string, string> = {};

  for (const [key, meta] of Object.entries<any>(vars)) {
    const provided = ctx.variables?.[key];
    if (provided) {
      mergedVars[key] = provided;
    } else if (meta.defaultValue) {
      mergedVars[key] = meta.defaultValue;
    }
  }

  // Some built-in variables
  mergedVars['org_id'] = ctx.orgId;
  mergedVars['user_id'] = ctx.userId;
  mergedVars['conversation_id'] = ctx.conversationId ?? '';
  mergedVars['today'] = new Date().toISOString().split('T')[0];

  return interpolate(version.systemPrompt, mergedVars);
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/{{(\w+)}}/g, (_, key) => {
    return vars[key] ?? `{{${key}}}`;
  });
}
