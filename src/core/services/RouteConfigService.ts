/*
  文档用途：路由配置公共服务（CRUD 抽取）
  主要功能：
  - 统一读写 public/config/routes.config.yaml 的路由配置
  - 提供顶级路由与子路由的新增、查询、修改、删除方法
  - 提供父路由选项构建、组件路径与路由标题映射构建
*/

import yaml from 'js-yaml'
import { fileManagerService } from '@/core/services/FileManagerService'

export interface RouteMeta { title: string; icon?: string; order: number }
export interface RouteChild { route: string; component: string; meta: RouteMeta }
export interface RouteConfig { route: string; component?: string; meta: RouteMeta; children?: RouteChild[] }
export interface RouteConfigFile { routes: RouteConfig[] }

const CONFIG_PATH = 'public/config/routes.config.yaml'

/**
 * 读取 YAML 路由配置文件
 */
export async function readConfig(): Promise<RouteConfigFile> {
  try {
    const raw = await fileManagerService.readFile(CONFIG_PATH)
    const doc: any = yaml.load(raw) || {}
    const routes: RouteConfig[] = Array.isArray(doc?.routes) ? doc.routes : []
    return { routes }
  } catch {
    return { routes: [] }
  }
}

/**
 * 写入 YAML 路由配置文件
 */
export async function writeConfig(config: RouteConfigFile): Promise<void> {
  const sanitized = sanitizeRoutes(config.routes || [])
  const nextYaml = yaml.dump({ routes: sanitized })
  await fileManagerService.writeFile(CONFIG_PATH, nextYaml)
}

/**
 * 获取全部路由（未排序）
 */
export async function getRoutes(): Promise<RouteConfig[]> {
  const { routes } = await readConfig()
  return routes
}

/**
 * 按 meta.order 对顶级与子路由进行就地排序
 */
export function sortRoutesInPlace(list: RouteConfig[]): void {
  list.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
  list.forEach((r) => {
    if (Array.isArray(r.children)) {
      r.children.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
    }
  })
}

/**
 * 保存路由列表（自动清洗子路由 icon）
 */
export async function saveRoutes(routes: RouteConfig[]): Promise<void> {
  await writeConfig({ routes })
}

/**
 * 归一化视图组件路径到实际文件路径（'@/views/..' -> 'src/views/..'）
 */
