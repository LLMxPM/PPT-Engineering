/**
 * 文件管理服务
 * 提供与 Vite 文件管理插件交互的客户端 API
 */

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modified: string
}

export interface ListResponse {
  files: FileInfo[]
}

export interface ReadResponse {
  content: string
  path: string
}

export interface WriteResponse {
  success: boolean
  path: string
}

export interface DeleteResponse {
  success: boolean
  path: string
}

export interface UploadResponse {
  success: boolean
  path: string
}

class FileManagerService {
  private baseUrl = '/__file-manager'

  /**
   * 列出目录下的文件
   * @param dirPath 目录路径（相对于项目根目录）
   */
  async listFiles(dirPath: string): Promise<FileInfo[]> {
    const response = await fetch(`${this.baseUrl}/list?path=${encodeURIComponent(dirPath)}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to list files')
    }
    const data: ListResponse = await response.json()
    return data.files
  }

  /**
   * 读取文件内容
   * @param filePath 文件路径（相对于项目根目录）
   */
  async readFile(filePath: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/read?path=${encodeURIComponent(filePath)}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to read file')
    }
    const data: ReadResponse = await response.json()
    return data.content
  }

  /**
   * 写入文件内容
   * @param filePath 文件路径（相对于项目根目录）
   * @param content 文件内容
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: filePath, content })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to write file')
    }
  }

  /**
   * 删除文件
   * @param filePath 文件路径（相对于项目根目录）
   */
  async deleteFile(filePath: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: filePath })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete file')
    }
  }

  /**
   * 上传文件
   * @param filePath 目标文件路径（相对于项目根目录）
   * @param file File 对象或 Blob
   */
  async uploadFile(filePath: string, file: File | Blob): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', filePath)

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload file')
    }
  }

  /**
   * 检查文件管理服务是否可用（仅开发环境）
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/list?path=public/config`)
      return response.ok
    } catch {
      return false
    }
  }
}

// 导出单例
export const fileManagerService = new FileManagerService()
