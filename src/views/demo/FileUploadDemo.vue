<!--
  文件上传测试页面
  ------------------------------------------------------------------
  用于验证 FileUpload 组件功能
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
            <el-descriptions title="上传结果" :column="2" border>
              <el-descriptions-item label="存储桶">{{ upload1Result.bucketName }}</el-descriptions-item>
              <el-descriptions-item label="对象名">{{ upload1Result.objectName }}</el-descriptions-item>
              <el-descriptions-item label="访问URL" :span="2">
                <el-link :href="upload1Result.url" target="_blank" type="primary">
                  {{ upload1Result.url }}
                </el-link>
              </el-descriptions-item>
              <el-descriptions-item label="有效期">{{ upload1Result.expiresIn }} 秒</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <el-divider />

        <!-- 示例2：多张图片上传 -->
        <div>
          <h3>示例2：多张图片上传（最多3张）</h3>
          <FileUpload
            ref="upload2Ref"
            :sex="1"
            :limit="3"
            list-type="picture-card"
            @success="handleUpload2Success"
            @remove="handleUpload2Remove"
          />
          <div v-if="upload2Results.length > 0" class="result-box">
            <el-tag
              v-for="(result, index) in upload2Results"
              :key="index"
              type="success"
              style="margin-right: 8px; margin-bottom: 8px"
            >
              {{ result.objectName }}
            </el-tag>
          </div>
        </div>

        <el-divider />

        <!-- 示例3：文件列表模式 -->
        <div>
          <h3>示例3：文件列表模式</h3>
          <FileUpload
            ref="upload3Ref"
            :sex="0"
            :limit="5"
            list-type="text"
            @success="handleUpload3Success"
          />
        </div>

        <el-divider />

        <!-- 操作按钮 -->
        <div>
          <el-space>
            <el-button type="danger" @click="clearAll">清空所有上传</el-button>
            <el-button type="info" @click="showFileList">查看文件列表</el-button>
          </el-space>
        </div>

        <!-- 文件删除测试 -->
        <div v-if="upload1Result" class="result-box">
          <h4>文件删除测试</h4>
          <el-space>
            <el-input
              v-model="deleteFileName"
              placeholder="输入要删除的文件对象名"
              style="width: 300px"
            />
            <el-button type="danger" :loading="deleting" @click="handleDeleteFile">
              删除文件
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
import FileUpload from '@/components/FileUpload.vue'
import { deleteFile } from '@/api/file'
import type { FileUploadResult } from '@/types'
import type { UploadUserFile } from 'element-plus'

const upload1Ref = ref()
const upload2Ref = ref()
const upload3Ref = ref()

const upload1Result = ref<FileUploadResult | null>(null)
const upload2Results = ref<FileUploadResult[]>([])

const deleteFileName = ref('')
const deleting = ref(false)

/**
 * 示例1：上传成功回调
 */
const handleUpload1Success = (result: FileUploadResult) => {
  console.log('示例1上传成功：', result)
  upload1Result.value = result
  deleteFileName.value = result.objectName
  ElMessage.success('单图上传成功！')
}

/**
 * 示例1：删除回调
 */
const handleUpload1Remove = (file: UploadUserFile) => {
  console.log('示例1删除文件：', file)
  upload1Result.value = null
  deleteFileName.value = ''
}

/**
 * 示例2：上传成功回调
 */
const handleUpload2Success = (result: FileUploadResult) => {
  console.log('示例2上传成功：', result)
  upload2Results.value.push(result)
  ElMessage.success(`已上传 ${upload2Results.value.length} 张图片`)
}

/**
 * 示例2：删除回调
 */
const handleUpload2Remove = (file: UploadUserFile) => {
  console.log('示例2删除文件：', file)
  // 从结果列表中移除
  if (file.response?.data) {
    const objectName = file.response.data.objectName
    upload2Results.value = upload2Results.value.filter(r => r.objectName !== objectName)
  }
}

/**
 * 示例3：上传成功回调
 */
const handleUpload3Success = (result: FileUploadResult) => {
  console.log('示例3上传成功：', result)
  ElMessage.success('列表模式上传成功！')
}

/**
 * 清空所有上传
 */
const clearAll = () => {
  upload1Ref.value?.clearFiles()
  upload2Ref.value?.clearFiles()
  upload3Ref.value?.clearFiles()
  upload1Result.value = null
  upload2Results.value = []
  deleteFileName.value = ''
  ElMessage.success('已清空所有上传')
}

/**
 * 查看文件列表
 */
const showFileList = () => {
  const list1 = upload1Ref.value?.getFileList() || []
  const list2 = upload2Ref.value?.getFileList() || []
  const list3 = upload3Ref.value?.getFileList() || []
  console.log('示例1文件列表：', list1)
  console.log('示例2文件列表：', list2)
  console.log('示例3文件列表：', list3)
  ElMessage.info(`共 ${list1.length + list2.length + list3.length} 个文件，详见控制台`)
}

/**
 * 删除文件（调用后端接口）
 */
const handleDeleteFile = async () => {
  if (!deleteFileName.value) {
    ElMessage.warning('请输入要删除的文件对象名')
    return
  }
  
  if (!upload1Result.value) {
    ElMessage.warning('请先上传文件')
    return
  }

  deleting.value = true
  try {
    const success = await deleteFile(upload1Result.value.bucketName, deleteFileName.value)
    if (success) {
      ElMessage.success('文件删除成功')
      upload1Result.value = null
      deleteFileName.value = ''
      upload1Ref.value?.clearFiles()
    } else {
      ElMessage.warning('文件不存在或已被删除')
    }
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
