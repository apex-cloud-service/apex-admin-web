# 文件上传功能使用文档

## 概述

本文档说明如何在 apex-admin-web 前端项目中使用文件上传功能。

**实施时间：** 2026-09-08  
**实施方案：** MVP（最小可行方案）  
**实施状态：** ✅ 已完成

> **校准说明（2026-10-30）：** 本文已按当前前端源码核对接口路径与组件行为；涉及后端内部校验、存储实现与配置键的内容为编写时对后端仓库的历史描述，需在后端工程/目标环境中另行核验。

---

## 一、已实现的功能

### 1.1 核心文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 类型定义 | [src/types/index.ts](../../src/types/index.ts) | FileUploadResult 接口定义 |
| API接口 | [src/api/file.ts](../../src/api/file.ts) | 文件上传/删除/URL获取等接口封装 |
| 上传组件 | [src/components/FileUpload.vue](../../src/components/FileUpload.vue) | 基于 el-upload 的上传组件 |
| 测试页面 | [src/views/demo/FileUploadDemo.vue](../../src/views/demo/FileUploadDemo.vue) | 功能测试示例页面 |

### 1.2 功能特性

- ✅ 文件上传（POST /api/v1/files/generic）
- ✅ 文件删除（DELETE /api/v1/file/delete）
- ✅ 文件大小校验（10MB限制）
- ✅ 文件类型校验（图片格式）
- ✅ 自动携带认证Token
- ✅ 上传进度展示
- ✅ 图片预览功能（使用上传响应中的 `url` 字段）
- ✅ 支持单文件/多文件上传

> 文件访问直接使用上传响应返回的 `url`（有效期 `expiresIn` 秒）；`api/file.ts` 未封装「获取 URL / 检查存在 / 读取内容」类端点。

---

## 二、快速开始

### 2.1 访问测试页面

启动开发服务器后，访问：

```
http://localhost:5173/demo/file-upload
```

该页面提供了三个完整的上传示例，可直接测试上传功能。

### 2.2 在页面中使用上传组件

**基础用法：**

```vue
<template>
  <FileUpload 
    :sex="0" 
    :limit="1" 
    @success="handleUploadSuccess"
  />
</template>

<script setup lang="ts">
import FileUpload from '@/components/FileUpload.vue'
import type { FileUploadResult } from '@/types'

const handleUploadSuccess = (result: FileUploadResult) => {
  console.log('上传成功：', result)
  // result.url 是文件访问地址
  // result.objectName 是对象存储路径
}
</script>
```

**多文件上传：**

```vue
<template>
  <FileUpload 
    :sex="1" 
    :limit="3" 
    list-type="picture-card"
    @success="handleUploadSuccess"
    @remove="handleFileRemove"
  />
</template>

<script setup lang="ts">
import FileUpload from '@/components/FileUpload.vue'
import type { FileUploadResult } from '@/types'
import type { UploadUserFile } from 'element-plus'

const uploadedFiles = ref<FileUploadResult[]>([])

const handleUploadSuccess = (result: FileUploadResult) => {
  uploadedFiles.value.push(result)
}

const handleFileRemove = (file: UploadUserFile) => {
  // 可选：调用删除接口
  if (file.response?.data) {
    const { bucketName, objectName } = file.response.data
    // await deleteFile(bucketName, objectName)
  }
}
</script>
```

### 2.3 组件 Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| sex | `0 \| 1` | `0` | 性别路由参数（0=男/AM，1=女/AF） |
| limit | `number` | `1` | 最大上传数量 |
| listType | `'text' \| 'picture' \| 'picture-card'` | `'picture-card'` | 展示类型 |
| accept | `string` | `'image/jpeg,image/png,image/gif,image/webp'` | 接受的文件类型 |
| tip | `string` | 自动生成 | 提示文字 |
| disabled | `boolean` | `false` | 是否禁用 |

### 2.4 组件事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| success | `(result: FileUploadResult)` | 上传成功时触发 |
| remove | `(file: UploadUserFile)` | 删除文件时触发 |

### 2.5 组件方法

```typescript
const uploadRef = ref()

// 清空文件列表
uploadRef.value?.clearFiles()

// 获取已上传文件列表
const fileList = uploadRef.value?.getFileList()
```

---

## 三、API 接口使用

### 3.1 上传文件

```typescript
import { uploadFile } from '@/api/file'

const file = event.target.files[0]
const result = await uploadFile(file, 0)

console.log('访问URL：', result.url)
console.log('对象名：', result.objectName)
console.log('存储桶：', result.bucketName)
console.log('有效期：', result.expiresIn)
```

### 3.2 删除文件

```typescript
import { deleteFile } from '@/api/file'

const success = await deleteFile('apex', 'AF/abc123.jpg')
if (success) {
  console.log('删除成功')
}
```

### 3.3 图片预览

文件访问直接使用上传响应中的 `url` 字段（预签名 URL，有效期见 `expiresIn`）：

```vue
<script setup lang="ts">
import type { FileUploadResult } from '@/types'
const uploaded = ref<FileUploadResult | null>(null)
</script>

<template>
  <img v-if="uploaded" :src="uploaded.url" alt="图片" />
</template>
```

