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
    try {
      const response = await fetch(`${this.baseUrl}/write`, {
        method: 'POST',
        // 使用 keepalive 避免因页面刷新导致请求被浏览器主动中断（仅适用于较小请求体）
        keepalive: true,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: filePath, content })
      })
      if (!response.ok) {
        // 尝试解析错误消息；若解析失败，使用通用错误
        let message = 'Failed to write file'
        try {
          const errObj = await response.json()
          message = errObj.error || message
        } catch {}
        throw new Error(message)
      }
    } catch (err: any) {
      // 在开发环境下，写入 public/config 等文件会触发 Vite 的 HMR 或整页刷新，
      // 可能导致当前写入请求在响应返回前被浏览器中断，出现 net::ERR_ABORTED。
      // 这种情况下文件通常已成功写入，可安全地忽略该异常。
      const msg = String(err?.message || err)
      const isAbort = /AbortError|ERR_ABORTED|The user aborted a request|fetch.*aborted/i.test(msg)
      if (isAbort) {
        console.warn('[FileManagerService] write aborted due to page reload/HMR, assuming success:', msg)
        return
      }
      throw err
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

  /**
   * 创建目录（递归）
   * @param dirPath 目录路径（相对于项目根目录）
   */
  async createDir(dirPath: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/mkdir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: dirPath })
    })
    if (!response.ok) {
      let message = 'Failed to create directory'
      try {
        const errObj = await response.json()
        message = errObj.error || message
      } catch {}
      throw new Error(message)
    }
  }

  /**
   * 删除目录（默认递归）
   * @param dirPath 目录路径（相对于项目根目录）
   * @param recursive 是否递归删除，默认 true
   */
  async deleteDir(dirPath: string, recursive: boolean = true): Promise<void> {
    const response = await fetch(`${this.baseUrl}/rmdir`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: dirPath, recursive })
    })
    if (!response.ok) {
      let message = 'Failed to remove directory'
      try {
        const errObj = await response.json()
        message = errObj.error || message
      } catch {}
      throw new Error(message)
    }
  }
}

// 导出单例
export const fileManagerService = new FileManagerService()
