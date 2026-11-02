import type { Action, Module, Role, RoleId } from '@/types'

const ALL: Action[] = ['view', 'create', 'edit', 'delete', 'approve', 'export']
const RW: Action[] = ['view', 'create', 'edit']
const V: Action[] = ['view']

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'owner',
    name: 'Chủ khách sạn',
    permissions: Object.fromEntries(
      (['dashboard','calendar','bookings','rooms','rates','promotions','inventory','attendance','declaration','invoices','reports','crm','inbox','channels','settings','audit','leads','cms'] as Module[]).map((m) => [m, ALL]),
    ),
  },
  {
    id: 'manager',
    name: 'Quản lý',
    permissions: {
      dashboard: V, calendar: ALL, bookings: ALL, rooms: ALL, rates: ALL, promotions: ALL, inventory: ['view', 'approve'],
      attendance: ALL, declaration: ALL, invoices: V, reports: ['view', 'export'], crm: ALL, inbox: ALL, channels: ALL,
      settings: V, audit: V, leads: ALL, cms: ALL,
    },
  },
  {
    id: 'receptionist',
    name: 'Lễ tân',
    permissions: {
      dashboard: V, calendar: RW, bookings: RW, rooms: V, rates: V, promotions: V, declaration: ['view', 'create', 'export'],
      invoices: ['view', 'create'], reports: V, crm: RW, inbox: RW, attendance: V,
    },
  },
  {
    id: 'housekeeping',
    name: 'Buồng phòng',
    permissions: { rooms: ['view', 'edit'], inventory: ['view', 'create'], attendance: V },
  },
  {
    id: 'accountant',
    name: 'Kế toán',
    permissions: { dashboard: V, bookings: V, invoices: ALL, reports: ['view', 'export'], inventory: V, rates: V, crm: V, attendance: V },
  },
  {
    id: 'storekeeper',
    name: 'Thủ kho',
    permissions: { inventory: ALL, reports: V, attendance: V },
  },
]

export function can(roles: Role[], roleId: RoleId, module: Module, action: Action = 'view') {
  const role = roles.find((r) => r.id === roleId)
  return !!role?.permissions[module]?.includes(action)
}

/** Trang đầu tiên vai trò được vào */
export function homeFor(roles: Role[], roleId: RoleId): string {
  const order: [Module, string][] = [
    ['dashboard', '/admin'], ['rooms', '/admin/rooms'], ['inventory', '/admin/inventory'], ['invoices', '/admin/invoices'],
  ]
  for (const [m, path] of order) if (can(roles, roleId, m)) return path
  return '/admin/attendance'
}
