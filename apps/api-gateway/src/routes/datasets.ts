// apps/api-gateway/src/routes/datasets.ts
// Production-ready dataset management routes

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { assertOrgPermission } from '../rbac/guards';
import { StorageService } from '@ai-chat/config';

const createDatasetBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  type: z.enum(['SFT', 'PREFERENCE', 'CLASSIFICATION', 'RAG_DOCS']),
  projectId: z.string().min(1).optional(), // Optional: will create/find default project if not provided
});

const updateDatasetBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(1000).optional(),
  type: z.enum(['SFT', 'PREFERENCE', 'CLASSIFICATION', 'RAG_DOCS']).optional(),
});

const createVersionBodySchema = z.object({
  versionNumber: z.number().int().positive().optional(),
  description: z.string().max(1000).optional(),
});

const finalizeVersionBodySchema = z.object({
  fileName: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().optional(),
});

// Helper to get or create default project for org
async function getOrCreateDefaultProject(orgId: string): Promise<string> {
  let project = await prisma.project.findFirst({
    where: { orgId, slug: 'default', deletedAt: null },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        orgId,
        name: 'Default Project',
        slug: 'default',
        description: 'Default project for datasets and training runs',
      },
    });
  }

  return project.id;
}

// Helper to get orgId and projectId from request
async function getContext(request: any): Promise<{ orgId: string; projectId: string }> {
  const payload = request.user as JwtPayload;
  const orgId = (request.headers['x-org-id'] as string) || (request.tenant?.orgId as string);

  if (!orgId) {
    const membership = await prisma.orgMember.findFirst({
      where: { userId: payload.userId },
      include: { org: true },
    });

    if (!membership) {
      throw new Error('Organization context required');
    }

    const projectId = await getOrCreateDefaultProject(membership.orgId);
    return { orgId: membership.orgId, projectId };
  }

  const projectId = (request.headers['x-project-id'] as string) || await getOrCreateDefaultProject(orgId);
  return { orgId, projectId };
}

