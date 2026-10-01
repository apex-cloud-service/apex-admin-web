<!--
  文件上传增强版测试页面
  ------------------------------------------------------------------
  展示 FileUploadEnhanced 组件的所有增强功能
-->
<template>
  <div class="file-upload-enhanced-demo-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>文件上传组件增强版测试</span>
          <el-tag type="success">增强版 v2.0</el-tag>
        </div>
      </template>

      <el-alert 
        title="增强功能说明" 
        type="info" 
        :closable="false"
        style="margin-bottom: 20px"
      >
        <ul style="margin: 8px 0; padding-left: 20px">
          <li>✅ 图片预览放大功能（点击图片查看大图）</li>
          <li>✅ 上传进度条美化（实时显示上传进度）</li>
          <li>✅ 上传前图片压缩（自动压缩大图，节省流量）</li>
          <li>✅ 上传前图片裁剪（可选，支持自由裁剪）</li>
          <li>✅ 粘贴上传（Ctrl+V 直接粘贴图片）</li>
          <li>✅ 拖拽上传（拖拽文件到虚线框内）</li>
          <li>✅ 支持视频上传（mp4/webm/ogg）</li>
        </ul>
      </el-alert>

      <el-space direction="vertical" :size="30" style="width: 100%">
        <!-- 示例1：基础增强上传（自动压缩） -->
        <div>
          <h3>
            <el-icon style="vertical-align: middle"><Picture /></el-icon>
            示例1：基础增强上传（自动压缩）
          </h3>
          <p style="color: var(--el-text-color-secondary); font-size: 13px">
            自动压缩图片至 1920x1080，压缩质量 80%，节省上传流量
          </p>
          <FileUploadEnhanced
            ref="upload1Ref"
            :sex="0"
            :limit="3"
            :enable-compress="true"
            :enable-cropper="false"
            :enable-paste="false"
            list-type="picture-card"
            @success="handleUpload1Success"
          />
          <div v-if="upload1Results.length > 0" class="result-box">
            <el-descriptions title="上传结果" :column="1" border>
              <el-descriptions-item 
                v-for="(result, index) in upload1Results" 
                :key="index"
                :label="`文件${index + 1}`"
              >
                <el-link :href="result.url" target="_blank" type="primary">
                  {{ result.objectName }}
                </el-link>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <el-divider />

        <!-- 示例2：裁剪上传 -->
        <div>
          <h3>
            <el-icon style="vertical-align: middle"><Crop /></el-icon>
            示例2：裁剪上传
          </h3>
          <p style="color: var(--el-text-color-secondary); font-size: 13px">
            上传前可自由裁剪图片，适用于头像、封面图等场景
          </p>
          <FileUploadEnhanced
            ref="upload2Ref"
            :sex="1"
            :limit="1"
            :enable-compress="true"
            :enable-cropper="true"
            :enable-paste="false"
            list-type="picture-card"
            @success="handleUpload2Success"
          />
          <div v-if="upload2Result" class="result-box">
            <el-image 
              :src="upload2Result.url" 
              fit="cover"
              style="width: 200px; height: 200px; border-radius: 8px"
              :preview-src-list="[upload2Result.url]"
            />
            <div style="margin-top: 12px">
              <el-tag type="success">{{ upload2Result.objectName }}</el-tag>
            </div>
          </div>
        </div>

        <el-divider />

        <!-- 示例3：拖拽上传 + 粘贴上传 -->
        <div>
          <h3>
            <el-icon style="vertical-align: middle"><Upload /></el-icon>
            示例3：拖拽上传 + 粘贴上传
          </h3>
          <p style="color: var(--el-text-color-secondary); font-size: 13px">
            支持拖拽文件到虚线框，或按 Ctrl+V 粘贴剪贴板中的图片
          </p>
          <FileUploadEnhanced
            ref="upload3Ref"
            :sex="0"
            :limit="5"
            :enable-compress="true"
            :enable-cropper="false"
            :enable-paste="true"
            :drag="true"
            :multiple="true"
            @success="handleUpload3Success"
          />
          <div v-if="upload3Results.length > 0" class="result-box">
            <el-space wrap>
              <el-tag 
                v-for="(result, index) in upload3Results" 
                :key="index"
                type="success"
                closable
                @close="handleRemove3(index)"
              >
                {{ result.objectName }}
              </el-tag>
            </el-space>
          </div>
        </div>

        <el-divider />

        <!-- 示例4：视频上传 -->
        <div>
          <h3>
            <el-icon style="vertical-align: middle"><VideoCamera /></el-icon>
            示例4：视频上传
          </h3>
          <p style="color: var(--el-text-color-secondary); font-size: 13px">
            支持上传视频文件（mp4/webm/ogg），文件大小限制 10MB
          </p>
          <FileUploadEnhanced
            ref="upload4Ref"
            :sex="0"
            :limit="1"
            :enable-compress="false"
            :enable-cropper="false"
            :enable-paste="false"
            accept="video/mp4,video/webm,video/ogg"
            list-type="text"
            @success="handleUpload4Success"
          />
          <div v-if="upload4Result" class="result-box">
            <video 
              :src="upload4Result.url" 
              controls
              style="width: 100%; max-width: 600px; border-radius: 8px"
            />
            <div style="margin-top: 12px">
              <el-tag type="primary">{{ upload4Result.objectName }}</el-tag>
            </div>
          </div>
        </div>

        <el-divider />

        <!-- 功能对比表格 -->
        <div>
          <h3>
            <el-icon style="vertical-align: middle"><DataAnalysis /></el-icon>
            功能对比
          </h3>
          <el-table 
            :data="featureComparison" 
            border
            style="margin-top: 16px"
          >
            <el-table-column prop="feature" label="功能" width="200" />
            <el-table-column prop="basic" label="基础版" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.basic" color="var(--el-color-success)">
                  <Select />
                </el-icon>
                <el-icon v-else color="var(--el-color-info)">
                  <Close />
                </el-icon>
              </template>
            </el-table-column>
            <el-table-column prop="enhanced" label="增强版" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.enhanced" color="var(--el-color-success)">
                  <Select />
                </el-icon>
                <el-icon v-else color="var(--el-color-info)">
                  <Close />
                </el-icon>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <el-divider />

        <!-- 操作按钮 -->
        <div>
          <el-space>
            <el-button type="primary" :icon="RefreshRight" @click="clearAll">
              清空所有上传
            </el-button>
            <el-button type="info" :icon="View" @click="showStatistics">
              查看统计
            </el-button>
          </el-space>
        </div>
      </el-space>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/**
 * 增强版上传组件演示页逻辑
 * - 四个示例场景分别对应不同 props 组合，展示压缩/裁剪/拖拽/批量能力
 * - 通过 ref 调用组件暴露的 clearFiles 清空方法
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Picture,
  Crop,
  Upload,
  VideoCamera,
  DataAnalysis,
  Select,
  Close,
  RefreshRight,
  View
} from '@element-plus/icons-vue'
import FileUploadEnhanced from '@/components/FileUploadEnhanced.vue'
import type { FileUploadResult } from '@/types'

/** ========== 示例组件与结果 ========== */

