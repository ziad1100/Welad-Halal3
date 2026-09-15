import { api } from './api';

export async function confirmOrder(payload: any) {
  const { data } = await api.post('/orders/confirm', payload);
  return data;
}
export async function holdOrder(payload: any) {
  const { data } = await api.post('/orders/hold', payload);
  return data;
}
export async function listOrders(status = '') {
  const { data } = await api.get('/orders', { params: status ? { status } : {} });
  return data;
}
export async function resumeOrder(id: string) {
  const { data } = await api.post(`/orders/${id}/resume`);
  return data;
}
export async function returnOrder(id: string, payload: any = {}) {
  const { data } = await api.post(`/orders/${id}/return`, payload);
  return data;
}