export default async function datasetsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  const storageService = new StorageService();

  // List datasets
  app.get('/api/v1/datasets', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:read',
    );

    const datasets = await prisma.dataset.findMany({
      where: {
        orgId,
        projectId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10, // Include recent versions for frontend
        },
        _count: {
          select: { versions: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send(datasets);
  });

  // Get dataset by ID
  app.get('/api/v1/datasets/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid dataset ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:read',
    );

    const dataset = await prisma.dataset.findFirst({
      where: {
        id: parsedParams.data.id,
        orgId,
        projectId,
        deletedAt: null,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!dataset) {
      return reply.code(404).send({ error: 'Dataset not found' });
    }

    return reply.send(dataset);
  });

  // Create dataset
  app.post('/api/v1/datasets', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId: contextProjectId } = await getContext(request);

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    const parseBody = createDatasetBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: 'Invalid dataset data', details: parseBody.error.format() });
    }

    // Use provided projectId or context projectId
    const projectId = parseBody.data.projectId || contextProjectId;

    // Verify project exists and belongs to org
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId, deletedAt: null },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    // Check for existing slug
    const existing = await prisma.dataset.findFirst({
      where: { projectId, slug: parseBody.data.slug, deletedAt: null },
    });

    if (existing) {
      return reply.code(409).send({ error: 'Dataset with this slug already exists' });
    }

    const dataset = await prisma.dataset.create({
      data: {
        orgId,
        projectId,
        name: parseBody.data.name,
        slug: parseBody.data.slug,
        description: parseBody.data.description,
        type: parseBody.data.type,
        createdByUserId: payload.userId,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    return reply.code(201).send(dataset);
  });

  // Update dataset
  app.patch('/api/v1/datasets/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid dataset ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    const parseBody = updateDatasetBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: 'Invalid update data', details: parseBody.error.format() });
    }

    // Verify dataset exists
    const existing = await prisma.dataset.findFirst({
      where: {
        id: parsedParams.data.id,
        orgId,
        projectId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Dataset not found' });
    }

    // If slug is being updated, check for conflicts
    if (parseBody.data.slug && parseBody.data.slug !== existing.slug) {
      const slugConflict = await prisma.dataset.findFirst({
        where: { projectId, slug: parseBody.data.slug, deletedAt: null, id: { not: parsedParams.data.id } },
      });

      if (slugConflict) {
        return reply.code(409).send({ error: 'Dataset with this slug already exists' });
      }
    }

    const updated = await prisma.dataset.update({
      where: { id: parsedParams.data.id },
      data: parseBody.data,
    });

    return reply.send(updated);
  });

  // Delete dataset
  app.delete('/api/v1/datasets/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid dataset ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    const existing = await prisma.dataset.findFirst({
      where: {
        id: parsedParams.data.id,
        orgId,
        projectId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Dataset not found' });
    }

    await prisma.dataset.update({
      where: { id: parsedParams.data.id },
      data: { deletedAt: new Date() },
    });

    return reply.send({ ok: true });
  });

  // Create dataset version
  app.post('/api/v1/datasets/:datasetId/versions', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({ datasetId: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid dataset ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    // Verify dataset exists
    const dataset = await prisma.dataset.findFirst({
      where: {
        id: parsedParams.data.datasetId,
        orgId,
        projectId,
        deletedAt: null,
      },
    });

    if (!dataset) {
      return reply.code(404).send({ error: 'Dataset not found' });
    }

    const parseBody = createVersionBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: 'Invalid version data', details: parseBody.error.format() });
    }

    // Get next version number
    const latestVersion = await prisma.datasetVersion.findFirst({
      where: { datasetId: parsedParams.data.datasetId },
      orderBy: { versionNumber: 'desc' },
    });

    const versionNumber = parseBody.data.versionNumber || (latestVersion ? latestVersion.versionNumber + 1 : 1);

    // Check if version already exists
    const existing = await prisma.datasetVersion.findUnique({
      where: {
        datasetId_versionNumber: {
          datasetId: parsedParams.data.datasetId,
          versionNumber,
        },
      },
    });

    if (existing) {
      return reply.code(409).send({ error: `Version ${versionNumber} already exists` });
    }

    const version = await prisma.datasetVersion.create({
      data: {
        datasetId: parsedParams.data.datasetId,
        versionNumber,
        status: 'DRAFT',
        ...(parseBody.data.description ? { metadata: { description: parseBody.data.description } } : {}),
      },
    });

    return reply.code(201).send(version);
  });

  // Get dataset version
  app.get('/api/v1/datasets/:datasetId/versions/:versionId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({
      datasetId: z.string().min(1),
      versionId: z.string().min(1),
    });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid parameters' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:read',
    );

    // Verify dataset exists
    const dataset = await prisma.dataset.findFirst({
      where: {
        id: parsedParams.data.datasetId,
        orgId,
        projectId,
        deletedAt: null,
      },
    });

    if (!dataset) {
      return reply.code(404).send({ error: 'Dataset not found' });
    }

    const version = await prisma.datasetVersion.findFirst({
      where: {
        id: parsedParams.data.versionId,
        datasetId: parsedParams.data.datasetId,
      },
      include: {
        files: true,
      },
    });

    if (!version) {
      return reply.code(404).send({ error: 'Dataset version not found' });
    }

    return reply.send(version);
  });

  // Get upload URL
  app.get('/api/v1/datasets/:datasetId/versions/:versionId/upload-url', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({
      datasetId: z.string().min(1),
      versionId: z.string().min(1),
    });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid parameters' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    const querySchema = z.object({ fileName: z.string().min(1) });
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: 'fileName query parameter required' });
    }

    // Verify dataset and version exist
    const dataset = await prisma.dataset.findFirst({
      where: {
        id: parsedParams.data.datasetId,
        orgId,
        projectId,
        deletedAt: null,
      },
    });

    if (!dataset) {
      return reply.code(404).send({ error: 'Dataset not found' });
    }

    const version = await prisma.datasetVersion.findFirst({
      where: {
        id: parsedParams.data.versionId,
        datasetId: parsedParams.data.datasetId,
      },
    });

    if (!version) {
      return reply.code(404).send({ error: 'Dataset version not found' });
    }

    const storageKey = storageService.getStoragePath(
      orgId,
      projectId,
      parsedParams.data.datasetId,
      parsedParams.data.versionId,
      parsedQuery.data.fileName,
    );

    const uploadUrl = await storageService.getUploadSignedUrl(storageKey, 3600);

    return reply.send({
      uploadUrl,
      storageKey,
      expiresIn: 3600,
    });
  });

  // Finalize dataset version
  app.post('/api/v1/datasets/:datasetId/versions/:versionId/finalize', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({
      datasetId: z.string().min(1),
      versionId: z.string().min(1),
    });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid parameters' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    const parseBody = finalizeVersionBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: 'Invalid file info', details: parseBody.error.format() });
    }

    // Verify dataset and version exist
    const dataset = await prisma.dataset.findFirst({
      where: {
        id: parsedParams.data.datasetId,
        orgId,
        projectId,
        deletedAt: null,
      },
    });

    if (!dataset) {
      return reply.code(404).send({ error: 'Dataset not found' });
    }

    const version = await prisma.datasetVersion.findFirst({
      where: {
        id: parsedParams.data.versionId,
        datasetId: parsedParams.data.datasetId,
      },
    });

    if (!version) {
      return reply.code(404).send({ error: 'Dataset version not found' });
    }

    const storageKey = storageService.getStoragePath(
      orgId,
      projectId,
      parsedParams.data.datasetId,
      parsedParams.data.versionId,
      parseBody.data.fileName,
    );

    // Create DatasetFile record
    const datasetFile = await prisma.datasetFile.create({
      data: {
        datasetVersionId: parsedParams.data.versionId,
        storageUri: `s3://${process.env.S3_BUCKET || 'aitrainer-datasets'}/${storageKey}`,
        fileName: parseBody.data.fileName,
        fileSizeBytes: parseBody.data.fileSizeBytes,
        ...(parseBody.data.mimeType ? { mimeType: parseBody.data.mimeType } : {}),
      },
    });

    // Update version to set primary file and status
    const updatedVersion = await prisma.datasetVersion.update({
      where: { id: parsedParams.data.versionId },
      data: {
        primaryFileId: datasetFile.id,
        status: 'PROCESSING', // Will be updated by job processor
      },
      include: {
        files: true,
      },
    });

    // TODO: Enqueue dataset ingest job when queue system is available
    // await datasetIngestQueue.add('ingest', { orgId, datasetVersionId: parsedParams.data.versionId });

    return reply.send(updatedVersion);
  });
}
