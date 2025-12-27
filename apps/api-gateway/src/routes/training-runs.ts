// apps/api-gateway/src/routes/training-runs.ts
// Production-ready training run management routes

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { assertOrgPermission } from '../rbac/guards';

const createTrainingRunBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  mode: z.enum(['SFT', 'DPO', 'SIMPO', 'ORPO', 'RLHF', 'RAG_TRAIN', 'DISTILLATION']),
  backend: z.enum(['LOCAL_CLUSTER', 'PYTHON_SERVICE', 'EXTERNAL_PROVIDER']).optional(),
  baseModelId: z.string().min(1),
  datasetVersionId: z.string().min(1),
  auxDatasetVersionId: z.string().min(1).optional(),
  config: z.record(z.any()).optional(),
  projectId: z.string().min(1).optional(), // Optional: will use default project if not provided
});

const updateTrainingRunBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  config: z.record(z.any()).optional(),
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

export default async function trainingRunsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // List training runs
  app.get('/api/v1/training-runs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:read',
    );

    const trainingRuns = await prisma.trainingRun.findMany({
      where: {
        orgId,
        projectId,
      },
      include: {
        baseModel: true,
        datasetVersion: {
          include: {
            dataset: true,
          },
        },
        auxDatasetVersion: {
          include: {
            dataset: true,
          },
        },
        _count: {
          select: { trainingMetrics: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send(trainingRuns);
  });

  // Get training run by ID
  app.get('/api/v1/training-runs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid training run ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:read',
    );

    const trainingRun = await prisma.trainingRun.findFirst({
      where: {
        id: parsedParams.data.id,
        orgId,
        projectId,
      },
      include: {
        baseModel: true,
        datasetVersion: {
          include: {
            dataset: true,
          },
        },
        auxDatasetVersion: {
          include: {
            dataset: true,
          },
        },
        trainingMetrics: {
          orderBy: { step: 'asc' },
          take: 1000, // Limit for performance
        },
      },
    });

    if (!trainingRun) {
      return reply.code(404).send({ error: 'Training run not found' });
    }

    return reply.send(trainingRun);
  });

  // Create training run
  app.post('/api/v1/training-runs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId: contextProjectId } = await getContext(request);

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    const parseBody = createTrainingRunBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: 'Invalid training run data', details: parseBody.error.format() });
    }

    // Use provided projectId or context projectId
    const projectId = parseBody.data.projectId || contextProjectId;

    // Verify project exists
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId, deletedAt: null },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    // Verify base model exists
    const baseModel = await prisma.baseModel.findUnique({
      where: { id: parseBody.data.baseModelId },
    });

    if (!baseModel) {
      return reply.code(404).send({ error: 'Base model not found' });
    }

    // Verify dataset version exists
    const datasetVersion = await prisma.datasetVersion.findUnique({
      where: { id: parseBody.data.datasetVersionId },
      include: { dataset: true },
    });

    if (!datasetVersion) {
      return reply.code(404).send({ error: 'Dataset version not found' });
    }

    // Verify dataset belongs to same org/project
    if (datasetVersion.dataset.orgId !== orgId || datasetVersion.dataset.projectId !== projectId) {
      return reply.code(400).send({ error: 'Dataset does not belong to this project' });
    }

    // Verify aux dataset version if provided
    if (parseBody.data.auxDatasetVersionId) {
      const auxDatasetVersion = await prisma.datasetVersion.findUnique({
        where: { id: parseBody.data.auxDatasetVersionId },
        include: { dataset: true },
      });

      if (!auxDatasetVersion) {
        return reply.code(404).send({ error: 'Auxiliary dataset version not found' });
      }

      if (auxDatasetVersion.dataset.orgId !== orgId || auxDatasetVersion.dataset.projectId !== projectId) {
        return reply.code(400).send({ error: 'Auxiliary dataset does not belong to this project' });
      }
    }

    // Create training run
    const trainingRun = await prisma.trainingRun.create({
      data: {
        orgId,
        projectId,
        name: parseBody.data.name,
        description: parseBody.data.description,
        mode: parseBody.data.mode,
        backend: parseBody.data.backend || 'PYTHON_SERVICE',
        baseModelId: parseBody.data.baseModelId,
        datasetVersionId: parseBody.data.datasetVersionId,
        auxDatasetVersionId: parseBody.data.auxDatasetVersionId,
        config: parseBody.data.config || {},
        status: 'QUEUED',
        createdByUserId: payload.userId,
      },
      include: {
        baseModel: true,
        datasetVersion: {
          include: {
            dataset: true,
          },
        },
        auxDatasetVersion: {
          include: {
            dataset: true,
          },
        },
      },
    });

    // TODO: Enqueue training job when queue system is available
    // await trainingQueue.add('train', { orgId, projectId, trainingRunId: trainingRun.id });

    return reply.code(201).send(trainingRun);
  });

  // Update training run
  app.patch('/api/v1/training-runs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid training run ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    const parseBody = updateTrainingRunBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: 'Invalid update data', details: parseBody.error.format() });
    }

    // Verify training run exists
    const existing = await prisma.trainingRun.findFirst({
      where: {
        id: parsedParams.data.id,
        orgId,
        projectId,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Training run not found' });
    }

    const updated = await prisma.trainingRun.update({
      where: { id: parsedParams.data.id },
      data: parseBody.data,
    });

    return reply.send(updated);
  });

  // Cancel training run
  app.post('/api/v1/training-runs/:id/cancel', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid training run ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write',
    );

    const trainingRun = await prisma.trainingRun.findFirst({
      where: {
        id: parsedParams.data.id,
        orgId,
        projectId,
      },
    });

    if (!trainingRun) {
      return reply.code(404).send({ error: 'Training run not found' });
    }

    if (trainingRun.status !== 'QUEUED' && trainingRun.status !== 'RUNNING') {
      return reply.code(400).send({ error: 'Training run cannot be cancelled' });
    }

    // TODO: Remove job from queue when queue system is available
    // if (trainingRun.jobId) {
    //   const job = await trainingQueue.getJob(trainingRun.jobId);
    //   if (job) {
    //     await job.remove();
    //   }
    // }

    const updated = await prisma.trainingRun.update({
      where: { id: parsedParams.data.id },
      data: {
        status: 'CANCELLED',
      },
    });

    return reply.send(updated);
  });

  // Get training run metrics
  app.get('/api/v1/training-runs/:id/metrics', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, projectId } = await getContext(request);

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid training run ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:read',
    );

    const trainingRun = await prisma.trainingRun.findFirst({
      where: {
        id: parsedParams.data.id,
        orgId,
        projectId,
      },
    });

    if (!trainingRun) {
      return reply.code(404).send({ error: 'Training run not found' });
    }

    const metrics = await prisma.trainingRunMetric.findMany({
      where: {
        trainingRunId: parsedParams.data.id,
      },
      orderBy: {
        step: 'asc',
      },
    });

    return reply.send(metrics);
  });
}
