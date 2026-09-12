<!--
  文件上传组件（增强版）- TypeScript 修复版
  ------------------------------------------------------------------
  修复内容：
  1. 严格的 TypeScript 类型定义
  2. 修复 emit 事件类型
  3. 修复 ref 类型定义
  4. 修复事件处理函数参数类型
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Upload, UploadFilled } from '@element-plus/icons-vue'
import { getToken } from '@/utils/auth'
import { MAX_UPLOAD_SIZE } from '@/settings'
import type { FileUploadResult } from '@/types'
import type { UploadProps, UploadUserFile, UploadProgressEvent, UploadRawFile } from 'element-plus'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

interface Props {
  sex?: 0 | 1
  limit?: number
  listType?: 'text' | 'picture' | 'picture-card'
  accept?: string
  tip?: string
  disabled?: boolean
  drag?: boolean
  multiple?: boolean
  enableCompress?: boolean
  enableCropper?: boolean
  enablePaste?: boolean
  compressQuality?: number
  compressMaxWidth?: number
  compressMaxHeight?: number
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
  compressMaxHeight: 1080
})

const emit = defineEmits<{
  (e: 'success', result: FileUploadResult): void
  (e: 'remove', file: UploadUserFile): void
}>()

const fileList = ref<UploadUserFile[]>([])
const uploadUrl = computed(() => '/api/v1/files/generic')
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`
}))
const uploadData = computed(() => ({
  sex: props.sex
}))

const maxSizeMB = Math.floor(MAX_UPLOAD_SIZE / 1024 / 1024)
const acceptText = computed(() => {
  const types = props.accept.split(',').map(type => {
    const ext = type.split('/')[1]
    return ext ? ext.toUpperCase() : type
  })
  return types.join('/')
})

const previewVisible = ref(false)
const previewUrl = ref('')

const cropperVisible = ref(false)
const cropperImageSrc = ref('')
const cropperImageRef = ref<HTMLImageElement>()
const cropperInstance = ref<Cropper>()
const cropping = ref(false)
let pendingFile: File | null = null

const progressVisible = ref(false)
const uploadProgress = ref(0)
const uploadStatus = ref<'' | 'success' | 'exception' | 'warning'>('')
const uploadProgressText = ref('')

/**
 * 压缩图片
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

        if (width > props.compressMaxWidth || height > props.compressMaxHeight) {
          if (width > height) {
            if (width > props.compressMaxWidth) {
              height = height * (props.compressMaxWidth / width)
              width = props.compressMaxWidth
            }
          } else {
            if (height > props.compressMaxHeight) {
              width = width * (props.compressMaxHeight / height)
              height = props.compressMaxHeight
            }
          }
        }

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
 * 显示裁剪对话框
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
 * 取消裁剪
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
 * 确认裁剪
 */
const handleCropperConfirm = async (): Promise<void> => {
  if (!cropperInstance.value || !pendingFile) return
  
  cropping.value = true
  try {
    const canvas = cropperInstance.value.getCroppedCanvas()
    const blob = await new Promise<Blob | null>((resolve) => {
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
    ElMessage.error('裁剪失败')
  } finally {
    cropping.value = false
    pendingFile = null
  }
}

/**
 * 上传处理后的文件
 */
const uploadProcessedFile = async (file: File): Promise<void> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('sex', String(props.sex))
  
  progressVisible.value = true
  uploadProgress.value = 0
  uploadStatus.value = ''
  uploadProgressText.value = '正在上传...'
  
  try {
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
      if (e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100)
        uploadProgressText.value = `正在上传... ${uploadProgress.value}%`
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        if (response.code === 0) {
          uploadStatus.value = 'success'
          uploadProgressText.value = '上传成功！'
          setTimeout(() => {
            progressVisible.value = false
            emit('success', response.data)
            ElMessage.success('上传成功')
          }, 1000)
        } else {
          uploadStatus.value = 'exception'
          uploadProgressText.value = response.msg || '上传失败'
          setTimeout(() => {
            progressVisible.value = false
            ElMessage.error(response.msg || '上传失败')
          }, 2000)
        }
      } else {
        uploadStatus.value = 'exception'
        uploadProgressText.value = '上传失败'
        setTimeout(() => {
          progressVisible.value = false
          ElMessage.error('上传失败')
        }, 2000)
      }
    })
    
    xhr.addEventListener('error', () => {
      uploadStatus.value = 'exception'
      uploadProgressText.value = '上传失败'
      setTimeout(() => {
        progressVisible.value = false
        ElMessage.error('上传失败')
      }, 2000)
    })
    
    xhr.open('POST', uploadUrl.value)
    xhr.setRequestHeader('Authorization', uploadHeaders.value.Authorization)
    xhr.send(formData)
  } catch (error) {
    console.error('上传失败：', error)
    uploadStatus.value = 'exception'
    uploadProgressText.value = '上传失败'
    setTimeout(() => {
      progressVisible.value = false
      ElMessage.error('上传失败')
    }, 2000)
  }
}

/**
 * 上传前校验和处理
 */
const beforeUpload: UploadProps['beforeUpload'] = async (rawFile: UploadRawFile): Promise<boolean | File> => {
  if (rawFile.size > MAX_UPLOAD_SIZE) {
    ElMessage.error(`文件大小不能超过 ${maxSizeMB} MB`)
    return false
  }
  
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
    
    if (props.enableCropper && rawFile.type.startsWith('image/')) {
      await showCropper(processedFile)
      return false
    }
    
    return processedFile
  } catch (error) {
    console.error('文件处理失败：', error)
    ElMessage.error('文件处理失败')
    return false
  }
}

/**
 * 上传进度
 */
const handleProgress: UploadProps['onProgress'] = (event: UploadProgressEvent): void => {
  if (!props.enableCropper) {
    progressVisible.value = true
    uploadProgress.value = Math.round(event.percent || 0)
    uploadStatus.value = ''
    uploadProgressText.value = `正在上传... ${uploadProgress.value}%`
  }
}

/**
 * 上传成功
 */
const handleSuccess: UploadProps['onSuccess'] = (response: any, uploadFile: UploadUserFile): void => {
  if (!props.enableCropper) {
    if (response.code === 0) {
      uploadStatus.value = 'success'
      uploadProgressText.value = '上传成功！'
      setTimeout(() => {
        progressVisible.value = false
      }, 1000)
      
      const result: FileUploadResult = response.data
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
      
      ElMessage.error(response.msg || '上传失败')
      const index = fileList.value.findIndex(f => f.uid === uploadFile.uid)
      if (index > -1) {
        fileList.value.splice(index, 1)
      }
    }
  }
}

/**
 * 上传失败
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
 * 删除文件
 */
const handleRemove: UploadProps['onRemove'] = (file: UploadUserFile): void => {
  emit('remove', file)
}

/**
 * 粘贴上传
 */
const handlePaste = async (e: ClipboardEvent): Promise<void> => {
  if (!props.enablePaste) return
  
  const items = e.clipboardData?.items
  if (!items) return
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        
        const result = await beforeUpload(file as UploadRawFile)
        if (result === false) return
        
        const processedFile = result instanceof File ? result : file
        
        if (!props.enableCropper) {
          await uploadProcessedFile(processedFile)
        }
      }
    }
  }
}

/**
 * 清空文件列表
 */
const clearFiles = (): void => {
  fileList.value = []
}

/**
 * 获取已上传文件列表
 */
const getFileList = (): UploadUserFile[] => {
  return fileList.value
}

const pasteHandler = (evt: Event): void => {
  void handlePaste(evt as ClipboardEvent)
}

onMounted(() => {
  if (props.enablePaste) {
    document.addEventListener('paste', pasteHandler)
  }
})

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
