// apps/api-gateway/src/routes/promptTemplates.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  systemPrompt: z.string().min(1),
  userPrefix: z.string().optional(),
  assistantStyle: z.string().optional(),
  variables: z
    .record(
      z.object({
        description: z.string().optional(),
        required: z.boolean().optional(),
        defaultValue: z.string().optional()
      })
    )
    .optional(),
  metadata: z.record(z.any()).optional()
});

const updateTemplateMetaSchema = z.object({
  description: z.string().max(512).optional(),
  isArchived: z.boolean().optional()
});

const createVersionSchema = z.object({
  systemPrompt: z.string().min(1),
  userPrefix: z.string().optional(),
  assistantStyle: z.string().optional(),
  variables: z
    .record(
      z.object({
        description: z.string().optional(),
        required: z.boolean().optional(),
        defaultValue: z.string().optional()
      })
    )
    .optional(),
  metadata: z.record(z.any()).optional()
});

export default async function promptTemplatesRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // List templates for an org (42.md)
  app.get('/orgs/:orgId/prompt-templates', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:prompt-templates:read'
    );

    const templates = await prisma.promptTemplate.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            creator: { select: { name: true } }
          }
        }
      }
    });

    const result = templates.map((t) => {
      const v = t.versions[0];
      return {
        id: t.id,
        orgId: t.orgId,
        name: t.name,
        description: t.description,
        isArchived: t.isArchived,
        createdAt: t.createdAt.toISOString(),
        latestVersion: v
          ? {
              id: v.id,
              version: v.version,
              systemPrompt: v.systemPrompt,
              userPrefix: v.userPrefix,
              assistantStyle: v.assistantStyle,
              variables: v.variables as any,
              createdAt: v.createdAt.toISOString(),
              createdByDisplayName: v.creator.name
            }
          : null
      };
    });

    return reply.send({ templates: result });
  });

  // Create template + initial version (42.md)
  app.post('/orgs/:orgId/prompt-templates', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:prompt-templates:write'
    );

    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    const data = parsed.data;

    const tmpl = await prisma.promptTemplate.create({
      data: {
        orgId,
        name: data.name,
        description: data.description ?? null,
        createdById: payload.userId,
        versions: {
          create: {
            version: 1,
            systemPrompt: data.systemPrompt,
            userPrefix: data.userPrefix ?? null,
            assistantStyle: data.assistantStyle ?? null,
            variables: data.variables ?? {},
            metadata: data.metadata ?? {},
            createdById: payload.userId
          }
        }
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: { creator: { select: { name: true } } }
        }
      }
    });

    const latest = tmpl.versions[0];

    // Optional: emitEvent('prompt_template.created', ...)

    return reply.code(201).send({
      template: {
        id: tmpl.id,
        orgId: tmpl.orgId,
        name: tmpl.name,
        description: tmpl.description,
        isArchived: tmpl.isArchived,
        createdAt: tmpl.createdAt.toISOString(),
        latestVersion: {
          id: latest.id,
          version: latest.version,
          systemPrompt: latest.systemPrompt,
          userPrefix: latest.userPrefix,
          assistantStyle: latest.assistantStyle,
          variables: latest.variables as any,
          createdAt: latest.createdAt.toISOString(),
          createdByDisplayName: latest.creator.name
        }
      }
    });
  });

  // Update template metadata (42.md)
  app.patch('/orgs/:orgId/prompt-templates/:templateId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { orgId, templateId } = req.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:prompt-templates:write'
    );

    const parsed = updateTemplateMetaSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    await prisma.promptTemplate.updateMany({
      where: { id: templateId, orgId },
      data: {
        description: parsed.data.description,
        isArchived: parsed.data.isArchived ?? undefined
      }
    });

    return reply.send({ ok: true });
  });

  // Get template w/ all versions (42.md)
  app.get('/orgs/:orgId/prompt-templates/:templateId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { orgId, templateId } = req.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:prompt-templates:read'
    );

    const tmpl = await prisma.promptTemplate.findFirst({
      where: { id: templateId, orgId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: { creator: { select: { name: true } } }
        }
      }
    });

    if (!tmpl) {
      return reply.code(404).send({ error: 'NOT_FOUND' });
    }

    return reply.send({
      template: {
        id: tmpl.id,
        orgId: tmpl.orgId,
        name: tmpl.name,
        description: tmpl.description,
        isArchived: tmpl.isArchived,
        createdAt: tmpl.createdAt.toISOString(),
        versions: tmpl.versions.map((v) => ({
          id: v.id,
          version: v.version,
          systemPrompt: v.systemPrompt,
          userPrefix: v.userPrefix,
          assistantStyle: v.assistantStyle,
          variables: v.variables as any,
          createdAt: v.createdAt.toISOString(),
          createdByDisplayName: v.creator.name
        }))
      }
    });
  });

  // Add new version (42.md)
  app.post('/orgs/:orgId/prompt-templates/:templateId/versions', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { orgId, templateId } = req.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:prompt-templates:write'
    );

    const parsed = createVersionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    const latest = await prisma.promptTemplateVersion.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' }
    });

    const newVersionNumber = (latest?.version ?? 0) + 1;

    const v = await prisma.promptTemplateVersion.create({
      data: {
        templateId,
        version: newVersionNumber,
        systemPrompt: parsed.data.systemPrompt,
        userPrefix: parsed.data.userPrefix ?? null,
        assistantStyle: parsed.data.assistantStyle ?? null,
        variables: parsed.data.variables ?? {},
        metadata: parsed.data.metadata ?? {},
        createdById: payload.userId
      },
      include: { creator: { select: { name: true } } }
    });

    // Optional: emitEvent('prompt_template.version_created', ...)

    return reply.code(201).send({
      version: {
        id: v.id,
        version: v.version,
        systemPrompt: v.systemPrompt,
        userPrefix: v.userPrefix,
        assistantStyle: v.assistantStyle,
        variables: v.variables as any,
        createdAt: v.createdAt.toISOString(),
        createdByDisplayName: v.creator.name
      }
    });
  });
}