/** 示例 1 组件实例（基础图片上传 + 压缩） */
const upload1Ref = ref()
/** 示例 2 组件实例（裁剪 + 进度弹窗） */
const upload2Ref = ref()
/** 示例 3 组件实例（批量 + 拖拽） */
const upload3Ref = ref()
/** 示例 4 组件实例（粘贴上传） */
const upload4Ref = ref()

/** 示例 1 的上传结果列表 */
const upload1Results = ref<FileUploadResult[]>([])
/** 示例 2 的最近一次上传结果 */
const upload2Result = ref<FileUploadResult | null>(null)
/** 示例 3 的上传结果列表 */
const upload3Results = ref<FileUploadResult[]>([])
/** 示例 4 的最近一次上传结果 */
const upload4Result = ref<FileUploadResult | null>(null)

/** 基础版 vs 增强版功能对照表 */
const featureComparison = [
  { feature: '基础上传', basic: true, enhanced: true },
  { feature: '文件大小校验', basic: true, enhanced: true },
  { feature: '文件类型校验', basic: true, enhanced: true },
  { feature: '图片预览', basic: true, enhanced: true },
  { feature: '图片预览放大', basic: false, enhanced: true },
  { feature: '上传进度条', basic: true, enhanced: true },
  { feature: '上传进度美化', basic: false, enhanced: true },
  { feature: '图片自动压缩', basic: false, enhanced: true },
  { feature: '图片裁剪', basic: false, enhanced: true },
  { feature: '拖拽上传', basic: false, enhanced: true },
  { feature: '粘贴上传', basic: false, enhanced: true },
  { feature: '视频上传', basic: false, enhanced: true },
  { feature: '批量上传', basic: true, enhanced: true },
]

