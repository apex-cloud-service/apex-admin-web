<!--
  增强版文件上传组件
  ------------------------------------------------------------------
  在基础文件上传（FileUpload.vue）之上扩展：
    - 拖拽上传（drag）
    - 粘贴上传（Ctrl+V，enable-paste）
    - 图片裁剪（cropperjs，enable-cropper）
    - 图片压缩（canvas 重绘，enable-compress）
    - 大文件分片上传（enable-chunk，超过单发上限时走 init → 逐片上传 → merge）
    - 自定义上传进度弹窗

  后端接口：
    - POST /api/v1/files/generic - 通用文件上传（FormData：file + sex）
    - POST /api/v1/file/chunk/init|upload|merge - 分片上传（启用 enableChunk 时）
    - GET  /api/v1/file/chunk/status/{fileId} - 查询已上传分片（本组件未调用，断点续传预留，见 api/file.ts）

  Props：
    - sex: 性别路由参数（0=男/AM，1=女/AF），FormData 中映射为 1/2
    - limit: 最大上传数量
    - listType: 上传控件展示形态（text/picture/picture-card）
    - accept: 允许的 MIME 类型（逗号分隔）
    - tip: 提示文本（缺省按 accept 与大小上限自动生成）
    - disabled: 是否禁用
    - drag: 是否启用拖拽区域
    - multiple: 是否允许多选
    - enableCompress: 是否自动压缩图片（超过宽高上限按 compressQuality 压缩）
    - enableCropper: 是否启用图片裁剪（裁剪确认后走独立 XHR 上传）
    - enablePaste: 是否启用 Ctrl+V 粘贴图片上传（document 级监听，页面任意位置粘贴均可触发）
    - enableChunk: 是否启用分片上传（文件超过单发上限但不超过 chunkMaxSizeMB 时生效）
    - chunkMaxSizeMB: 分片上传允许的最大文件大小（MB，默认 500）
    - compressQuality: 压缩质量（0~1）
    - compressMaxWidth / compressMaxHeight: 等比压缩后的宽/高上限（px），同时约束两维且不放大

  Emits：
    - success(result: FileUploadResult): 上传成功，返回存储路径与访问 URL
    - remove(file: UploadUserFile): 从列表移除文件
