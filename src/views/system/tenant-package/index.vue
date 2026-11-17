<!--
  租户套餐管理（方案批次 B3）
  ------------------------------------------------------------------
  契约（apex-system TenantPackageRouter，前缀 /api/v2/tenant-packages）：
  - GET  /                - 套餐列表（裸数组）
  - POST /                - 创建套餐
  - PUT  /                - 更新套餐（后端从请求体 packageCode 定位）
  权限要求（按钮 v-permission）：tenant:package:create / update。

  语义要点：
  - menuIds / permissionCodes 的「空集合」= 全量放行，不是无权限；
    features 的「空集合」= 未订阅任何能力（并非全量），全量须显式提交能力目录全部编码。
    页面用「全量」开关显式表达，避免把留空误解为关闭全部能力。
  - 菜单多选提交前补全父链，否则租户侧菜单树会缺父节点。
  - features 取值来自能力目录（GET /api/v2/capabilities）。
-->
<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>租户套餐</span>
        <el-button type="primary" :icon="Plus" @click="openDialog()" v-permission="'tenant:package:create'">
          新建套餐
        </el-button>
      </div>
    </template>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="packageCode" label="套餐编码" width="160">
        <template #default="{ row }"><el-tag>{{ row.packageCode }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="packageName" label="套餐名称" min-width="150" show-overflow-tooltip />
      <el-table-column label="菜单" width="110">
        <template #default="{ row }">{{ scopeText(row.menuIds) }}</template>
      </el-table-column>
      <el-table-column label="权限码" width="110">
        <template #default="{ row }">{{ scopeText(row.permissionCodes) }}</template>
      </el-table-column>
      <el-table-column label="能力订阅" width="120">
        <template #default="{ row }">{{ featureText(row.features) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 0 ? 'info' : 'success'" size="small">
            {{ row.status === 0 ? '停用' : '正常' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column prop="updateTime" label="更新时间" width="170" />
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)" v-permission="'tenant:package:update'">
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && list.length === 0" description="暂无套餐" />

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑套餐' : '新建套餐'" width="760px" top="6vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="套餐编码" prop="packageCode">
          <el-input v-model="form.packageCode" :disabled="isEdit" placeholder="如 standard（创建后不可变更）" />
        </el-form-item>
        <el-form-item label="套餐名称" prop="packageName">
          <el-input v-model="form.packageName" placeholder="套餐显示名称" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider content-position="left">可用菜单</el-divider>
        <el-form-item label="全量菜单">
          <el-switch v-model="allMenus" />
          <span class="form-hint">开启表示不按菜单裁剪（menuIds 留空）</span>
        </el-form-item>
        <el-form-item v-if="!allMenus" label="菜单范围">
          <el-tree
            ref="menuTreeRef"
            :data="menuTree"
            node-key="id"
            show-checkbox
            check-strictly
            default-expand-all
            :props="{ label: 'menuName', children: 'children' }"
            class="menu-tree"
          />
          <div class="form-hint">保存时会自动补全所选菜单的父级链路，避免租户侧菜单树缺父节点。</div>
        </el-form-item>

        <el-divider content-position="left">权限码</el-divider>
        <el-form-item label="全量权限">
          <el-switch v-model="allPermissions" />
          <span class="form-hint">开启表示不按权限码裁剪（permissionCodes 留空）</span>
        </el-form-item>
        <el-form-item v-if="!allPermissions" label="权限码范围">
          <el-select
            v-model="form.permissionCodes"
            multiple
            filterable
            allow-create
            default-first-option
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择或输入权限码"
            style="width: 100%"
          >
            <el-option v-for="code in permissionOptions" :key="code" :label="code" :value="code" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">能力订阅（features）</el-divider>
        <el-form-item label="全量能力">
          <el-switch v-model="allFeatures" />
          <span class="form-hint">开启表示订阅能力目录全部编码（当前 {{ capabilities.length }} 项），新增能力后需重新保存</span>
        </el-form-item>
        <el-form-item v-if="!allFeatures" label="能力范围">
          <el-select
            v-model="form.features"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择能力编码"
            style="width: 100%"
          >
            <el-option
              v-for="capability in capabilities"
              :key="capability.code"
              :label="`${capability.name}（${capability.code}）`"
              :value="capability.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 租户套餐管理脚本
 * - 列表/新建/编辑（后端无删除端点，停用通过 status=0）
 * - 菜单与权限码用「全量」开关表达空集合语义（空集合 = 该维度全量）
 * - 能力订阅空集合 = 未订阅任何能力，「全量」须显式提交能力目录全部编码
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import type { FormInstance, FormRules, TreeInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { showError } from '@/utils/request'
import { buildPackagePayload } from '@/utils/tenant-package'
import {
  createTenantPackage,
  listTenantPackages,
  updateTenantPackage,
} from '@/api/tenant-package'
import { listCapabilities } from '@/api/capability'
import { listMenuTree } from '@/api/system'
import { listSystemPermissions } from '@/api/auth'
import type { CapabilityInfo, MenuNode, TenantPackage, TenantPackagePayload } from '@/types'

/** 列表加载中 */
const loading = ref(false)
/** 保存中 */
const saving = ref(false)
/** 套餐列表 */
const list = ref<TenantPackage[]>([])
/** 菜单树 */
const menuTree = ref<MenuNode[]>([])
/** 权限码候选 */
const permissionOptions = ref<string[]>([])
/** 能力目录 */
const capabilities = ref<CapabilityInfo[]>([])

/** 弹窗状态 */
const dialogVisible = ref(false)
/** 是否编辑 */
const isEdit = ref(false)
/** 表单实例 */
const formRef = ref<FormInstance>()
/** 菜单树实例 */
const menuTreeRef = ref<TreeInstance>()

/** 全量开关（对应后端空集合语义） */
const allMenus = ref(true)
const allPermissions = ref(true)
const allFeatures = ref(true)

/** 表单数据 */
const form = reactive<TenantPackagePayload>({
  packageCode: '',
  packageName: '',
  menuIds: [],
  permissionCodes: [],
  features: [],
  status: 1,
  remark: '',
})

/** 校验规则 */
const rules: FormRules = {
  packageCode: [
    { required: true, message: '请输入套餐编码', trigger: 'blur' },
    { max: 64, message: '最长 64 位', trigger: 'blur' },
  ],
  packageName: [
    { required: true, message: '请输入套餐名称', trigger: 'blur' },
    { max: 128, message: '最长 128 位', trigger: 'blur' },
  ],
}

/** 菜单与权限码展示文案（空集合 = 该维度全量） */
function scopeText(values?: Array<string | number>): string {
  if (!values || values.length === 0) return '全量'
  return `${values.length} 项`
}

/** 能力订阅展示文案（空集合 = 未订阅，等于目录长度 = 全量） */
function featureText(values?: string[]): string {
  const count = values?.length ?? 0
  if (count === 0) return '未订阅'
  if (capabilities.value.length > 0 && count >= capabilities.value.length) return `全部（${count} 项）`
  return `${count} 项`
}

/** 加载套餐列表 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    list.value = (await listTenantPackages()) || []
  } catch (error) {
    showError(error, '加载套餐列表失败')
  } finally {
    loading.value = false
  }
}

/** 加载菜单树、权限码与能力目录（仅首次） */
async function loadOptions(): Promise<void> {
  const [menus, permissions, caps] = await Promise.all([
    listMenuTree().catch(() => [] as MenuNode[]),
    listSystemPermissions().catch(() => []),
    listCapabilities().catch(() => [] as CapabilityInfo[]),
  ])
  menuTree.value = menus || []
  permissionOptions.value = (permissions || []).map((item) => item.code).filter(Boolean)
  capabilities.value = caps || []
}

/** 打开弹窗（无参为新建） */
function openDialog(row?: TenantPackage): void {
  isEdit.value = !!row
  Object.assign(form, {
    packageCode: row?.packageCode ?? '',
    packageName: row?.packageName ?? '',
    menuIds: row?.menuIds ?? [],
    permissionCodes: row?.permissionCodes ?? [],
    features: row?.features ?? [],
    status: row?.status ?? 1,
    remark: row?.remark ?? '',
  })
  allMenus.value = !row?.menuIds?.length
  allPermissions.value = !row?.permissionCodes?.length
  // 能力全量 = 已覆盖能力目录全部编码；空集合表示未订阅，不能回填为全量。新建默认全量。
  allFeatures.value = row
    ? capabilities.value.length > 0 && (row.features?.length ?? 0) >= capabilities.value.length
    : true
  dialogVisible.value = true
  // 等树渲染完成后回填选中项
  requestAnimationFrame(() => menuTreeRef.value?.setCheckedKeys(row?.menuIds ?? []))
}

/** 提交 */
async function submit(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const checked = (menuTreeRef.value?.getCheckedKeys(false) as number[]) || []
  if (allFeatures.value && capabilities.value.length === 0) {
    ElMessage.warning('能力目录为空，无法提交全量能力')
    return
  }
  const payload: TenantPackagePayload = buildPackagePayload({
    packageCode: form.packageCode,
    packageName: form.packageName,
    status: form.status,
    remark: form.remark,
    allMenus: allMenus.value,
    checkedMenuIds: checked,
    menuTree: menuTree.value,
    allPermissions: allPermissions.value,
    permissionCodes: form.permissionCodes ?? [],
    allFeatures: allFeatures.value,
    features: form.features ?? [],
    capabilityCodes: capabilities.value.map((capability) => capability.code),
  })
  saving.value = true
  try {
    if (isEdit.value) {
      await updateTenantPackage(payload)
      ElMessage.success('套餐已更新')
    } else {
      await createTenantPackage(payload)
      ElMessage.success('套餐已创建')
    }
    dialogVisible.value = false
    fetchList()
  } catch (error) {
    showError(error, '保存套餐失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchList(), loadOptions()])
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-tree {
  width: 100%;
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  padding: 6px;
}

.form-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-left: 8px;
}
</style>
