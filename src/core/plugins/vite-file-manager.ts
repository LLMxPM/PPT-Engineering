import type { Plugin, ViteDevServer } from 'vite'
import { readFileSync, writeFileSync, unlinkSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs'
import { join, relative, extname } from 'path'
import { parse as parseMultipart } from 'parse-multipart-data'

interface FileManagerOptions {
  // 允许操作的目录配置
  allowedDirs: {
    path: string
    read: boolean
    write: boolean
    delete: boolean
    upload: boolean
  }[]
}

/**
 * Vite 文件管理插件
 * 提供开发环境下的文件读写 API
 */
export default function viteFileManager(options?: Partial<FileManagerOptions>): Plugin {
  const defaultOptions: FileManagerOptions = {
    allowedDirs: [
      {
        path: 'public/config',
        read: true,
        write: true,
        delete: false,
        upload: false
      },
      {
        path: 'public/img',
        read: true,
        write: true,
        delete: true,
        upload: true
      },
      {
        path: 'src/views',
        read: true,
        write: true,
        delete: true,
        upload: true
      }
    ]
  }

  const config = { ...defaultOptions, ...options }
  let rootDir = ''

  return {
    name: 'vite-file-manager',
    apply: 'serve', // 仅在开发环境启用

    configResolved(resolvedConfig) {
      rootDir = resolvedConfig.root
    },

    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        // API 路由前缀
        if (!url.startsWith('/__file-manager')) {
          return next()
        }

        // 设置 CORS 头
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        try {
          // 路由处理
          if (url.startsWith('/__file-manager/list')) {
            await handleList(req, res, rootDir, config)
          } else if (url.startsWith('/__file-manager/read')) {
            await handleRead(req, res, rootDir, config)
          } else if (url.startsWith('/__file-manager/write')) {
            await handleWrite(req, res, rootDir, config)
          } else if (url.startsWith('/__file-manager/delete')) {
            await handleDelete(req, res, rootDir, config)
          } else if (url.startsWith('/__file-manager/upload')) {
            await handleUpload(req, res, rootDir, config)
          } else {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'API endpoint not found' }))
          }
        } catch (error: any) {
          console.error('File manager error:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: error.message }))
        }
      })
    }
  }
}

// 验证路径是否在允许的目录中
function validatePath(filePath: string, rootDir: string, config: FileManagerOptions, operation: 'read' | 'write' | 'delete' | 'upload'): string | null {
  const normalizedPath = filePath.replace(/\\/g, '/')
  
  for (const dir of config.allowedDirs) {
    const allowedPath = dir.path.replace(/\\/g, '/')
    if (normalizedPath.startsWith(allowedPath) && dir[operation]) {
      return join(rootDir, filePath)
    }
  }
  
  return null
}

// 列出目录文件
async function handleList(req: any, res: any, rootDir: string, config: FileManagerOptions) {
  const url = new URL(req.url!, `http://${req.headers.host}`)
  const dirPath = url.searchParams.get('path') || ''
  
  const fullPath = validatePath(dirPath, rootDir, config, 'read')
  if (!fullPath) {
    res.statusCode = 403
    res.end(JSON.stringify({ error: 'Access denied' }))
    return
  }

  if (!existsSync(fullPath)) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Directory not found' }))
    return
  }

  const files = readdirSync(fullPath).map(name => {
    const filePath = join(fullPath, name)
    const stats = statSync(filePath)
    return {
      name,
      path: relative(rootDir, filePath).replace(/\\/g, '/'),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      modified: stats.mtime.toISOString()
    }
  })

  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ files }))
}

// 读取文件
async function handleRead(req: any, res: any, rootDir: string, config: FileManagerOptions) {
  const url = new URL(req.url!, `http://${req.headers.host}`)
  const filePath = url.searchParams.get('path') || ''
  
  const fullPath = validatePath(filePath, rootDir, config, 'read')
  if (!fullPath) {
    res.statusCode = 403
    res.end(JSON.stringify({ error: 'Access denied' }))
    return
  }

  if (!existsSync(fullPath)) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'File not found' }))
    return
  }

  const content = readFileSync(fullPath, 'utf-8')
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ content, path: filePath }))
}

// 写入文件
async function handleWrite(req: any, res: any, rootDir: string, config: FileManagerOptions) {
  let body = ''
  req.on('data', (chunk: Buffer) => {
    body += chunk.toString()
  })

  req.on('end', () => {
    try {
      const { path: filePath, content } = JSON.parse(body)
      
      const fullPath = validatePath(filePath, rootDir, config, 'write')
      if (!fullPath) {
        res.statusCode = 403
        res.end(JSON.stringify({ error: 'Access denied' }))
        return
      }

      // 确保目录存在
      const dir = join(fullPath, '..')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(fullPath, content, 'utf-8')
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true, path: filePath }))
    } catch (error: any) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: error.message }))
    }
  })
}

// 删除文件
async function handleDelete(req: any, res: any, rootDir: string, config: FileManagerOptions) {
  let body = ''
  req.on('data', (chunk: Buffer) => {
    body += chunk.toString()
  })

  req.on('end', () => {
    try {
      const { path: filePath } = JSON.parse(body)
      
      const fullPath = validatePath(filePath, rootDir, config, 'delete')
      if (!fullPath) {
        res.statusCode = 403
        res.end(JSON.stringify({ error: 'Access denied' }))
        return
      }

      if (!existsSync(fullPath)) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'File not found' }))
        return
      }

      unlinkSync(fullPath)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true, path: filePath }))
    } catch (error: any) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: error.message }))
    }
  })
}

// 上传文件
async function handleUpload(req: any, res: any, rootDir: string, config: FileManagerOptions) {
  const chunks: Buffer[] = []
  
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk)
  })

  req.on('end', () => {
    try {
      const buffer = Buffer.concat(chunks)
      const contentType = req.headers['content-type'] || ''
      const boundary = contentType.split('boundary=')[1]
      
      if (!boundary) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Invalid multipart request' }))
        return
      }

      const parts = parseMultipart(buffer, boundary)
      
      if (!parts || parts.length === 0) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'No file uploaded' }))
        return
      }

      const filePart = parts.find(p => p.name === 'file')
      const pathPart = parts.find(p => p.name === 'path')
      
      if (!filePart || !pathPart) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Missing file or path' }))
        return
      }

      const targetPath = pathPart.data.toString('utf-8')
      const fullPath = validatePath(targetPath, rootDir, config, 'upload')
      
      if (!fullPath) {
        res.statusCode = 403
        res.end(JSON.stringify({ error: 'Access denied' }))
        return
      }

      // 确保目录存在
      const dir = join(fullPath, '..')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(fullPath, filePart.data)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true, path: targetPath }))
    } catch (error: any) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: error.message }))
    }
  })
}