-->
<template>
  <div 
    class="file-upload-enhanced"
    @paste="handlePaste"
    tabindex="-1"
  >
    <el-upload
      v-model:file-list="fileList"
      :action="uploadUrl"
      :headers="uploadHeaders"
      :data="uploadData"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-remove="handleRemove"
      :on-progress="handleProgress"
      :limit="limit"
      :list-type="listType"
      :accept="accept"
      :disabled="disabled"
      :drag="drag"
      :multiple="multiple"
    >
      <template v-if="drag">
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处 或 <em>点击上传</em>
          <template v-if="enablePaste">
            <br />
            <span style="font-size: 12px; color: var(--el-text-color-secondary)">
              也可以按 Ctrl+V 粘贴上传
            </span>
          </template>
        </div>
      </template>
      <template v-else>
        <el-button v-if="listType === 'text'" type="primary" :icon="Upload" :disabled="disabled">
          点击上传
        </el-button>
        <el-icon v-else><Plus /></el-icon>
      </template>
      
      <template #tip>
        <div class="el-upload__tip">
          {{ tip || `支持 ${acceptText}，大小不超过 ${maxSizeMB}MB` }}
          <template v-if="enableCompress">
            <br />
            <span style="font-size: 12px; color: var(--el-color-success)">
              ✓ 已启用自动压缩
            </span>
          </template>
        </div>
      </template>
    </el-upload>

    <!-- 图片预览对话框 -->
    <el-dialog 
      v-model="previewVisible" 
      title="图片预览" 
      width="80%"
      :append-to-body="true"
    >
      <div class="preview-container">
        <el-image 
          :src="previewUrl" 
          fit="contain"
          style="width: 100%; max-height: 70vh"
          :preview-src-list="[previewUrl]"
          :initial-index="0"
        />
      </div>
    </el-dialog>

    <!-- 图片裁剪对话框 -->
    <el-dialog 
      v-model="cropperVisible" 
      title="图片裁剪" 
      width="800px"
      :append-to-body="true"
      :close-on-click-modal="false"
    >
      <div class="cropper-container">
        <div class="cropper-wrapper">
          <img ref="cropperImageRef" :src="cropperImageSrc" alt="裁剪图片" />
        </div>
      </div>
      <template #footer>
        <el-space>
          <el-button @click="handleCropperCancel">取消</el-button>
          <el-button type="primary" @click="handleCropperConfirm" :loading="cropping">
            确定裁剪
          </el-button>
        </el-space>
      </template>
    </el-dialog>

    <!-- 自定义进度条 -->
    <el-dialog 
      v-model="progressVisible" 
      title="上传进度" 
      width="500px"
      :append-to-body="true"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div class="progress-container">
        <el-progress 
          :percentage="uploadProgress" 
          :status="uploadStatus"
          :stroke-width="20"
        />
        <div class="progress-text">
          {{ uploadProgressText }}
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 增强版文件上传组件逻辑
 * - 基于 el-upload 完成基础上传，扩展压缩/裁剪/粘贴/进度能力
 * - 裁剪与粘贴路径绕过 el-upload，走独立 XHR 上传（uploadProcessedFile）
 * - enableChunk 开启时，超过单发上限的文件走分片上传（uploadByChunks，apex-file-service）
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { Plus, Upload, UploadFilled } from '@element-plus/icons-vue'
import { getToken } from '@/utils/auth'
import { apiUrl } from '@/utils/api-base'
import { MAX_UPLOAD_SIZE } from '@/settings'
import { initChunkUpload, mergeChunks, uploadChunk, type ChunkMergeResult } from '@/api/file'
import { toMultipartUploadSex } from '@/utils/upload-sex'
import { toFileUploadResult } from '@/utils/upload-result'
import type { FileUploadResponse, FileUploadResult } from '@/types'
import type { UploadProps, UploadUserFile, UploadProgressEvent, UploadRawFile } from 'element-plus'
import Cropper from 'cropperjs'
import { showError } from '@/utils/request'
import 'cropperjs/dist/cropper.css'

/** 组件入参定义 */
interface Props {
  /** 性别路由参数（0=男/AM，1=女/AF） */
  sex?: 0 | 1
  /** 最大上传数量 */
  limit?: number
  /** 上传控件展示形态 */
  listType?: 'text' | 'picture' | 'picture-card'
  /** 允许的 MIME 类型（逗号分隔） */
  accept?: string
  /** 自定义提示文本（缺省自动生成） */
  tip?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否启用拖拽区域 */
  drag?: boolean
  /** 是否允许多选 */
  multiple?: boolean
  /** 是否自动压缩图片 */
  enableCompress?: boolean
  /** 是否启用图片裁剪 */
  enableCropper?: boolean
  /** 是否启用 Ctrl+V 粘贴上传 */
  enablePaste?: boolean
  /** 压缩质量（0~1） */
  compressQuality?: number
  /** 等比压缩后的最大宽度（px），与最大高度同时约束 */
  compressMaxWidth?: number
  /** 等比压缩后的最大高度（px），与最大宽度同时约束 */
  compressMaxHeight?: number
  /** 是否启用大文件分片上传（超过单发上限时走 /api/v1/file/chunk 流程） */
  enableChunk?: boolean
  /** 分片上传允许的最大文件大小（MB） */
  chunkMaxSizeMB?: number
}