export function normalizeViewComponentPath(component: string): string {
  let s = (component || '').trim()
  if (s.startsWith('@/')) s = s.replace('@/', 'src/')
  if (s.startsWith('src/')) return s.replace(/\\/g, '/').replace(/\/*$/, '')
  return s
}

/**
 * 构建视图组件到路由信息的映射（路径与标题）
 */
export async function buildViewRouteInfoMap(): Promise<Record<string, { routePath: string; routeTitle: string }>> {
  const map: Record<string, { routePath: string; routeTitle: string }> = {}
  const { routes } = await readConfig()
  for (const r of routes) {
    if (typeof (r as any)?.component === 'string') {
      const comp = (r as any).component as string
      const routePath = `/${r.route}`
      const routeTitle = typeof (r as any)?.meta?.title === 'string' ? (r as any).meta.title : ''
      const normalized = normalizeViewComponentPath(comp)
      map[normalized] = { routePath, routeTitle }
    }
    if (Array.isArray(r.children)) {
      for (const c of r.children) {
        if (typeof (c as any)?.component === 'string') {
          const comp = (c as any).component as string
          const routePath = `/${r.route}/${c.route}`
          const routeTitle = typeof (c as any)?.meta?.title === 'string' ? (c as any).meta.title : ''
          const normalized = normalizeViewComponentPath(comp)
          map[normalized] = { routePath, routeTitle }
        }
      }
    }
  }
  return map
}

/**
 * 父路由选项列表（来自顶级 routes）
 */
export async function listParentRouteOptions(): Promise<Array<{ value: string; label: string }>> {
  const { routes } = await readConfig()
  return routes
    .map((r) => ({
      value: String(r.route || ''),
      label: typeof r?.meta?.title === 'string' && r.meta.title ? r.meta.title : String(r.route || '')
    }))
    .filter((opt) => opt.value)
}

/**
 * 按组件别名路径查找路由项（顶级或子级）
 */
export async function findEntryByComponent(componentAlias: string): Promise<
  | { type: 'route'; routeIndex: number; entry: RouteConfig }
  | { type: 'child'; routeIndex: number; childIndex: number; parentRoute: string; entry: RouteChild }
  | null
> {
  const aliasNorm = normalizeViewComponentPath(componentAlias)
  const { routes } = await readConfig()
  for (let i = 0; i < routes.length; i++) {
    const r = routes[i]
    if (typeof r?.component === 'string' && normalizeViewComponentPath(r.component) === aliasNorm) {
      return { type: 'route', routeIndex: i, entry: r }
    }
    if (Array.isArray(r.children)) {
      for (let j = 0; j < r.children.length; j++) {
        const c = r.children[j]
        if (typeof c?.component === 'string' && normalizeViewComponentPath(c.component) === aliasNorm) {
          return { type: 'child', routeIndex: i, childIndex: j, parentRoute: r.route, entry: c }
        }
      }
    }
  }
  return null
}

/**
 * 新增或更新路由项（支持顶级/子级，含跨层级移动）
 */
export async function upsertRouteEntry(payload: {
  type: 'route' | 'child'
  parentRoute?: string
  route: string
  component: string
  meta: { title: string; icon?: string; order: number }
}): Promise<void> {
  const { routes } = await readConfig()
  const alias = normalizeViewComponentPath(payload.component)

  let existingTopIndex = -1
  let existingParentIndex = -1
  let existingChildIndex = -1

  for (let i = 0; i < routes.length; i++) {
    const r = routes[i]
    if (typeof r?.component === 'string' && normalizeViewComponentPath(r.component) === alias) {
      existingTopIndex = i
      break
    }
    if (Array.isArray(r?.children)) {
      for (let j = 0; j < r.children.length; j++) {
        const c = r.children[j]
        if (typeof c?.component === 'string' && normalizeViewComponentPath(c.component) === alias) {
          existingParentIndex = i
          existingChildIndex = j
          break
        }
      }
      if (existingChildIndex !== -1) break
    }
  }

  const targetParentIndex = routes.findIndex((r) => String(r.route || '') === String(payload.parentRoute || ''))

  let handled = false
  if (existingTopIndex !== -1) {
    const r = routes[existingTopIndex]
    if (payload.type === 'route') {
      r.route = payload.route
      r.component = payload.component
      r.meta = { ...(r.meta || {}), title: payload.meta.title, icon: payload.meta.icon, order: payload.meta.order }
      handled = true
    } else if (payload.type === 'child' && targetParentIndex !== -1) {
      const movedChild: RouteChild = {
        route: payload.route,
        component: payload.component,
        meta: { ...(r.meta || {}), title: payload.meta.title, order: payload.meta.order }
      }
      routes.splice(existingTopIndex, 1)
      const parent = routes[targetParentIndex]
      parent.children = Array.isArray(parent.children) ? parent.children : []
      parent.children.push(movedChild)
      handled = true
    }
  } else if (existingChildIndex !== -1 && existingParentIndex !== -1) {
    const parent = routes[existingParentIndex]
    const c = parent.children![existingChildIndex]
    if (payload.type === 'child') {
      c.route = payload.route
      c.component = payload.component
      c.meta = { ...(c.meta || {}), title: payload.meta.title, order: payload.meta.order }
      if (targetParentIndex !== -1 && targetParentIndex !== existingParentIndex) {
        parent.children!.splice(existingChildIndex, 1)
        const targetParent = routes[targetParentIndex]
        targetParent.children = Array.isArray(targetParent.children) ? targetParent.children : []
        targetParent.children.push(c)
      }
      handled = true
    } else if (payload.type === 'route') {
      const newTop: RouteConfig = {
        route: payload.route,
        component: payload.component,
        meta: { title: payload.meta.title, icon: payload.meta.icon, order: payload.meta.order }
      }
      parent.children!.splice(existingChildIndex, 1)
      routes.push(newTop)
      handled = true
    }
  }

  if (!handled) {
    if (payload.type === 'child' && targetParentIndex !== -1) {
      const parent = routes[targetParentIndex]
      parent.children = Array.isArray(parent.children) ? parent.children : []
      parent.children.push({ route: payload.route, component: payload.component, meta: { title: payload.meta.title, order: payload.meta.order } })
    } else {
      routes.push({ route: payload.route, component: payload.component, meta: { title: payload.meta.title, icon: payload.meta.icon, order: payload.meta.order } })
    }
  }

  sortRoutesInPlace(routes)
  await writeConfig({ routes })
}

/**
 * 删除顶级路由
 */
export async function deleteTopRoute(routeId: string): Promise<void> {
  const { routes } = await readConfig()
  const idx = routes.findIndex((r) => r.route === routeId)
  if (idx >= 0) {
    routes.splice(idx, 1)
    await writeConfig({ routes })
  }
}

/**
 * 删除子路由
 */
export async function deleteChildRoute(parentRoute: string, childRouteId: string): Promise<void> {
  const { routes } = await readConfig()
  const pIdx = routes.findIndex((r) => r.route === parentRoute)
  if (pIdx >= 0 && Array.isArray(routes[pIdx].children)) {
    const children = routes[pIdx].children!
    const cIdx = children.findIndex((c) => c.route === childRouteId)
    if (cIdx >= 0) {
      children.splice(cIdx, 1)
      routes[pIdx].children = children
      await writeConfig({ routes })
    }
  }
}

/**
 * 清洗子路由的 icon 字段
 */
function sanitizeRoutes(list: RouteConfig[]): RouteConfig[] {
  return (list || []).map((r) => {
    const hasChildren = Array.isArray(r.children) && r.children.length > 0
    const result: RouteConfig = {
      route: r.route,
      // 有子路由时父路由不需要 component（分组路由）
      ...((!hasChildren && r.component) ? { component: r.component } : {}),
      meta: { title: r.meta?.title || '', icon: r.meta?.icon, order: r.meta?.order ?? 0 },
      children: hasChildren
        ? r.children!.map((c) => ({ route: c.route, component: c.component, meta: { title: c.meta?.title || '', order: c.meta?.order ?? 0 } }))
        : undefined
    }
    return result
  })
}