> 组件的 remove 事件只是从前端列表移除文件项，不会调用后端删除接口。

---

## 四、类型定义

### 4.1 FileUploadResult

```typescript
export interface FileUploadResult {
  /** 存储桶名称 */
  bucketName: string
  /** 对象存储路径（含性别目录，如 AF/uuid.jpg） */
  objectName: string
  /** 文件访问URL */
  url: string
  /** URL有效期（秒） */
  expiresIn: number
}
```

---

## 五、后端接口说明

### 5.1 上传接口

**请求：**
```
POST /api/v1/files/generic
Content-Type: multipart/form-data

file: <文件对象>
sex: 0 | 1
```

**响应：**
```json
{
  "code": 0,
  "msg": "成功",
  "data": {
    "bucketName": "apex",
    "objectName": "AF/uuid.jpg",
    "url": "/api/v1/file/content?fileName=AF/uuid.jpg",
    "expiresIn": 3600
  },
  "traceId": "abc123"
}
```

### 5.2 文件限制

- **大小限制：** 前端统一取 `MAX_UPLOAD_SIZE`（10MB，`src/settings.ts`）；后端配置键与实际限制需在后端工程/目标环境核验
- **类型限制：** 前端默认仅支持图片（jpg/png/gif/webp），可通过组件 `accept` 属性修改
- **后端校验：** 以下为此前对后端仓库的历史描述，本前端仓库无法证实，需外部核验：
  - 魔数校验（验证真实格式）
  - 百度云图片审核
  - FGCLIP 违规检测

### 5.3 存储策略

存储方式属后端实现细节：此前依据后端仓库文档描述支持三种方式（由配置 `storage.default-type` 控制），现状需在后端工程/目标环境核验：

- **LOCAL**：本地文件系统
- **MINIO**：MinIO 对象存储
- **VOLCENGINE_TOS**：火山引擎 TOS

前端无需关心存储方式，统一调用接口即可。

---

## 六、常见问题

### 6.1 上传失败：401 Unauthorized

**原因：** Token 未携带或已过期

**解决：**
1. 确认已登录
2. 确认请求头已携带 `Authorization`（会话由 `src/utils/auth.ts` 管理，勿直接依赖存储键）
3. 尝试重新登录

### 6.2 上传失败：文件大小超限

**原因：** 文件超过 10MB

**解决：**
1. 压缩图片后重试
2. 或联系管理员调整后端大小限制（具体配置键需在后端工程核验）

### 6.3 上传失败：文件类型不支持

**原因：** 文件类型不在允许列表中

**解决：**
- 前端：修改组件 `accept` 属性
- 后端：修改 `FileHandler` 中的类型校验逻辑

### 6.4 上传成功但无法访问URL

**原因：** 
- 本地存储模式：后端服务未启动
- MinIO/TOS：存储服务配置错误

**解决：**
1. 检查后端服务运行状态
2. 检查后端配置文件中的存储配置
3. 查看后端日志获取详细错误信息

### 6.5 如何在表单中使用上传功能

**示例：用户头像上传**

```vue
<template>
  <el-form :model="form" ref="formRef">
    <el-form-item label="头像" prop="avatarUrl">
      <FileUpload 
        :sex="form.gender || 0" 
        :limit="1"
        @success="handleAvatarUpload"
      />
      <div v-if="form.avatarUrl" style="margin-top: 8px">
        <el-image 
          :src="form.avatarUrl" 
          style="width: 100px; height: 100px"
          fit="cover"
        />
      </div>
    </el-form-item>
    
    <el-form-item>
      <el-button type="primary" @click="handleSubmit">保存</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileUpload from '@/components/FileUpload.vue'
import type { FileUploadResult } from '@/types'

const form = ref({
  avatarUrl: '',
  gender: 0
})

const handleAvatarUpload = (result: FileUploadResult) => {
  form.value.avatarUrl = result.url
}

const handleSubmit = async () => {
  // 提交表单，avatarUrl 已包含文件访问地址
  console.log('提交表单：', form.value)
}
</script>
```

---

## 七、进阶用法

### 7.1 自定义上传按钮

```vue
<template>
  <el-upload
    :action="uploadUrl"
    :headers="uploadHeaders"
    :data="{ sex: 0 }"
    :before-upload="beforeUpload"
    :on-success="handleSuccess"
    :show-file-list="false"
  >
    <el-button type="primary" :icon="Upload">
      自定义上传按钮
    </el-button>
  </el-upload>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { getToken } from '@/utils/auth'
import { apiUrl } from '@/utils/api-base'
import { MAX_UPLOAD_SIZE } from '@/settings'
import { ElMessage } from 'element-plus'

// 上传地址统一经 apiUrl 拼接：跨域部署自动携带 VITE_API_BASE_URL
const uploadUrl = apiUrl('/api/v1/files/generic')
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))

const beforeUpload = (file: File) => {
  if (file.size > MAX_UPLOAD_SIZE) {
    ElMessage.error('文件大小不能超过 10 MB')
    return false
  }
  return true
}

const handleSuccess = (response: any) => {
  if (response.code === 0) {
    ElMessage.success('上传成功')
    console.log('文件URL：', response.data.url)
  }
}
</script>
```