const props = withDefaults(defineProps<Props>(), {
  sex: 0,
  limit: 1,
  listType: 'picture-card',
  accept: 'image/jpeg,image/png,image/gif,image/webp',
  disabled: false,
  drag: false,
  multiple: false,
  enableCompress: true,
  enableCropper: false,
  enablePaste: false,
  compressQuality: 0.8,
  compressMaxWidth: 1920,
  compressMaxHeight: 1080,
  enableChunk: false,
  chunkMaxSizeMB: 500
})

const emit = defineEmits<{
  (e: 'success', result: FileUploadResult): void
  (e: 'remove', file: UploadUserFile): void
}>()

/** ========== 上传基础状态 ========== */

/** 已上传/待上传的文件列表（与 el-upload 双向绑定） */
const fileList = ref<UploadUserFile[]>([])
/** 上传接口地址（与请求层同源，跨域部署取 VITE_API_BASE_URL） */
const uploadUrl = computed(() => apiUrl('/api/v1/files/generic'))
/** 请求头（自动携带认证 Token） */
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))
/** 额外表单参数（性别路由，供后端按目录归档） */
const uploadData = computed(() => ({
  sex: toMultipartUploadSex(props.sex)
}))

/** 大小上限（MB，用于提示文案与校验提示） */
const maxSizeMB = Math.floor(MAX_UPLOAD_SIZE / 1024 / 1024)
/** accept 转换为可读的扩展名文案（如 JPEG/PNG/GIF/WEBP） */
const acceptText = computed(() => {
  const types = props.accept.split(',').map(type => {
    const ext = type.split('/')[1]
    return ext ? ext.toUpperCase() : type
  })
  return types.join('/')
})

/** ========== 图片预览 ========== */

/** 预览弹窗是否可见 */
const previewVisible = ref(false)
/** 当前预览的图片 URL */
const previewUrl = ref('')

/** ========== 图片裁剪 ========== */

/** 裁剪弹窗是否可见 */
const cropperVisible = ref(false)
/** 裁剪弹窗中的图片 DataURL */
const cropperImageSrc = ref('')
/** 裁剪弹窗中的 img 元素（cropperjs 挂载目标） */
const cropperImageRef = ref<HTMLImageElement>()
/** cropperjs 实例（弹窗关闭时销毁） */
const cropperInstance = ref<Cropper>()
/** 是否正在执行裁剪（确认按钮 loading） */
const cropping = ref(false)
/** 待裁剪的原始文件（裁剪确认后继续上传） */
let pendingFile: File | null = null

/** ========== 上传进度弹窗 ========== */

/** 进度弹窗是否可见 */
const progressVisible = ref(false)
/** 上传进度百分比（0~100） */
const uploadProgress = ref(0)
/** 进度条状态（success/exception/warning） */
const uploadStatus = ref<'' | 'success' | 'exception' | 'warning'>('')
/** 进度文案（如「正在上传... 50%」） */
const uploadProgressText = ref('')

/** ========== 文件处理 ========== */

/**
 * 压缩图片（canvas 重绘）
 *
 * 未启用压缩或非图片时原样返回；按两维限制中较小的缩放比例等比限缩，
 * 不放大原图，再按 compressQuality 导出同类型 File。
 *
 * @param file 原始图片文件
 * @returns 压缩后的文件（失败时 reject）
 */
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!props.enableCompress || !file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        const scale = Math.min(1, props.compressMaxWidth / width, props.compressMaxHeight / height)
        width = Math.max(1, Math.floor(width * scale))
        height = Math.max(1, Math.floor(height * scale))

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法获取 canvas context'))
          return
        }

        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片压缩失败'))
              return
            }
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            
            const originalSize = (file.size / 1024).toFixed(2)
            const compressedSize = (compressedFile.size / 1024).toFixed(2)
            console.log(`图片压缩: ${originalSize}KB → ${compressedSize}KB`)
            
            resolve(compressedFile)
          },
          file.type,
          props.compressQuality
        )
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 打开裁剪对话框（cropperjs 初始化）
 *
 * @param file 待裁剪的图片文件，暂存到 pendingFile，确认后继续上传
 * @returns 裁剪弹窗初始化完成后 resolve（失败时 reject）
 */
