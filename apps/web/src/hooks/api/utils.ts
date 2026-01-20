import { apiRequest } from '../../api/client';

export async function fetcher<T>([url, token]: [string, string]): Promise<T> {
  return apiRequest<T>(url, { method: 'GET' }, token);
}