/** ========== 上传回调 ========== */

/**
 * 示例 1 上传成功回调：记录结果
 * @param result 上传结果（存储路径与访问 URL）
 */
const handleUpload1Success = (result: FileUploadResult) => {
  console.log('示例1上传成功：', result)
  upload1Results.value.push(result)
}

/**
 * 示例 2 上传成功回调：记录结果
 * @param result 上传结果（存储路径与访问 URL）
 */
const handleUpload2Success = (result: FileUploadResult) => {
  console.log('示例2上传成功：', result)
  upload2Result.value = result
}

/**
 * 示例 3 上传成功回调：记录结果
 * @param result 上传结果（存储路径与访问 URL）
 */
const handleUpload3Success = (result: FileUploadResult) => {
  console.log('示例3上传成功：', result)
  upload3Results.value.push(result)
}

/**
 * 示例 4 上传成功回调：记录结果
 * @param result 上传结果（存储路径与访问 URL）
 */
const handleUpload4Success = (result: FileUploadResult) => {
  console.log('示例4上传成功：', result)
  upload4Result.value = result
}

/**
 * 从示例 3 的结果列表中移除指定项
 * @param index 待移除项下标
 */
const handleRemove3 = (index: number) => {
  upload3Results.value.splice(index, 1)
}

/** ========== 统一操作 ========== */

/**
 * 清空全部示例的组件文件列表与结果
 */
const clearAll = () => {
  upload1Ref.value?.clearFiles()
  upload2Ref.value?.clearFiles()
  upload3Ref.value?.clearFiles()
  upload4Ref.value?.clearFiles()

  upload1Results.value = []
  upload2Result.value = null
  upload3Results.value = []
  upload4Result.value = null

  ElMessage.success('已清空所有上传')
}

/**
 * 统计并提示当前各示例的上传文件数
 */
const showStatistics = () => {
  const total = upload1Results.value.length +
                (upload2Result.value ? 1 : 0) +
                upload3Results.value.length +
                (upload4Result.value ? 1 : 0)

  ElMessage.info({
    message: `共上传 ${total} 个文件`,
    duration: 3000
  })

  console.log('上传统计：', {
    示例1: upload1Results.value.length,
    示例2: upload2Result.value ? 1 : 0,
    示例3: upload3Results.value.length,
    示例4: upload4Result.value ? 1 : 0,
    总计: total
  })
}
</script>

<style scoped>
.file-upload-enhanced-demo-page {
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
  border-radius: 8px;
}

h3 {
  margin-top: 0;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-alert__description) {
  margin: 0;
}

:deep(.el-alert__description ul) {
  list-style: none;
  padding-left: 0;
}

:deep(.el-alert__description li) {
  line-height: 1.8;
}
</style>