const showCropper = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    pendingFile = file
    
    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      cropperImageSrc.value = e.target?.result as string
      cropperVisible.value = true
      
      nextTick(() => {
        if (cropperImageRef.value) {
          cropperInstance.value = new Cropper(cropperImageRef.value, {
            aspectRatio: NaN,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
          })
        }
        resolve()
      })
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 取消裁剪：关闭弹窗、销毁 cropperjs 实例并清空暂存文件
 */
const handleCropperCancel = (): void => {
  cropperVisible.value = false
  if (cropperInstance.value) {
    cropperInstance.value.destroy()
    cropperInstance.value = undefined
  }
  pendingFile = null
}

/**
 * 确认裁剪：导出裁剪区域为 File 后立即上传
 *
 * 流程：getCroppedCanvas → toBlob → 构造 File → 等待 uploadProcessedFile 真实终结。
 * cropping 覆盖裁剪导出与实际 XHR 上传，所有成功/失败分支都在 finally 中结束 loading。
 */
const handleCropperConfirm = async (): Promise<void> => {
  if (!cropperInstance.value || !pendingFile) return
  
  cropping.value = true
  try {
    const canvas = cropperInstance.value.getCroppedCanvas()
    const blob = await new Promise<Blob | null>((resolve) => {
      // 裁剪导出质量固定 0.9（不走 compressQuality：裁剪产物直接上传，不再二次压缩）
      canvas.toBlob(resolve, pendingFile!.type, 0.9)
    })
    
    if (!blob) {
      throw new Error('裁剪失败')
    }
    
    const croppedFile = new File([blob], pendingFile.name, {
      type: pendingFile.type,
      lastModified: Date.now()
    })
    
    cropperVisible.value = false
    if (cropperInstance.value) {
      cropperInstance.value.destroy()
      cropperInstance.value = undefined
    }
    
    await uploadProcessedFile(croppedFile)
  } catch (error) {
    console.error('裁剪失败：', error)
    showError(error, '裁剪失败')
  } finally {
    cropping.value = false
    pendingFile = null
  }
}

/** ========== 上传执行 ========== */

/**
 * 独立 XHR 上传（裁剪/粘贴路径使用）
 *
 * el-upload 之外的上传通道：手动构造 FormData（file + sex），
 * 通过 XMLHttpRequest 上报真实进度并驱动进度弹窗，
 * 响应按 Result{code,msg,data} 解包，code=0 时 emit success。
 *
 * @param file 处理完成（压缩/裁剪后）的待上传文件
 * @returns HTTP 2xx 且 code=0 后兑现；启动、解析、网络、超时和取消错误均拒绝，由调用方提示
 */
const uploadProcessedFile = async (file: File): Promise<void> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('sex', toMultipartUploadSex(props.sex))

  progressVisible.value = true
  uploadProgress.value = 0
  uploadStatus.value = ''
  uploadProgressText.value = '正在上传...'

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const fail = (error: unknown): void => {
      if (settled) return
      settled = true
      uploadStatus.value = 'exception'
      uploadProgressText.value = error instanceof Error ? error.message : '上传失败'
      setTimeout(() => {
        progressVisible.value = false
      }, 2000)
      reject(error)
    }

    try {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable && e.total > 0) {
          uploadProgress.value = Math.round((e.loaded / e.total) * 100)
          uploadProgressText.value = `正在上传... ${uploadProgress.value}%`
        }
      })
      xhr.addEventListener('load', () => {
        if (settled) return
        try {
          if (xhr.status < 200 || xhr.status >= 300) throw new Error(`上传失败（HTTP ${xhr.status}）`)
          const response = JSON.parse(xhr.responseText) as { code: number; msg?: string; data?: FileUploadResponse }
          if (!response || response.code !== 0 || !response.data) {
            throw new Error(response?.msg || '上传失败')
          }
          const result = toFileUploadResult(response.data)
          settled = true
          uploadStatus.value = 'success'
          uploadProgress.value = 100
          uploadProgressText.value = '上传成功！'
          setTimeout(() => {
            progressVisible.value = false
          }, 1000)
          resolve()
          emit('success', result)
          ElMessage.success('上传成功')
        } catch (error) {
          fail(error)
        }
      })
      xhr.addEventListener('error', () => fail(new Error('上传网络错误')))
      xhr.addEventListener('timeout', () => fail(new Error('上传超时')))
      xhr.addEventListener('abort', () => fail(new Error('上传已取消')))
      xhr.open('POST', uploadUrl.value)
      xhr.timeout = 30000
      xhr.setRequestHeader('Authorization', uploadHeaders.value.Authorization)
      xhr.send(formData)
    } catch (error) {
      fail(error)
    }
  })
}

