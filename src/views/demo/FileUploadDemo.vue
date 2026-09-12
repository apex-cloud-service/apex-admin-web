<!--
  文件上传测试页面 - TypeScript 修复版
  ------------------------------------------------------------------
  修复内容：
  1. 严格的 TypeScript 类型定义
  2. 修复 ref 类型定义
  3. 修复事件处理函数参数类型
-->
<template>
  <div class="file-upload-demo-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>文件上传组件测试</span>
        </div>
      </template>

      <el-space direction="vertical" :size="30" style="width: 100%">
        <!-- 示例1：单张图片上传（卡片模式） -->
        <div>
          <h3>示例1：单张图片上传（卡片模式）</h3>
          <FileUpload
            ref="upload1Ref"
            :sex="0"
            :limit="1"
            list-type="picture-card"
            @success="handleUpload1Success"
            @remove="handleUpload1Remove"
          />
          <div v-if="upload1Result" class="result-box">
            <h4>上传结果：</h4>
            <pre>{{ JSON.stringify(upload1Result, null, 2) }}</pre>
          </div>
        </div>

        <!-- 示例2：多张图片上传（列表模式） -->
        <div>
          <h3>示例2：多张图片上传（列表模式）</h3>
          <FileUpload
            ref="upload2Ref"
            :sex="0"
            :limit="3"
            :multiple="true"
            list-type="picture"
            @success="handleUpload2Success"
            @remove="handleUpload2Remove"
          />
          <div v-if="upload2Results.length > 0" class="result-box">
            <h4>已上传 {{ upload2Results.length }} 个文件：</h4>
            <pre>{{ JSON.stringify(upload2Results, null, 2) }}</pre>
          </div>
        </div>

        <!-- 示例3：拖拽上传 -->
        <div>
          <h3>示例3：拖拽上传</h3>
          <FileUpload
            ref="upload3Ref"
            :sex="0"
            :drag="true"
            @success="handleUpload3Success"
            @remove="handleUpload3Remove"
          />
          <div v-if="upload3Result" class="result-box">
            <h4>上传结果：</h4>
            <pre>{{ JSON.stringify(upload3Result, null, 2) }}</pre>
          </div>
        </div>

        <!-- 示例4：启用图片压缩 -->
        <div>
          <h3>示例4：启用图片压缩</h3>
          <FileUpload
            ref="upload4Ref"
            :sex="0"
            :enable-compress="true"
            :compress-quality="0.8"
            :compress-max-width="1920"
            :compress-max-height="1080"
            @success="handleUpload4Success"
            @remove="handleUpload4Remove"
          />
          <div v-if="upload4Result" class="result-box">
            <h4>上传结果（已压缩）：</h4>
            <pre>{{ JSON.stringify(upload4Result, null, 2) }}</pre>
          </div>
        </div>

        <!-- 示例5：启用图片裁剪 -->
        <div>
          <h3>示例5：启用图片裁剪</h3>
          <FileUpload
            ref="upload5Ref"
            :sex="0"
            :enable-cropper="true"
            @success="handleUpload5Success"
            @remove="handleUpload5Remove"
          />
          <div v-if="upload5Result" class="result-box">
            <h4>上传结果（已裁剪）：</h4>
            <pre>{{ JSON.stringify(upload5Result, null, 2) }}</pre>
          </div>
        </div>

        <!-- 示例6：启用粘贴上传 -->
        <div>
          <h3>示例6：启用粘贴上传（按 Ctrl+V）</h3>
          <FileUpload
            ref="upload6Ref"
            :sex="0"
            :enable-paste="true"
            @success="handleUpload6Success"
            @remove="handleUpload6Remove"
          />
          <div v-if="upload6Result" class="result-box">
            <h4>上传结果（粘贴上传）：</h4>
            <pre>{{ JSON.stringify(upload6Result, null, 2) }}</pre>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div>
          <el-space>
            <el-button type="primary" @click="handleClearAll">清空所有上传</el-button>
            <el-button type="danger" @click="handleDeleteFile" :loading="deleting">
              删除第一个文件
            </el-button>
          </el-space>
        </div>
      </el-space>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FileUpload from '@/components/FileUploadEnhanced.vue'
import { deleteFile } from '@/api/file'
import type { FileUploadResult } from '@/types'
import type { UploadUserFile } from 'element-plus'

// 组件引用
const upload1Ref = ref<InstanceType<typeof FileUpload>>()
const upload2Ref = ref<InstanceType<typeof FileUpload>>()
const upload3Ref = ref<InstanceType<typeof FileUpload>>()
const upload4Ref = ref<InstanceType<typeof FileUpload>>()
const upload5Ref = ref<InstanceType<typeof FileUpload>>()
const upload6Ref = ref<InstanceType<typeof FileUpload>>()