### 7.2 上传前图片裁剪

可集成第三方库如 `vue-cropper` 实现上传前裁剪：

```bash
npm install vue-cropper
```

```vue
<template>
  <div>
    <el-button @click="showCropper">选择图片</el-button>
    
    <el-dialog v-model="cropperVisible" title="裁剪图片">
      <VueCropper ref="cropperRef" :src="imageSrc" />
      <template #footer>
        <el-button @click="cropperVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCrop">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueCropper } from 'vue-cropper'
import { uploadFile } from '@/api/file'

const cropperVisible = ref(false)
const imageSrc = ref('')
const cropperRef = ref()

const showCropper = () => {
  // 打开文件选择器
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: any) => {
    const file = e.target.files[0]
    imageSrc.value = URL.createObjectURL(file)
    cropperVisible.value = true
  }
  input.click()
}

const handleCrop = async () => {
  // 获取裁剪后的图片
  cropperRef.value.getCropBlob(async (blob: Blob) => {
    const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
    const result = await uploadFile(file, 0)
    console.log('上传成功：', result)
    cropperVisible.value = false
  })
}
</script>
```

### 7.3 拖拽上传

Element Plus 的 `el-upload` 已内置拖拽上传功能（`uploadUrl` 同样按 §7.1 用 `apiUrl('/api/v1/files/generic')` 拼接）：

```vue
<template>
  <el-upload
    drag
    :action="uploadUrl"
    :headers="uploadHeaders"
    :data="{ sex: 0 }"
    :on-success="handleSuccess"
  >
    <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
    <div class="el-upload__text">
      拖拽文件到此处 或 <em>点击上传</em>
    </div>
  </el-upload>
</template>
```

---

## 八、安全注意事项

### 8.1 前端校验不可信

前端的文件大小和类型校验**仅用于用户体验优化**，不能作为安全防护手段。

后端应执行的校验（此前对后端仓库的历史描述，本前端仓库无法证实，需在后端工程/目标环境核验）：
- 文件大小限制
- 魔数校验（真实格式验证）
- 内容审核（百度云图片审核）
- 违规检测（FGCLIP）

### 8.2 Token 安全

- 会话由 `src/utils/auth.ts` 统一管理
- 上传请求在上传通道内注入 `Authorization: Bearer <token>`；该通道不经过 Axios 拦截器，401 无感刷新/重放与统一错误转换不适用于上传请求
- 上传返回 401 时由组件提示错误，是否跳转登录取决于调用方处理，不会像常规接口那样自动刷新令牌

### 8.3 不要暴露敏感信息

- 不要在前端代码中硬编码存储桶配置
- 不要在日志中打印 Token
- 预签名URL 由后端生成，前端不应自行生成

---

## 九、后续优化建议

当前基础版为 MVP 方案。下表中多项能力（图片预览放大、进度条美化、裁剪、压缩、粘贴上传）已在增强版组件落地，见 [file-upload-enhanced.md](file-upload-enhanced.md)；分片/断点续传/秒传已由 `api/file.ts` 的 `/api/v1/file/chunk/**` 封装与增强组件 `enableChunk`（默认关闭）支持，此处仅剩未实现项：

### 9.1 组件增强（P1）

- [ ] 图片预览放大功能
- [ ] 上传进度条美化
- [ ] 支持视频上传
- [ ] 支持文档上传（PDF/Word/Excel）

### 9.2 用户体验优化（P1）

- [ ] 上传前图片裁剪
- [ ] 上传前图片压缩
- [ ] 粘贴上传（Ctrl+V）
- [ ] 拖拽排序

### 9.3 高级功能（P2）

- [x] 断点续传（分片 status 已上传集合跳过，组件 `enableChunk` 启用）
- [x] 分片上传（大文件，`/api/v1/file/chunk/**`）
- [x] 秒传（uploaded 齐全跳过上传；MD5 去重合并由后端实现）
- [ ] 批量上传队列管理

### 9.4 文件管理页面（P2）

- [ ] 创建文件管理页面 `/system/file`
- [ ] 文件列表展示（表格）
- [ ] 文件搜索/过滤
- [ ] 文件批量删除
- [ ] 文件统计（总大小、数量）

---

## 十、参考资料

- [Element Plus Upload 组件](https://element-plus.org/zh-CN/component/upload.html)
- [Axios 文档](https://axios-http.com/)
- [MDN File API](https://developer.mozilla.org/zh-CN/docs/Web/API/File)
- 后端文件上传流程：`apex-scaffold/docs/architecture/business-flows.md`
- 后端 API 文档：`apex-scaffold/docs/API_DOCUMENTATION_PREVIEW.md`

---

**文档版本：** v1.1  
**最后更新：** 2026-10-31（按当前源码校准接口路径与行为描述）  
**维护人员：** TRAE AI Assistant