/**
 * 分片上传（超过单发上限且 enableChunk 开启时启用）
 *
 * 流程：init 登记 → 按分片顺序 POST 原始字节（服务端 uploaded=false 表示已存在可跳过）
 * → merge 合并。进度按「已完成分片 / 总分片」折算。
 *
 * @param file 待上传的大文件
 */
const uploadByChunks = async (file: File): Promise<void> => {
  // 单片 5MB，随 init 请求上送 chunkSize，后端按该值做分片校验与合并
  const CHUNK_SIZE = 5 * 1024 * 1024
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  progressVisible.value = true
  uploadStatus.value = ''
  uploadProgress.value = 0
  uploadProgressText.value = '正在初始化分片上传...'

  try {
    const initResult = await initChunkUpload({
      fileName: file.name,
      fileSize: file.size,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      contentType: file.type || undefined,
    })

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const chunk = file.slice(chunkIndex * CHUNK_SIZE, Math.min((chunkIndex + 1) * CHUNK_SIZE, file.size))
      await uploadChunk(
        { fileId: initResult.fileId, chunkIndex, totalChunks },
        chunk,
      )
      uploadProgress.value = Math.round(((chunkIndex + 1) / totalChunks) * 100)
      uploadProgressText.value = `正在上传分片 ${chunkIndex + 1}/${totalChunks}...`
    }

    uploadProgressText.value = '正在合并分片...'
    const merged: ChunkMergeResult = await mergeChunks({ fileId: initResult.fileId })

    uploadStatus.value = 'success'
    uploadProgressText.value = '上传成功！'
    setTimeout(() => {
      progressVisible.value = false
    }, 1000)
    ElMessage.success('上传成功')

    // 与 handleSuccess 对齐：分片结果映射为 FileUploadResult（Local 存储地址无预签名 TTL）
    emit('success', {
      bucketName: merged.bucketName,
      objectName: merged.fileName,
      url: merged.url,
      expiresIn: 0,
    })
  } catch (error) {
    console.error('分片上传失败：', error)
    uploadStatus.value = 'exception'
    uploadProgressText.value = '上传失败'
    setTimeout(() => {
      progressVisible.value = false
      showError(error, '分片上传失败')
    }, 2000)
  }
}

/** ========== el-upload 回调 ========== */

/**
 * 上传前校验与预处理（el-upload before-upload）
 *
 * 顺序固定为：MIME 校验 → 图片压缩（enableCompress）→ 按处理后文件判断大小
 * → 超限且 enableChunk 走分片（返回 false 中断 el-upload 默认通道）
 * → 图片裁剪（enableCropper，返回 false 后由裁剪确认走独立 XHR）。
 *
 * 分片分支之前已完成 MIME 与可选压缩，因此不会再绕过这两步；
 * 裁剪在分片之后判断，超限文件优先走分片而不进入裁剪。
 *
 * @param rawFile 待上传的原始文件
 * @returns false=中断 el-upload 默认通道（拒绝、裁剪或已启动分片）；File=处理后继续默认上传
 */
