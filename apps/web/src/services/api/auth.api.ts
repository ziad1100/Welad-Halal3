import { api } from './api';

export async function loginApi(username: string, password: string) {
  const { data } = await api.post('/auth/login', { username, password });
  return data as { accessToken: string; user: any };
}
export async function meApi() {
  const { data } = await api.get('/auth/me');
  return data;
}
export async function approveApi(username: string, password: string) {
  const { data } = await api.post('/auth/approve', { username, password });
  return data as { approvalToken: string; manager: any };
}
