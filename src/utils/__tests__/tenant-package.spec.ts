/**
 * 租户套餐提交载荷测试
 * ------------------------------------------------------------------
 * 重点保障「全量能力」必须展开为能力目录编码（空集合 = 未订阅），
 * 以及菜单父链补全、菜单/权限空集合 = 该维度全量的既有语义。
 */
import { describe, expect, it } from 'vitest'
import { buildPackagePayload, withParentChain } from '../tenant-package'
import type { MenuNode } from '@/types'

/** 构造三层菜单树：1 → 2 → 3，另含独立节点 4 */
const menuTree: MenuNode[] = [
  {
    id: 1,
    menuName: '平台',
    children: [
      {
        id: 2,
        menuName: '系统',
        children: [{ id: 3, menuName: '套餐' } as MenuNode],
      } as MenuNode,
    ],
  } as MenuNode,
  { id: 4, menuName: '监控' } as MenuNode,
]

/** 基础输入（全部全量） */
function baseInput() {
  return {
    packageCode: ' pro ',
    packageName: ' 专业版 ',
    status: 1,
    remark: '',
    allMenus: true,
    checkedMenuIds: [],
    menuTree,
    allPermissions: true,
    permissionCodes: [],
    allFeatures: true,
    features: [],
    capabilityCodes: ['workflow.definition', 'iot.device'],
  }
}

describe('withParentChain', () => {
  it('补全所选菜单的全部父级', () => {
    expect(withParentChain([3, 4], menuTree).sort()).toEqual([1, 2, 3, 4])
  })
})

describe('buildPackagePayload', () => {
  it('全量开关提交空菜单/空权限，能力展开为目录全部编码', () => {
    const payload = buildPackagePayload(baseInput())
    expect(payload.packageCode).toBe('pro')
    expect(payload.packageName).toBe('专业版')
    expect(payload.menuIds ?? []).toEqual([])
    expect(payload.permissionCodes ?? []).toEqual([])
    expect(payload.features).toEqual(['workflow.definition', 'iot.device'])
  })

  it('非全量时提交勾选项并补菜单父链，未订阅能力保持空集合', () => {
    const payload = buildPackagePayload({
      ...baseInput(),
      allMenus: false,
      checkedMenuIds: [3],
      allPermissions: false,
      permissionCodes: ['tenant:read'],
      allFeatures: false,
      features: [],
    })
    expect([...(payload.menuIds ?? [])].sort()).toEqual([1, 2, 3])
    expect(payload.permissionCodes).toEqual(['tenant:read'])
    expect(payload.features).toEqual([])
  })

  it('仅订阅部分能力时按所选编码提交', () => {
    const payload = buildPackagePayload({
      ...baseInput(),
      allFeatures: false,
      features: ['iot.device'],
    })
    expect(payload.features).toEqual(['iot.device'])
  })

  it('能力目录为空时全量展开得到空集合（该租户无任何订阅）', () => {
    const payload = buildPackagePayload({ ...baseInput(), capabilityCodes: [] })
    expect(payload.features).toEqual([])
  })
})