const beforeUpload: UploadProps['beforeUpload'] = async (rawFile: UploadRawFile): Promise<boolean | File> => {
  const allowedTypes = props.accept.split(',').map(t => t.trim())
  if (!allowedTypes.includes(rawFile.type)) {
    ElMessage.error(`仅支持上传 ${acceptText.value} 格式的文件`)
    return false
  }

  try {
    let processedFile: File = rawFile

    if (props.enableCompress && rawFile.type.startsWith('image/')) {
      processedFile = await compressImage(rawFile)
    }

    // 大小以处理后的文件为准：压缩后可能已低于单发上限
    if (processedFile.size > MAX_UPLOAD_SIZE) {
      if (props.enableChunk && processedFile.size <= props.chunkMaxSizeMB * 1024 * 1024) {
        void uploadByChunks(processedFile)
        return false
      }
      ElMessage.error(`文件大小不能超过 ${maxSizeMB} MB`)
      return false
    }

    if (props.enableCropper && processedFile.type.startsWith('image/')) {
      await showCropper(processedFile)
      return false
    }

    return processedFile
  } catch (error) {
    console.error('文件处理失败：', error)
    showError(error, '文件处理失败')
    return false
  }
}

/**
 * 判断某个文件是否走裁剪通道（而非 el-upload 默认通道）。
 * 裁剪仅在 enabled 且为图片时生效；非图片仍走默认通道，必须 emit success。
 */
function isCropperChannel(file?: File | null): boolean {
  return props.enableCropper && (file?.type.startsWith('image/') ?? false)
}

/**
 * 上传进度回调（el-upload 路径）
 *
 * Element Plus 的 onProgress 签名为 (event, uploadFile)：raw 在第二个参数的 uploadFile 上。
 * 仅在本文件未进入裁剪通道时驱动进度弹窗，避免与 uploadProcessedFile 重复弹窗。
 *
 * @param event 进度事件（percent 为 0~100）
 * @param uploadFile 当前上传的文件项（含 raw 原始文件）
 */
const handleProgress: UploadProps['onProgress'] = (event: UploadProgressEvent, uploadFile?: UploadUserFile): void => {
  if (!isCropperChannel(uploadFile?.raw)) {
    progressVisible.value = true
    uploadProgress.value = Math.round(event.percent || 0)
    uploadStatus.value = ''
    uploadProgressText.value = `正在上传... ${uploadProgress.value}%`
  }
}

/**
 * 上传成功回调（el-upload 路径）
 *
 * 按 Result{code,msg,data} 解包：code=0 时更新列表预览 URL 并 emit success；
 * 失败时提示并从列表中移除对应文件。仅裁剪通道（图片 + 已启用裁剪）跳过，
 * 非图片仍走默认通道并必须 emit success。
 *
 * @param response 后端原始响应（未解包的 Result 结构）
 * @param uploadFile 触发本次上传的文件项
 */
const handleSuccess: UploadProps['onSuccess'] = (response, uploadFile: UploadUserFile): void => {
  // 后端响应为 Result{code,msg,data}，此处按契约收紧类型
  const payload = response as { code: number; msg?: string; data: FileUploadResponse }
  if (!isCropperChannel(uploadFile?.raw)) {
    if (payload.code === 0) {
      uploadStatus.value = 'success'
      uploadProgressText.value = '上传成功！'
      setTimeout(() => {
        progressVisible.value = false
      }, 1000)
      
      const result = toFileUploadResult(payload.data)
      ElMessage.success('上传成功')
      
      if (uploadFile && result.url) {
        uploadFile.url = result.url
      }
      
      emit('success', result)
    } else {
      uploadStatus.value = 'exception'
      uploadProgressText.value = response.msg || '上传失败'
      setTimeout(() => {
        progressVisible.value = false
      }, 2000)
      
      ElMessage.error(payload.msg || '上传失败')
      const index = fileList.value.findIndex(f => f.uid === uploadFile.uid)
      if (index > -1) {
        fileList.value.splice(index, 1)
      }
    }
  }
}

