import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ReferenceFile } from '../types/exam'

export function useExamUpload() {
  const referenceFiles = ref<ReferenceFile[]>([])

  async function handleFileUpload(uploadFile: any) {
    const rawFile = uploadFile.raw || uploadFile
    if (!rawFile) return
    
    try {
      // 添加到本地列表
      referenceFiles.value.push({
        id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: rawFile.name,
        size: rawFile.size,
        type: rawFile.type,
        file: rawFile
      })
      
      // 这里可以添加文件上传到服务器的逻辑
      // 暂时使用本地逻辑作为备份
    } catch (error) {
      console.error('文件上传错误:', error)
      ElMessage.error('文件上传失败，请重试')
    }
  }

  function removeReferenceFile(fileId: string) {
    referenceFiles.value = referenceFiles.value.filter(f => f.id !== fileId)
  }

  function getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📄'
    if (['doc', 'docx'].includes(ext || '')) return '📝'
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) return '🖼️'
    return '📎'
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return {
    referenceFiles,
    handleFileUpload,
    removeReferenceFile,
    getFileIcon,
    formatFileSize
  }
}
