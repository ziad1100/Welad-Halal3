import { api } from './api';

export const partiesApi = {
  list: (type = '') => api.get('/parties', { params: type ? { type } : {} }).then((r) => r.data),
  create: (d: any) => api.post('/parties', d).then((r) => r.data),
  update: (id: string, d: any) => api.patch(`/parties/${id}`, d).then((r) => r.data),
  loyalty: (id: string, points: number) => api.post(`/parties/${id}/loyalty`, { points }).then((r) => r.data),
};
export const purchasesApi = {
  list: () => api.get('/purchases').then((r) => r.data),
  create: (d: any) => api.post('/purchases', d).then((r) => r.data),
  receive: (id: string) => api.post(`/purchases/${id}/receive`).then((r) => r.data),
};
export const mfgApi = {
  boms: () => api.get('/manufacturing/bom').then((r) => r.data),
  addBom: (d: any) => api.post('/manufacturing/bom', d).then((r) => r.data),
  orders: () => api.get('/manufacturing/orders').then((r) => r.data),
  create: (d: any) => api.post('/manufacturing/orders', d).then((r) => r.data),
  complete: (id: string) => api.post(`/manufacturing/orders/${id}/complete`, {}).then((r) => r.data),
};
export const expensesApi = {
  list: () => api.get('/expenses').then((r) => r.data),
  create: (d: any) => api.post('/expenses', d).then((r) => r.data),
};
export const discountsApi = {
  list: () => api.get('/discounts').then((r) => r.data),
  create: (d: any) => api.post('/discounts', d).then((r) => r.data),
  validate: (code: string, subtotal: number) => api.get('/discounts/validate', { params: { code, subtotal } }).then((r) => r.data),
};
export const shiftsApi = {
  list: (employeeId = '') => api.get('/shifts', { params: employeeId ? { employeeId } : {} }).then((r) => r.data),
  current: () => api.get('/shifts/current').then((r) => r.data),
  open: (openingCash: number) => api.post('/shifts/open', { openingCash }).then((r) => r.data),
  close: (id: string, closingCash: number) => api.post(`/shifts/${id}/close`, { closingCash }).then((r) => r.data),
};
export const employeesApi = {
  list: () => api.get('/employees').then((r) => r.data),
  create: (d: any) => api.post('/employees', d).then((r) => r.data),
};
export const reportsApi = {
  daily: () => api.get('/reports/daily-sales').then((r) => r.data),
  top: () => api.get('/reports/top-items').then((r) => r.data),
  invVal: () => api.get('/reports/inventory-value').then((r) => r.data),
  exp: () => api.get('/reports/expenses').then((r) => r.data),
};
export const auditApi = { list: () => api.get('/audit').then((r) => r.data) };
export const settingsApi = {
  all: () => api.get('/settings').then((r) => r.data),
  set: (key: string, value: string) => api.post('/settings', { key, value }).then((r) => r.data),
};
export const usersApi = {
  list: () => api.get('/users').then((r) => r.data),
  create: (d: any) => api.post('/users', d).then((r) => r.data),
  update: (id: string, d: any) => api.patch(`/users/${id}`, d).then((r) => r.data),
  resetPw: (id: string, newPassword: string) => api.post(`/users/${id}/reset-password`, { newPassword }).then((r) => r.data),
  checkUsername: (username: string) => api.get('/users/check-username', { params: { username } }).then((r) => r.data),
};
export const inventoryApi = {
  live: () => api.get('/inventory').then((r) => r.data),
  movements: () => api.get('/inventory/movements').then((r) => r.data),
  adjust: (d: any) => api.post('/inventory/adjust', d).then((r) => r.data),
};
export const productsApi = {
  create: (d: any) => api.post('/products', d).then((r) => r.data),
};