/**
 * 上传失败回调（el-upload 路径）：更新进度弹窗为异常态并提示重试
 *
 * @param error 上传错误对象
 */
const handleError: UploadProps['onError'] = (error: Error): void => {
  console.error('上传失败：', error)
  
  uploadStatus.value = 'exception'
  uploadProgressText.value = '上传失败'
  setTimeout(() => {
    progressVisible.value = false
  }, 2000)
  
  ElMessage.error('上传失败，请重试')
}

/**
 * 移除文件回调：向父组件同步移除事件
 *
 * @param file 被移除的文件项
 */
const handleRemove: UploadProps['onRemove'] = (file: UploadUserFile): void => {
  emit('remove', file)
}

/** ========== 粘贴上传 ========== */

/**
 * 粘贴上传处理（根元素与 document 级监听共用：enablePaste 开启后页面任意位置粘贴均可触发）
 *
 * 从剪贴板提取图片文件，复用 beforeUpload 校验/压缩流程；
 * 未启用裁剪时直接走独立上传通道。
 *
 * @param e 粘贴事件
 */
const handlePaste = async (e: ClipboardEvent): Promise<void> => {
  if (!props.enablePaste || props.disabled || e.defaultPrevented) return
  
  const items = e.clipboardData?.items
  if (!items) return
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        
        const result = await beforeUpload(file as UploadRawFile)
        // 单个文件被拒（类型/大小/已转分片）不应跳过其余剪贴板项
        if (result === false) continue
        
        const processedFile = result instanceof File ? result : file
        
        if (!props.enableCropper) {
          try {
            await uploadProcessedFile(processedFile)
          } catch (error) {
            showError(error, '粘贴上传失败')
          }
        }
      }
    }
  }
}

/** ========== 对外方法与生命周期 ========== */

/**
 * 清空已上传文件列表（供父组件通过 ref 调用）
 */
const clearFiles = (): void => {
  fileList.value = []
}

/**
 * 获取当前文件列表（供父组件通过 ref 调用）
 * @returns 当前文件列表（含已上传文件）
 */
const getFileList = (): UploadUserFile[] => {
  return fileList.value
}

/**
 * document 级 paste 事件适配器（保留引用以便卸载时移除监听）
 * @param evt 原生粘贴事件
 */
const pasteHandler = (evt: Event): void => {
  void handlePaste(evt as ClipboardEvent)
}

// 挂载后注册 document 级粘贴监听（未启用粘贴上传时不注册）
onMounted(() => {
  if (props.enablePaste) {
    document.addEventListener('paste', pasteHandler)
  }
})

// 卸载时移除粘贴监听并销毁 cropperjs 实例，避免内存泄漏
onUnmounted(() => {
  if (props.enablePaste) {
    document.removeEventListener('paste', pasteHandler)
  }
  if (cropperInstance.value) {
    cropperInstance.value.destroy()
  }
})

defineExpose({
  clearFiles,
  getFileList
})
</script>

<style scoped>
.file-upload-enhanced {
  outline: none;
}

.el-upload__tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 8px;
  line-height: 1.5;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.cropper-container {
  width: 100%;
}

.cropper-wrapper {
  width: 100%;
  height: 500px;
  overflow: hidden;
}

.cropper-wrapper img {
  max-width: 100%;
}

.progress-container {
  padding: 20px;
}

.progress-text {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

:deep(.el-upload-dragger) {
  padding: 40px;
}

:deep(.el-icon--upload) {
  font-size: 67px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 16px;
}

:deep(.el-upload__text) {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

:deep(.el-upload__text em) {
  color: var(--el-color-primary);
  font-style: normal;
}
</style>
