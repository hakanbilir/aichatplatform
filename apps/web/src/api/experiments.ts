// apps/web/src/api/experiments.ts

import { apiRequest } from './client';

export interface ExperimentDto {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface ExperimentRunDto {
  id: string;
  experimentId: string;
  variantId: string;
  inputId: string;
  output: string;
  latencyMs: number | null;
  thumbsUp: boolean | null;
  feedbackNote: string | null;
}

export async function fetchExperiments(
  token: string,
  orgId: string
): Promise<{ experiments: any[] }> {
  return apiRequest<{ experiments: any[] }>(
    `/orgs/${orgId}/experiments`,
    { method: 'GET' },
    token
  );
}

export async function createExperiment(
  token: string,
  orgId: string,
  input: { name: string; description?: string }
): Promise<{ experiment: ExperimentDto }> {
  return apiRequest<{ experiment: ExperimentDto }>(
    `/orgs/${orgId}/experiments`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function addExperimentVariant(
  token: string,
  orgId: string,
  experimentId: string,
  input: { name: string; description?: string; chatProfileId?: string; systemPrompt?: string }
): Promise<{ variant: any }> {
  return apiRequest<{ variant: any }>(
    `/orgs/${orgId}/experiments/${experimentId}/variants`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function addExperimentInputs(
  token: string,
  orgId: string,
  experimentId: string,
  inputs: { key: string; content: string }[]
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/experiments/${experimentId}/inputs`,
    {
      method: 'POST',
      body: JSON.stringify({ inputs })
    },
    token
  );
}

export async function runExperiment(
  token: string,
  orgId: string,
  experimentId: string,
  body: { inputIds?: string[]; variantIds?: string[] }
): Promise<{ ok: boolean; runs: any[] }> {
  return apiRequest<{ ok: boolean; runs: any[] }>(
    `/orgs/${orgId}/experiments/${experimentId}/run`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    },
    token
  );
}

export async function sendExperimentFeedback(
  token: string,
  orgId: string,
  runId: string,
  body: { thumbsUp?: boolean; note?: string }
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/experiments/runs/${runId}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    },
    token
  );
}

export async function sendExperimentScore(
  token: string,
  orgId: string,
  runId: string,
  body: { metricKey: string; value: number; note?: string }
): Promise<{ score: any }> {
  return apiRequest<{ score: any }>(
    `/orgs/${orgId}/experiments/runs/${runId}/scores`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    },
    token
  );
}
