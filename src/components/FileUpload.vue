<!--
  文件上传组件
  ------------------------------------------------------------------
  基于 Element Plus el-upload 封装的文件上传组件。
  
  功能特性：
  - 支持图片上传（jpg/png/gif/webp）
  - 文件大小校验（默认10MB）
  - 文件类型校验
  - 支持删除
  - 自动携带认证Token
  （上传进度展示/预览未实现；需要进度与裁剪/压缩/分片请用 FileUploadEnhanced）
  
  使用示例：
  ```vue
  <FileUpload 
    :sex="0" 
    :limit="3" 
    @success="handleUploadSuccess"
    @remove="handleFileRemove"
  />
  ```
-->
<template>
  <el-upload
    v-model:file-list="fileList"
    :action="uploadUrl"
    :headers="uploadHeaders"
    :data="uploadData"
    :before-upload="beforeUpload"
    :on-success="handleSuccess"
    :on-error="handleError"
    :on-remove="handleRemove"
    :limit="limit"
    :list-type="listType"
    :accept="accept"
    :disabled="disabled"
  >
    <el-button v-if="listType === 'text'" type="primary" :icon="Upload" :disabled="disabled">
      点击上传
    </el-button>
    <el-icon v-else><Plus /></el-icon>
    
    <template #tip>
      <div class="el-upload__tip">
        {{ tip || `支持 ${acceptText}，大小不超过 ${maxSizeMB}MB` }}
      </div>
    </template>
  </el-upload>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { Plus, Upload } from '@element-plus/icons-vue'
import { getToken } from '@/utils/auth'
import { apiUrl } from '@/utils/api-base'
import { toMultipartUploadSex } from '@/utils/upload-sex'
import { toFileUploadResult } from '@/utils/upload-result'
import { MAX_UPLOAD_SIZE } from '@/settings'
import type { FileUploadResponse, FileUploadResult } from '@/types'
import type { UploadProps, UploadUserFile } from 'element-plus'

interface Props {
  /** 性别路由参数（0=男/AM，1=女/AF） */
  sex?: 0 | 1
  /** 最大上传数量 */
  limit?: number
  /** 展示类型 */
  listType?: 'text' | 'picture' | 'picture-card'
  /** 接受的文件类型（MIME类型） */
  accept?: string
  /** 提示文字 */
  tip?: string
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sex: 0,
  limit: 1,
  listType: 'picture-card',
  accept: 'image/jpeg,image/png,image/gif,image/webp',
  disabled: false
})

const emit = defineEmits<{
  /** 上传成功事件 */
  success: [result: FileUploadResult]
  /** 删除文件事件 */
  remove: [file: UploadUserFile]
}>()

const fileList = ref<UploadUserFile[]>([])

/** 上传接口地址（与请求层同源，跨域部署取 VITE_API_BASE_URL） */
const uploadUrl = computed(() => apiUrl('/api/v1/files/generic'))

/** 上传请求头（携带Token） */
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))

/** 上传额外参数 */
const uploadData = computed(() => ({
  sex: toMultipartUploadSex(props.sex)
}))

/** 文件大小上限（MB） */
const maxSizeMB = Math.floor(MAX_UPLOAD_SIZE / 1024 / 1024)

/** 接受的文件类型文本 */
const acceptText = computed(() => {
  const types = props.accept.split(',').map(type => {
    const ext = type.split('/')[1]
    return ext ? ext.toUpperCase() : type
  })
  return types.join('/')
})

/**
 * 上传前校验
 */
const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  // 文件大小校验
  if (file.size > MAX_UPLOAD_SIZE) {
    ElMessage.error(`文件大小不能超过 ${maxSizeMB} MB`)
    return false
  }
  
  // 文件类型校验
  const allowedTypes = props.accept.split(',').map(t => t.trim())
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error(`仅支持上传 ${acceptText.value} 格式的文件`)
    return false
  }
  
  return true
}

/**
 * 上传成功回调
 */
const handleSuccess: UploadProps['onSuccess'] = (response, uploadFile: UploadUserFile) => {
  // 后端响应为 Result{code,msg,data}，此处按契约收紧类型
  const payload = response as { code: number; msg?: string; data: FileUploadResponse }
  if (payload.code === 0) {
    const result = toFileUploadResult(payload.data)
    ElMessage.success('上传成功')
    
    // 更新文件列表中的URL（便于预览）
    if (uploadFile && result.url) {
      uploadFile.url = result.url
    }
    
    emit('success', result)
  } else {
    ElMessage.error(payload.msg || '上传失败')
    // 移除上传失败的文件
    const index = fileList.value.findIndex(f => f.uid === uploadFile.uid)
    if (index > -1) {
      fileList.value.splice(index, 1)
    }
  }
}

/**
 * 上传失败回调
 */
const handleError: UploadProps['onError'] = (error: Error) => {
  console.error('上传失败：', error)
  ElMessage.error('上传失败，请重试')
}

/**
 * 删除文件回调
 */
const handleRemove: UploadProps['onRemove'] = (file) => {
  emit('remove', file)
}

/**
 * 暴露方法：清空文件列表
 */
const clearFiles = () => {
  fileList.value = []
}

/**
 * 暴露方法：获取已上传文件列表
 */
const getFileList = () => {
  return fileList.value
}

defineExpose({
  clearFiles,
  getFileList
})
</script>

<style scoped>
.el-upload__tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 8px;
  line-height: 1.5;
}
</style>
