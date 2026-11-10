/**
 * 租户套餐提交载荷
 * ------------------------------------------------------------------
 * 后端语义（TenantPackageService）：
 * - menuIds / permissionCodes 空集合 = 该维度全量放行；
 * - features 空集合 = 未订阅任何能力，全量必须显式列出能力目录全部编码。
 * 因此「全量能力」开关不能提交空集合，必须在此展开为目录编码。
 */
import type { MenuNode, TenantPackagePayload } from '@/types'

/**
 * 递归收集菜单父链（与后端 withParentChain 同语义）。
 * @param ids 选中菜单 ID
 * @param tree 菜单树
 */
export function withParentChain(ids: number[], tree: MenuNode[]): number[] {
  const parentOf = new Map<number, number>()
  const walk = (nodes: MenuNode[]): void => {
    for (const node of nodes) {
      if (node.children?.length) {
        for (const child of node.children) parentOf.set(child.id, node.id)
        walk(node.children)
      }
    }
  }
  walk(tree)
  const result = new Set(ids)
  for (const id of ids) {
    let parent = parentOf.get(id)
    let guard = 0
    // 防脏数据成环：父链异常成环时最多回溯 32 层即跳出
    while (parent !== undefined && parent > 0 && !result.has(parent) && guard++ < 32) {
      result.add(parent)
      parent = parentOf.get(parent)
    }
  }
  return Array.from(result)
}

/** 套餐表单与选项快照 */
export interface PackagePayloadInput {
  packageCode: string
  packageName: string
  status?: number
  remark?: string
  /** 菜单全量开关 */
  allMenus: boolean
  /** 菜单树勾选 ID */
  checkedMenuIds: number[]
  /** 完整菜单树（用于补父链） */
  menuTree: MenuNode[]
  /** 权限码全量开关 */
  allPermissions: boolean
  /** 已选权限码 */
  permissionCodes: string[]
  /** 能力全量开关 */
  allFeatures: boolean
  /** 已选能力编码 */
  features: string[]
  /** 能力目录全部编码（全量时展开） */
  capabilityCodes: string[]
}

/**
 * 生成套餐提交载荷：把三个「全量」开关翻译为各维度的后端语义。
 * @param input 表单与选项快照
 */
export function buildPackagePayload(input: PackagePayloadInput): TenantPackagePayload {
  return {
    packageCode: input.packageCode.trim(),
    packageName: input.packageName.trim(),
    menuIds: input.allMenus ? [] : withParentChain(input.checkedMenuIds, input.menuTree),
    permissionCodes: input.allPermissions ? [] : [...input.permissionCodes],
    features: input.allFeatures ? [...input.capabilityCodes] : [...input.features],
    status: input.status,
    remark: input.remark,
  }
}
