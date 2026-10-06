<!--
  认证配置页面
  ------------------------------------------------------------------
  功能：OAuth2 客户端管理、认证配置、密钥管理
  
  权限：
    - system:auth:view - 查看认证配置
    - system:auth:edit - 编辑认证配置
-->
<template>
  <div class="auth-config-container">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="JWT配置" name="jwt">
        <el-card>
          <template #header>
            <span>JWT Token 配置</span>
          </template>
          <el-form :model="jwtConfig" :rules="jwtRules" ref="jwtFormRef" label-width="180px" v-loading="jwtLoading">
            <el-alert title="保存 JWT 配置需要填写新密钥，会影响现有令牌。当前密钥不会回显。" type="warning" :closable="false" />
            <el-form-item label="密钥" prop="secret">
              <el-input v-model="jwtConfig.secret" type="password" show-password placeholder="保存时必须填写新密钥" />
            </el-form-item>
            <el-form-item label="访问令牌过期时间(秒)" prop="accessTokenExpiration">
              <el-input-number v-model="jwtConfig.accessTokenExpiration" :min="60" :max="86400" />
              <span class="form-tip">{{ formatDuration(jwtConfig.accessTokenExpiration) }}</span>
            </el-form-item>
            <el-form-item label="刷新令牌过期时间(秒)" prop="refreshTokenExpiration">
              <el-input-number v-model="jwtConfig.refreshTokenExpiration" :min="3600" :max="2592000" />
              <span class="form-tip">{{ formatDuration(jwtConfig.refreshTokenExpiration) }}</span>
            </el-form-item>
            <el-form-item label="发行者" prop="issuer">
              <el-input v-model="jwtConfig.issuer" placeholder="请输入发行者" />
            </el-form-item>
            <el-form-item label="受众" prop="audience">
              <el-input v-model="jwtConfig.audience" placeholder="请输入受众" />
            </el-form-item>
            <el-form-item label="刷新窗口(秒)" prop="refreshWindowSeconds">
              <el-input-number v-model="jwtConfig.refreshWindowSeconds" :min="0" />
            </el-form-item>
            <el-form-item label="刷新令牌轮换">
              <el-switch v-model="jwtConfig.enableRefreshTokenRotation" />
            </el-form-item>
            <el-form-item label="校验发行者">
              <el-switch v-model="jwtConfig.validateIssuer" />
            </el-form-item>
            <el-form-item label="校验受众">
              <el-switch v-model="jwtConfig.validateAudience" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveJwtConfig" v-permission="'system:auth:config:jwt:edit'">
                保存配置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="OAuth2配置" name="oauth2">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>OAuth2 客户端配置</span>
              <el-button type="primary" @click="handleAddOAuth2Client" v-permission="'system:auth:oauth2:create'">
                <el-icon><Plus /></el-icon>
                新增客户端
              </el-button>
            </div>
          </template>
          <el-table :data="oauth2Clients" border stripe v-loading="oauth2Loading">
            <el-table-column prop="clientName" label="客户端名称" width="120" />
            <el-table-column prop="clientId" label="客户端ID" min-width="200" />
            <el-table-column prop="redirectUris" label="回调地址" min-width="200" />
            <el-table-column prop="scopes" label="授权范围" min-width="150" />
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleEditOAuth2Client(row)" v-permission="'system:auth:oauth2:edit'">
                  编辑
                </el-button>
                <el-button link type="danger" @click="handleDeleteOAuth2Client(row)" v-permission="'system:auth:oauth2:delete'">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="权限码管理" name="permissions">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>权限码管理</span>
              <div>
                <el-button type="success" @click="handleSyncPermissions" v-permission="'system:auth:config:permission:sync'">
                  <el-icon><Refresh /></el-icon>
                  同步权限
                </el-button>
                <el-button type="primary" @click="handleAddPermission" v-permission="'system:auth:permission:create'">
                  <el-icon><Plus /></el-icon>
                  新增权限
                </el-button>
              </div>
            </div>
          </template>
          <div class="filter-toolbar">
            <el-form :inline="true">
              <el-form-item label="类型">
                <el-select v-model="permissionQuery.type" placeholder="请选择类型" clearable>
                  <el-option label="菜单" :value="1" />
                  <el-option label="按钮" :value="2" />
                  <el-option label="API" :value="3" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadPermissions">查询</el-button>
                <el-button @click="resetPermissionQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </div>
          <el-table :data="permissions" border stripe v-loading="permissionLoading">
            <el-table-column prop="code" label="权限码" min-width="200" />
            <el-table-column prop="name" label="权限名称" width="150" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.type === 1" type="primary">菜单</el-tag>
                <el-tag v-else-if="row.type === 2">按钮</el-tag>
                <el-tag v-else-if="row.type === 3" type="success">API</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleEditPermission(row)" v-permission="'system:auth:permission:edit'">
                  编辑
                </el-button>
                <el-button link type="danger" @click="handleDeletePermission(row)" v-permission="'system:auth:permission:delete'">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="permissionQuery.page"
            v-model:page-size="permissionQuery.size"
            :total="permissionTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadPermissions"
            @current-change="loadPermissions"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="在线用户" name="online">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>在线用户列表</span>
              <el-button type="danger" @click="handleBatchLogout" :disabled="selectedSessions.length === 0" v-permission="'staff:session:revoke'">
                <el-icon><SwitchButton /></el-icon>
                批量强制下线
              </el-button>
            </div>
          </template>
          <el-table :data="onlineUsers" border stripe v-loading="onlineLoading" @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="nickName" label="昵称" width="120" />
            <el-table-column prop="lastLoginIp" label="IP地址" width="140" />
            <el-table-column prop="lastHeartbeatTime" label="最后访问" width="180" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="danger" @click="handleForceLogout(row)" v-permission="'staff:session:revoke'">
                  强制下线
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="onlineQuery.page"
            v-model:page-size="onlineQuery.size"
            :total="onlineTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadOnlineUsers"
            @current-change="loadOnlineUsers"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="会话配置" name="session">
        <el-card>
          <template #header>
            <span>会话管理配置</span>
          </template>
          <el-form :model="sessionConfig" :rules="sessionRules" ref="sessionFormRef" label-width="180px" v-loading="sessionLoading">
            <el-form-item label="最大并发会话数" prop="maxConcurrentSessions">
              <el-input-number v-model="sessionConfig.maxConcurrentSessions" :min="1" :max="10" />
              <span class="form-tip">单个用户允许同时在线的最大会话数</span>
            </el-form-item>
            <el-form-item label="会话超时时间(秒)" prop="sessionTimeout">
              <el-input-number v-model="sessionConfig.sessionTimeout" :min="300" :max="86400" />
              <span class="form-tip">{{ formatDuration(sessionConfig.sessionTimeout) }}</span>
            </el-form-item>
            <el-form-item label="达到会话上限时拒绝新登录">
              <el-switch v-model="sessionConfig.preventLogin" />
              <span class="form-tip">关闭时踢出旧会话</span>
            </el-form-item>
            <el-form-item label="会话固定攻击防护">
              <el-switch v-model="sessionConfig.enableSessionFixationProtection" />
            </el-form-item>
            <el-form-item label="启用记住我">
              <el-switch v-model="sessionConfig.enableRememberMe" />
            </el-form-item>
            <el-form-item label="记住我时长(秒)" prop="rememberMeDuration">
              <el-input-number v-model="sessionConfig.rememberMeDuration" :min="86400" />
            </el-form-item>
            <el-form-item label="会话活动跟踪">
              <el-switch v-model="sessionConfig.enableActivityTracking" />
            </el-form-item>
            <el-form-item label="清理间隔(秒)" prop="cleanupInterval">
              <el-input-number v-model="sessionConfig.cleanupInterval" :min="60" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveSessionConfig" v-permission="'system:auth:config:session:edit'">
                保存配置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="安全策略" name="security">
        <el-card>
          <template #header>
            <span>安全策略配置</span>
          </template>
          <el-form :model="securityPolicy" :rules="securityRules" ref="securityFormRef" label-width="200px" v-loading="securityLoading">
            <el-divider content-position="left">登录安全</el-divider>
            <el-form-item label="最大登录尝试次数" prop="loginFailureLockThreshold">
              <el-input-number v-model="securityPolicy.loginFailureLockThreshold" :min="3" :max="10" />
            </el-form-item>
            <el-form-item label="锁定时长(秒)" prop="accountLockDuration">
              <el-input-number v-model="securityPolicy.accountLockDuration" :min="60" />
            </el-form-item>

            <el-divider content-position="left">密码策略</el-divider>
            <el-form-item label="密码最小长度" prop="passwordMinLength">
              <el-input-number v-model="securityPolicy.passwordMinLength" :min="6" :max="32" />
            </el-form-item>
            <el-form-item label="要求大写字母" prop="passwordRequireUppercase">
              <el-switch v-model="securityPolicy.passwordRequireUppercase" />
            </el-form-item>
            <el-form-item label="要求小写字母" prop="passwordRequireLowercase">
              <el-switch v-model="securityPolicy.passwordRequireLowercase" />
            </el-form-item>
            <el-form-item label="要求数字" prop="passwordRequireDigit">
              <el-switch v-model="securityPolicy.passwordRequireDigit" />
            </el-form-item>
            <el-form-item label="要求特殊字符" prop="passwordRequireSpecialChar">
              <el-switch v-model="securityPolicy.passwordRequireSpecialChar" />
            </el-form-item>
            <el-form-item label="密码过期天数" prop="passwordExpirationDays">
              <el-input-number v-model="securityPolicy.passwordExpirationDays" :min="0" :max="365" />
              <span class="form-tip">设为0表示永不过期</span>
            </el-form-item>

            <el-form-item label="密码历史数量" prop="passwordHistoryLimit">
              <el-input-number v-model="securityPolicy.passwordHistoryLimit" :min="0" />
            </el-form-item>
            <el-form-item label="启用验证码">
              <el-switch v-model="securityPolicy.enableCaptcha" />
            </el-form-item>
            <el-form-item label="验证码触发次数" prop="captchaThreshold">
              <el-input-number v-model="securityPolicy.captchaThreshold" :min="0" />
            </el-form-item>
            <el-divider content-position="left">访问控制</el-divider>
            <el-form-item label="启用IP白名单" prop="enableIpWhitelist">
              <el-switch v-model="securityPolicy.enableIpWhitelist" />
            </el-form-item>
            <el-form-item label="IP白名单" prop="ipWhitelist" v-if="securityPolicy.enableIpWhitelist">
              <el-input v-model="securityPolicy.ipWhitelist" placeholder="请输入IP地址或CIDR，使用英文逗号分隔" />
              <span class="form-tip">多个IP地址或CIDR段以英文逗号分隔</span>
            </el-form-item>

            <el-divider content-position="left">多因素认证</el-divider>
            <el-form-item label="启用双因素认证" prop="enableTwoFactorAuth">
              <el-switch v-model="securityPolicy.enableTwoFactorAuth" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveSecurityPolicy" v-permission="'system:auth:config:security:edit'">
                保存配置
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="登录日志" name="login-attempts">
        <el-card>
          <template #header>
            <span>登录尝试记录</span>
          </template>
          <div class="filter-toolbar">
            <el-form :inline="true">
              <el-form-item label="用户名">
                <el-input v-model="attemptQuery.username" placeholder="请输入用户名" clearable />
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="attemptQuery.status" placeholder="请选择" clearable>
                  <el-option label="成功" :value="0" />
                  <el-option label="失败" :value="1" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadLoginAttempts">查询</el-button>
                <el-button @click="resetAttemptQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </div>
          <el-table :data="loginAttempts" border stripe v-loading="attemptLoading">
            <el-table-column prop="username" label="用户名" width="150" />
            <el-table-column prop="ip" label="IP地址" width="150" />
            <el-table-column prop="loginTime" label="尝试时间" width="180" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'">
                  {{ row.status === 0 ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="失败原因" min-width="200" show-overflow-tooltip />
          </el-table>
          <el-pagination
            v-model:current-page="attemptQuery.page"
            v-model:page-size="attemptQuery.size"
            :total="attemptTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadLoginAttempts"
            @current-change="loadLoginAttempts"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="oauth2DialogVisible" :title="oauth2Form.id ? '编辑OAuth2客户端' : '新增OAuth2客户端'" width="700px">
      <el-form :model="oauth2Form" :rules="oauth2Rules" ref="oauth2FormRef" label-width="120px">
        <el-alert v-if="oauth2Form.id" title="当前接口不返回原有安全设置和有效期。保存将替换这些设置，请明确填写；如需保留原值，请先向管理员确认。" type="warning" :closable="false" />
        <el-form-item label="启用PKCE" prop="requireProofKey">
          <el-select v-model="oauth2Form.requireProofKey" :disabled="oauth2Form.clientAuthenticationMethods?.includes('none')">
            <el-option label="启用" :value="true" />
            <el-option label="关闭" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="授权确认" prop="requireAuthorizationConsent">
          <el-select v-model="oauth2Form.requireAuthorizationConsent" placeholder="请选择">
            <el-option label="需要" :value="true" />
            <el-option label="不需要" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="访问令牌(秒)" prop="accessTokenTimeToLive">
          <el-input-number v-model="oauth2Form.accessTokenTimeToLive" :min="1" />
        </el-form-item>
        <el-form-item label="刷新令牌(秒)" prop="refreshTokenTimeToLive">
          <el-input-number v-model="oauth2Form.refreshTokenTimeToLive" :min="1" />
        </el-form-item>
        <el-form-item label="授权码(秒)" prop="authorizationCodeTimeToLive">
          <el-input-number v-model="oauth2Form.authorizationCodeTimeToLive" :min="1" />
        </el-form-item>
        <el-form-item label="客户端名称" prop="clientName">
          <el-input v-model="oauth2Form.clientName" placeholder="请输入客户端名称" />
        </el-form-item>
        <el-form-item label="客户端ID" prop="clientId">
          <el-input v-model="oauth2Form.clientId" :disabled="!!oauth2Form.id" placeholder="请输入客户端ID" />
        </el-form-item>
        <el-form-item label="回调地址" prop="redirectUris">
          <el-select v-model="oauth2Form.redirectUris" multiple filterable allow-create default-first-option />
        </el-form-item>
        <el-form-item label="授权范围" prop="scopes">
          <el-select v-model="oauth2Form.scopes" multiple filterable allow-create default-first-option />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="oauth2DialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOAuth2Client">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="permissionDialogVisible" :title="permissionForm.id ? '编辑权限' : '新增权限'" width="600px">
      <el-form :model="permissionForm" :rules="permissionRules" ref="permissionFormRef" label-width="100px">
        <el-form-item label="权限码" prop="code">
          <el-input v-model="permissionForm.code" placeholder="如: system:user:create" />
        </el-form-item>
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="permissionForm.name" placeholder="请输入权限名称" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="permissionForm.type" placeholder="请选择类型">
            <el-option label="菜单" :value="1" />
            <el-option label="按钮" :value="2" />
            <el-option label="API" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="permissionForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="permissionForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPermission">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="permissionRolesDialogVisible" title="关联角色" width="600px">
      <el-table :data="permissionRoles" border stripe>
        <el-table-column prop="roleId" label="角色ID" width="100" />
        <el-table-column prop="roleName" label="角色名称" />
      </el-table>
    </el-dialog>
  </div>
</template>

/**
 * 认证授权配置管理页面
 * ------------------------------------------------------------------
 * 功能说明:
 * 1. JWT配置 - 配置JWT密钥、过期时间、签名算法等
 * 2. OAuth2配置 - 管理第三方OAuth2客户端(GitHub、Google等)
 * 3. 权限码管理 - 统一管理系统权限码,支持同步和角色关联
 * 4. 在线用户 - 查看在线用户列表,支持强制下线和批量下线
 * 5. 会话配置 - 配置并发会话数、超时时间、踢出策略等
 * 6. 安全策略 - 配置登录尝试次数、密码策略、IP白名单、双因素认证
 * 7. 登录日志 - 查看登录尝试记录,支持解锁被锁定的用户
 * 
 * 权限要求:
 * - system:auth:view - 查看权限(必需)
 * - system:auth:config:jwt:edit - 更新JWT配置
 * - system:auth:oauth2:* - OAuth2客户端管理
 * - system:auth:permission:* - 权限码管理
 * - system:auth:session:* - 会话管理
 * - system:auth:config:security:edit - 更新安全策略
 * 
 * @author system
 * @date 2024
 */
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, SwitchButton } from '@element-plus/icons-vue'
import {
  getJwtConfig,
  updateJwtConfig,
  listOAuth2Clients,
  createOAuth2Client,
  updateOAuth2Client,
  deleteOAuth2Client,
  listPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  syncPermissions,
  listOnlineUsers,
  forceLogout,
  batchForceLogout,
  getSessionConfig,
  updateSessionConfig,
  listLoginAttempts,
  getSecurityPolicy,
  updateSecurityPolicy,
  type JwtConfig,
  type OAuth2ClientConfig,
  type Permission,
  type PermissionRole,
  type OnlineUser,
  type SessionConfig,
  type LoginAttempt,
  type SecurityPolicy,
} from '@/api/auth-config'
import type { PageQuery } from '@/types'

// 当前激活的标签页
const activeTab = ref('jwt')

// ==================== JWT配置 ====================
// JWT配置加载状态
const jwtLoading = ref(false)
const jwtFormRef = ref<FormInstance>()
// JWT配置数据
const jwtConfig = reactive<Partial<JwtConfig>>({
  secret: '',
  accessTokenExpiration: 3600,
  refreshTokenExpiration: 604800,
  issuer: '',
  audience: '',
  refreshWindowSeconds: 300,
  enableRefreshTokenRotation: true,
  validateIssuer: false,
  validateAudience: false,
})

// JWT配置表单验证规则
const jwtRules: FormRules = {
  secret: [{ required: true, pattern: /^(?!\*+$).*\S.*$/, message: '请输入新的JWT密钥，不能使用脱敏值', trigger: 'blur' }],
  accessTokenExpiration: [{ required: true, message: '请输入访问令牌过期时间', trigger: 'blur' }],
  refreshTokenExpiration: [{ required: true, message: '请输入刷新令牌过期时间', trigger: 'blur' }],
  refreshWindowSeconds: [{ required: true, message: '请输入刷新窗口', trigger: 'blur' }],
}

// ==================== OAuth2配置 ====================
// OAuth2客户端列表加载状态
const oauth2Loading = ref(false)
const oauth2Clients = ref<OAuth2ClientConfig[]>([])
const oauth2DialogVisible = ref(false)
const oauth2FormRef = ref<FormInstance>()
// OAuth2客户端表单数据
const oauth2Form = reactive<Partial<OAuth2ClientConfig>>({
  clientAuthenticationMethods: ['none'],
  authorizationGrantTypes: ['authorization_code', 'refresh_token'],
  requireProofKey: true,
  requireAuthorizationConsent: true,
  accessTokenTimeToLive: 3600,
  refreshTokenTimeToLive: 2592000,
  authorizationCodeTimeToLive: 300,
  clientName: '',
  clientId: '',


  redirectUris: [],
  scopes: [],

})

const oauth2Rules: FormRules = {
  requireProofKey: [{ required: true, message: '请选择PKCE设置', trigger: 'change' }],
  requireAuthorizationConsent: [{ required: true, message: '请选择授权确认设置', trigger: 'change' }],
  accessTokenTimeToLive: [{ required: true, message: '请输入访问令牌有效期', trigger: 'change' }],
  refreshTokenTimeToLive: [{ required: true, message: '请输入刷新令牌有效期', trigger: 'change' }],
  authorizationCodeTimeToLive: [{ required: true, message: '请输入授权码有效期', trigger: 'change' }],
  clientName: [{ required: true, message: '请输入客户端名称', trigger: 'blur' }],
  clientId: [{ required: true, message: '请输入客户端ID', trigger: 'blur' }],


  redirectUris: [{ required: true, message: '请输入回调地址', trigger: 'blur' }],
  scopes: [{ required: true, message: '请输入授权范围', trigger: 'blur' }],
}

// ==================== 权限码管理 ====================
// 权限列表加载状态
const permissionLoading = ref(false)
const permissions = ref<Permission[]>([])
// 权限查询条件
const permissionQuery = reactive<PageQuery & { type?: number }>({
  page: 1,
  size: 10,
})
const permissionTotal = ref(0)
const permissionDialogVisible = ref(false)
const permissionFormRef = ref<FormInstance>()
// 权限表单数据
const permissionForm = reactive<Partial<Permission>>({
  code: '',
  name: '',
  description: '',

  type: 2,
  status: 1,
})

const permissionRules: FormRules = {
  code: [{ required: true, message: '请输入权限码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],

  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

const permissionRolesDialogVisible = ref(false)
const permissionRoles = ref<PermissionRole[]>([])

const onlineLoading = ref(false)
const onlineUsers = ref<OnlineUser[]>([])
const onlineQuery = reactive<PageQuery>({ page: 1, size: 10 })
const onlineTotal = ref(0)
const selectedSessions = ref<string[]>([])

const sessionLoading = ref(false)
const sessionFormRef = ref<FormInstance>()
const sessionConfig = reactive<Partial<SessionConfig>>({
  maxConcurrentSessions: 5,
  sessionTimeout: 1800,
  preventLogin: false,
  enableSessionFixationProtection: true,
  enableRememberMe: false,
  rememberMeDuration: 86400,
  enableActivityTracking: true,
  cleanupInterval: 300,
})

const sessionRules: FormRules = {
  rememberMeDuration: [{ required: true, type: 'number', min: 86400, message: '记住我时长至少86400秒', trigger: 'change' }],
  cleanupInterval: [{ required: true, type: 'number', min: 60, message: '清理间隔至少60秒', trigger: 'change' }],
  maxConcurrentSessions: [{ required: true, message: '请输入最大并发会话数', trigger: 'blur' }],
  sessionTimeout: [{ required: true, message: '请输入会话超时时间', trigger: 'blur' }],
}

const securityLoading = ref(false)
const securityFormRef = ref<FormInstance>()
const securityPolicy = reactive<Partial<SecurityPolicy>>({
  loginFailureLockThreshold: 5,
  accountLockDuration: 1800,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireDigit: true,
  passwordRequireSpecialChar: false,
  passwordExpirationDays: 90,
  passwordHistoryLimit: 5,
  enableCaptcha: true,
  captchaThreshold: 3,
  enableIpWhitelist: false,
  ipWhitelist: '',
  enableTwoFactorAuth: false,
})

const securityRules: FormRules = {
  passwordHistoryLimit: [{ required: true, type: 'number', min: 0, message: '请输入密码历史数量', trigger: 'change' }],
  captchaThreshold: [{ required: true, type: 'number', min: 0, message: '请输入验证码触发次数', trigger: 'change' }],
  loginFailureLockThreshold: [{ required: true, message: '请输入最大登录尝试次数', trigger: 'blur' }],
  accountLockDuration: [{ required: true, message: '请输入锁定时长', trigger: 'blur' }],
  passwordMinLength: [{ required: true, message: '请输入密码最小长度', trigger: 'blur' }],
}

const attemptLoading = ref(false)
const loginAttempts = ref<LoginAttempt[]>([])
const attemptQuery = reactive<PageQuery & { username?: string; status?: number }>({
  page: 1,
  size: 10,
})
const attemptTotal = ref(0)

/**
 * 格式化时长显示
 * @param seconds 秒数
 * @returns 格式化后的时长字符串
 */
function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '0秒'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时`
  return `${Math.floor(seconds / 86400)}天`
}

/**
 * 加载JWT配置
 */
async function loadJwtConfig() {
  jwtLoading.value = true
  try {
    const config = await getJwtConfig()
    Object.assign(jwtConfig, config, { secret: '' })
  } catch (error) {
    ElMessage.error('加载JWT配置失败')
  } finally {
    jwtLoading.value = false
  }
}

/**
 * 保存JWT配置
 */
async function saveJwtConfig() {
  if (!jwtFormRef.value) return
  await jwtFormRef.value.validate()
  try {
    await updateJwtConfig(jwtConfig as JwtConfig)
    jwtConfig.secret = ''
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

/** 加载 OAuth2 客户端列表 */
async function loadOAuth2Clients() {
  oauth2Loading.value = true
  try {
    oauth2Clients.value = await listOAuth2Clients()
  } catch (error) {
    ElMessage.error('加载OAuth2客户端失败')
  } finally {
    oauth2Loading.value = false
  }
}

/** 重置表单为默认公共客户端配置（PKCE + 授权码/刷新令牌）并打开新增弹窗 */
function handleAddOAuth2Client() {
  Object.assign(oauth2Form, {
    id: undefined,
    clientSecret: undefined,
    postLogoutRedirectUris: [],
    clientAuthenticationMethods: ['none'],
    authorizationGrantTypes: ['authorization_code', 'refresh_token'],
    requireProofKey: true,
    requireAuthorizationConsent: true,
    accessTokenTimeToLive: 3600,
    refreshTokenTimeToLive: 2592000,
    authorizationCodeTimeToLive: 300,
    clientName: '',
    clientId: '',
    redirectUris: [],
    scopes: [],
  })
  oauth2DialogVisible.value = true
}

/** 回填所选客户端并打开编辑弹窗（密钥不回显，查询未返回的设置需显式补填） */
function handleEditOAuth2Client(row: OAuth2ClientConfig) {
  Object.assign(oauth2Form, {
    ...row,
    clientSecret: undefined,
    requireProofKey: row.clientAuthenticationMethods.includes('none') ? true : undefined,
    requireAuthorizationConsent: undefined,
    accessTokenTimeToLive: undefined,
    refreshTokenTimeToLive: undefined,
    authorizationCodeTimeToLive: undefined,
    redirectUris: [...row.redirectUris],
    scopes: [...row.scopes],
  })
  oauth2DialogVisible.value = true
}

/** 校验并提交 OAuth2 客户端（按有无 id 区分创建/更新），成功后刷新列表 */
async function submitOAuth2Client() {
  if (!oauth2FormRef.value) return
  await oauth2FormRef.value.validate()
  try {
    if (oauth2Form.id) {
      await updateOAuth2Client(oauth2Form.clientId!, oauth2Form as OAuth2ClientConfig)
      ElMessage.success('更新成功')
    } else {
      await createOAuth2Client(oauth2Form as OAuth2ClientConfig)
      ElMessage.success('创建成功')
    }
    oauth2DialogVisible.value = false
    await loadOAuth2Clients()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}


/** 确认后删除 OAuth2 客户端并刷新列表 */
async function handleDeleteOAuth2Client(row: OAuth2ClientConfig) {
  if (!row.id) return
  await ElMessageBox.confirm('确认删除该OAuth2客户端?', '提示', { type: 'warning' })
  try {
    await deleteOAuth2Client(row.clientId)
    ElMessage.success('删除成功')
    await loadOAuth2Clients()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

/** 按筛选条件分页加载权限码列表 */
async function loadPermissions() {
  permissionLoading.value = true
  try {
    const result = await listPermissions(permissionQuery)
    permissions.value = result.list || []
    permissionTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载权限失败')
  } finally {
    permissionLoading.value = false
  }
}

/** 清空类型筛选并重新加载权限列表 */
function resetPermissionQuery() {
  permissionQuery.type = undefined
  loadPermissions()
}

/** 触发后端权限扫描，提示新增/废弃权限数量（后端不执行增删）并刷新列表 */
async function handleSyncPermissions() {
  try {
    const result = await syncPermissions()
    ElMessage.success(`扫描完成：发现 ${result.addedPermissions.length} 个新增权限、${result.removedPermissions.length} 个废弃权限（未执行增删）`)
    await loadPermissions()
  } catch (error) {
    ElMessage.error('同步失败')
  }
}

/** 重置表单（默认按钮类型 type=2）并打开权限新增弹窗 */
function handleAddPermission() {
  Object.assign(permissionForm, {
    id: undefined,
    code: '',
    name: '',
    description: '',

    type: 2,
    status: 1,
  })
  permissionDialogVisible.value = true
}

/** 回填所选权限并打开编辑弹窗 */
function handleEditPermission(row: Permission) {
  Object.assign(permissionForm, row)
  permissionDialogVisible.value = true
}

/** 校验并提交权限表单（按有无 id 区分创建/更新），成功后刷新列表 */
async function submitPermission() {
  if (!permissionFormRef.value) return
  await permissionFormRef.value.validate()
  try {
    if (permissionForm.id) {
      await updatePermission(permissionForm.id, permissionForm as Permission)
      ElMessage.success('更新成功')
    } else {
      await createPermission(permissionForm as Permission)
      ElMessage.success('创建成功')
    }
    permissionDialogVisible.value = false
    await loadPermissions()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

/** 确认后删除权限并刷新列表 */
async function handleDeletePermission(row: Permission) {
  if (!row.id) return
  await ElMessageBox.confirm('确认删除该权限?', '提示', { type: 'warning' })
  try {
    await deletePermission(row.id)
    ElMessage.success('删除成功')
    await loadPermissions()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}


/** 按筛选条件分页加载在线用户列表 */
async function loadOnlineUsers() {
  onlineLoading.value = true
  try {
    const result = await listOnlineUsers(onlineQuery)
    onlineUsers.value = result.list || []
    onlineTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载在线用户失败')
  } finally {
    onlineLoading.value = false
  }
}

/** 记录表格勾选的在线用户会话 ID */
function handleSelectionChange(val: OnlineUser[]) {
  selectedSessions.value = val.map((v) => v.id)
}

/** 确认后强制单个用户下线并刷新列表 */
async function handleForceLogout(row: OnlineUser) {
  await ElMessageBox.confirm('确认强制该用户下线?', '提示', { type: 'warning' })
  try {
    await forceLogout(row.id)
    ElMessage.success('强制下线成功')
    await loadOnlineUsers()
  } catch (error) {
    ElMessage.error('强制下线失败')
  }
}

/** 确认后批量强制勾选用户下线并刷新列表 */
async function handleBatchLogout() {
  await ElMessageBox.confirm(`确认强制选中的${selectedSessions.value.length}个用户下线?`, '提示', { type: 'warning' })
  try {
    await batchForceLogout(selectedSessions.value)
    ElMessage.success('批量强制下线成功')
    await loadOnlineUsers()
  } catch (error) {
    ElMessage.error('批量强制下线失败')
  }
}

/** 加载会话配置 */
async function loadSessionConfig() {
  sessionLoading.value = true
  try {
    const config = await getSessionConfig()
    Object.assign(sessionConfig, config)
  } catch (error) {
    ElMessage.error('加载会话配置失败')
  } finally {
    sessionLoading.value = false
  }
}

/** 校验并保存会话配置 */
async function saveSessionConfig() {
  if (!sessionFormRef.value) return
  await sessionFormRef.value.validate()
  try {
    await updateSessionConfig(sessionConfig as SessionConfig)
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

/** 加载安全策略配置 */
async function loadSecurityPolicy() {
  securityLoading.value = true
  try {
    const policy = await getSecurityPolicy()
    Object.assign(securityPolicy, policy)
  } catch (error) {
    ElMessage.error('加载安全策略失败')
  } finally {
    securityLoading.value = false
  }
}

/** 校验并保存安全策略配置 */
async function saveSecurityPolicy() {
  if (!securityFormRef.value) return
  await securityFormRef.value.validate()
  try {
    await updateSecurityPolicy(securityPolicy as SecurityPolicy)
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

/** 按筛选条件分页加载登录尝试记录 */
async function loadLoginAttempts() {
  attemptLoading.value = true
  try {
    const result = await listLoginAttempts(attemptQuery)
    loginAttempts.value = result.list || []
    attemptTotal.value = result.total
  } catch (error) {
    ElMessage.error('加载登录记录失败')
  } finally {
    attemptLoading.value = false
  }
}

/** 清空账号/状态筛选并重新加载登录记录 */
function resetAttemptQuery() {
  attemptQuery.username = undefined
  attemptQuery.status = undefined
  loadLoginAttempts()
}


onMounted(() => {
  loadJwtConfig()
  loadOAuth2Clients()
  loadPermissions()
  loadOnlineUsers()
  loadSessionConfig()
  loadSecurityPolicy()
  loadLoginAttempts()
})
</script>

<style scoped lang="scss">
.auth-config-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-toolbar {
  margin-bottom: 16px;
}

.form-tip {
  margin-left: 10px;
  color: #999;
  font-size: 12px;
}
</style>