// 上传结果
const upload1Result = ref<FileUploadResult | null>(null)
const upload2Results = ref<FileUploadResult[]>([])
const upload3Result = ref<FileUploadResult | null>(null)
const upload4Result = ref<FileUploadResult | null>(null)
const upload5Result = ref<FileUploadResult | null>(null)
const upload6Result = ref<FileUploadResult | null>(null)

// 删除状态
const deleting = ref(false)

/**
 * 示例1：上传成功
 */
const handleUpload1Success = (result: FileUploadResult): void => {
  console.log('示例1 上传成功：', result)
  upload1Result.value = result
  ElMessage.success(`上传成功：${result.objectName}`)
}

/**
 * 示例1：删除文件
 */
const handleUpload1Remove = (file: UploadUserFile): void => {
  console.log('示例1 删除文件：', file)
  upload1Result.value = null
}

/**
 * 示例2：上传成功
 */
const handleUpload2Success = (result: FileUploadResult): void => {
  console.log('示例2 上传成功：', result)
  upload2Results.value.push(result)
  ElMessage.success(`上传成功：${result.objectName}`)
}

/**
 * 示例2：删除文件
 */
const handleUpload2Remove = (file: UploadUserFile): void => {
  console.log('示例2 删除文件：', file)
  const index = upload2Results.value.findIndex(r => r.url === file.url)
  if (index > -1) {
    upload2Results.value.splice(index, 1)
  }
}

/**
 * 示例3：上传成功
 */
const handleUpload3Success = (result: FileUploadResult): void => {
  console.log('示例3 上传成功：', result)
  upload3Result.value = result
  ElMessage.success(`上传成功：${result.objectName}`)
}

/**
 * 示例3：删除文件
 */
const handleUpload3Remove = (file: UploadUserFile): void => {
  console.log('示例3 删除文件：', file)
  upload3Result.value = null
}

/**
 * 示例4：上传成功
 */
const handleUpload4Success = (result: FileUploadResult): void => {
  console.log('示例4 上传成功（已压缩）：', result)
  upload4Result.value = result
  ElMessage.success(`上传成功（已压缩）：${result.objectName}`)
}

/**
 * 示例4：删除文件
 */
const handleUpload4Remove = (file: UploadUserFile): void => {
  console.log('示例4 删除文件：', file)
  upload4Result.value = null
}

/**
 * 示例5：上传成功
 */
const handleUpload5Success = (result: FileUploadResult): void => {
  console.log('示例5 上传成功（已裁剪）：', result)
  upload5Result.value = result
  ElMessage.success(`上传成功（已裁剪）：${result.objectName}`)
}

/**
 * 示例5：删除文件
 */
const handleUpload5Remove = (file: UploadUserFile): void => {
  console.log('示例5 删除文件：', file)
  upload5Result.value = null
}

/**
 * 示例6：上传成功
 */
const handleUpload6Success = (result: FileUploadResult): void => {
  console.log('示例6 上传成功（粘贴上传）：', result)
  upload6Result.value = result
  ElMessage.success(`上传成功（粘贴上传）：${result.objectName}`)
}

/**
 * 示例6：删除文件
 */
const handleUpload6Remove = (file: UploadUserFile): void => {
  console.log('示例6 删除文件：', file)
  upload6Result.value = null
}

/**
 * 清空所有上传
 */
const handleClearAll = (): void => {
  upload1Ref.value?.clearFiles()
  upload2Ref.value?.clearFiles()
  upload3Ref.value?.clearFiles()
  upload4Ref.value?.clearFiles()
  upload5Ref.value?.clearFiles()
  upload6Ref.value?.clearFiles()
  
  upload1Result.value = null
  upload2Results.value = []
  upload3Result.value = null
  upload4Result.value = null
  upload5Result.value = null
  upload6Result.value = null
  
  ElMessage.success('已清空所有上传')
}

/**
 * 删除第一个文件
 */
const handleDeleteFile = async (): Promise<void> => {
  const result = upload1Result.value
  if (!result) {
    ElMessage.warning('没有可删除的文件')
    return
  }
  
  deleting.value = true
  try {
    await deleteFile(result.bucketName, result.objectName)
    ElMessage.success('删除成功')
    upload1Ref.value?.clearFiles()
    upload1Result.value = null
  } catch (error) {
    console.error('删除文件失败：', error)
    ElMessage.error('删除文件失败')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.file-upload-demo-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.result-box {
  margin-top: 16px;
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
}

h4 {
  margin-top: 0;
  margin-bottom: 12px;
  color: var(--el-text-color-regular);
}
</style>
