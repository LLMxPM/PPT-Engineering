/**
 * 文件用途：主题系统 Composable，提供从配置文件加载主题并计算样式变量。
 * 本版本移除全局主题切换能力，仅按照配置文件的默认主题或调用方指定主题使用。
 */
import { computed, ref, watch, type ComputedRef, type CSSProperties } from 'vue'
import { parse } from 'yaml'

/**
 * 主题配色系统
 * 
 * 该系统支持从 themes.yaml 配置文件动态加载主题配置，
 * 不再依赖硬编码的主题类型定义，提供更好的扩展性。
 * 
 * 使用方式：
 * 1. 在 themes.config.yaml 中定义新的主题配置
 * 2. 调用 loadThemeConfigs() 加载配置
 * 3. 使用 getAvailableThemes() 获取可用主题列表
 * 4. 使用 isValidTheme() 验证主题有效性
 */

/**
 * 自定义配色方案类型定义
 * 动态从配置文件中获取可用的主题类型
 */
export type CustomTheme = string

/**
 * 可用主题键名缓存
 */
const availableThemes = ref<string[]>(['white']) // 默认包含白色主题作为后备

/**
 * 调色板配置接口 - 根据themes.config.yaml的最新格式
 */
export interface PaletteConfig {
  text: {
    primary: string
    secondary: string
    invert: string
  }
  background: {
    default: string
    invert: string
  }
  border: {
    default: string
    subtle: string
  }
  link: {
    default: string
    hover: string
    visited: string
  }
  accent: string[]
}

/**
 * 字体排印配置接口
 */
export interface TypographyConfig {
  headingfont: string
  bodyfont: string
  codefont: string
  baseFontSize: string
}

/**
 * 主题配色配置接口 - 根据themes.config.yaml的最新格式
 */
export interface ThemeConfig {
  name: string
  description: string
  logo?: string
  invertLogo?: string // 反色Logo图片路径
  palette: PaletteConfig
  typography: TypographyConfig
}

/**
 * 主题样式变量接口
 */
export interface ThemeStyles extends CSSProperties {
  // 文本色变量
  '--theme-text-primary': string
  '--theme-text-secondary': string
  '--theme-text-invert': string
  
  // 背景色变量
  '--theme-bg-default': string
  '--theme-bg-invert': string
  
  // 边框色变量
  '--theme-border-default': string
  '--theme-border-subtle': string
  
  // 链接色变量
  '--theme-link-default': string
  '--theme-link-hover': string
  '--theme-link-visited': string
  
  // 字体变量
  '--theme-font-heading': string
  '--theme-font-body': string
  '--theme-font-code': string
  '--theme-font-size-base': string
  
  // 强调色变量（动态生成）
  [key: `--theme-accent-${number}`]: string
}

/**
 * 主题配置文件结构接口
 */
interface ThemeConfigFile {
  themes: Record<string, ThemeConfig>
  default: {
    theme: string
  }
}

// 主题配置缓存
const themeConfigs = ref<Record<string, ThemeConfig> | null>(null)
const defaultTheme = ref<string>('white')

/**
 * 加载主题配置
 */
export async function loadThemeConfigs(): Promise<void> {
  try {
    const basePath = import.meta.env.BASE_URL || '/'
    const configUrl = `${basePath}config/themes.config.yaml`.replace(/\/+/g, '/')
    
    const response = await fetch(configUrl)
    if (!response.ok) {
      throw new Error(`Failed to load themes config: ${response.statusText}`)
    }
    
    const yamlText = await response.text()
    const config = parse(yamlText) as ThemeConfigFile
    
    themeConfigs.value = config.themes
    defaultTheme.value = config.default.theme
    // 更新可用主题列表
    availableThemes.value = Object.keys(config.themes)
  } catch (error) {
    console.error('Failed to load theme configs:', error)
    // 使用默认的白色主题作为后备
    themeConfigs.value = {
      white: {
        name: '白色经典',
        description: '纯净白色，简约经典',
        logo: '/img/logo/ppt-e.png',
        palette: {
          text: {
            primary: '#4f46e5',
            secondary: '#10b981',
            invert: '#9ca3af'
          },
          background: {
            default: '#ffffff',
            invert: '#f9fafb'
          },
          border: {
            default: '#e5e7eb',
            subtle: '#d1d5db'
          },
          link: {
            default: '#3b82f6',
            hover: '#2563eb',
            visited: '#7c3aed'
          },
          accent: ['#6366f1', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa']
        },
        typography: {
          headingfont: 'Noto Sans SC',
          bodyfont: 'Noto Sans SC',
          codefont: 'Fira Code',
          baseFontSize: '16px'
        }
      }
    }
    availableThemes.value = ['white']
    defaultTheme.value = 'white'
  }
}

/**
 * 验证主题是否有效
 * @param theme 要验证的主题名称
 * @returns 主题是否在可用列表中
 */
export function isValidTheme(theme: string): boolean {
  return availableThemes.value.includes(theme)
}

/**
 * 获取可用的主题列表
 * @returns 可用主题键名数组
 */
export function getAvailableThemes(): string[] {
  return availableThemes.value
}

/**
 * 获取默认主题
 * @returns 配置文件中的默认主题
 */
export function getDefaultTheme(): string {
  return defaultTheme.value
}

/**
 * 获取所有主题配置
 * @returns 所有主题配置对象
 */
export function getThemeConfigs(): Record<string, ThemeConfig> | null {
  return themeConfigs.value
}

/**
 * 重新加载主题配置
 */
export async function reloadThemeConfigs(): Promise<void> {
  // 直接重新加载，不使用缓存
  await loadThemeConfigs()
}

/**
 * 主题配色系统 Composable
 * 提供主题配置和样式变量的计算逻辑
 * 
 * @param theme 可选的主题参数，如果不传入则自动使用全局主题
 */
export function useTheme(theme?: string | ComputedRef<string>) {
  /**
   * 函数用途：提供当前主题的配置与样式变量。
   * 逻辑说明：不再依赖全局主题状态；若未显式传入主题，使用配置文件中的默认主题。
   */
  // 确保主题配置已加载
  if (!themeConfigs.value) {
    loadThemeConfigs()
  }

  /**
   * 计算当前使用的主题名称
   * 优先级：传入的主题参数 > 默认主题
   */
  const resolvedTheme = computed(() => {
    if (theme) {
      return typeof theme === 'string' ? theme : theme.value
    }
    return getDefaultTheme()
  })

  /**
   * 计算主题配置
   */
  const themeConfig = computed(() => {
    const currentTheme = resolvedTheme.value
    const configs = themeConfigs.value
    
    if (!configs) {
      // 如果配置未加载，返回默认白色主题配置
      return undefined
    }
    
    // 确保主题配置存在，如果不存在则使用默认的白色主题
    return configs[currentTheme] || configs['white']
  })

  /**
   * 计算主题样式类名
   */
  const themeClass = computed(() => {
    const currentTheme = resolvedTheme.value
    const configs = themeConfigs.value
    if (!configs) return 'theme-white'
    const validTheme = configs[currentTheme] ? currentTheme : 'white'
    return `theme-${validTheme}`
  })

  /**
   * 计算主题样式变量
   */
  const themeStyles = computed((): ThemeStyles => {
    const config = themeConfig.value
    if (!config) {
      return {} as ThemeStyles
    }
    
    const styles: ThemeStyles = {
      // 文本色变量
      '--theme-text-primary': config.palette.text.primary,
      '--theme-text-secondary': config.palette.text.secondary,
      '--theme-text-invert': config.palette.text.invert,
      
      // 背景色变量
      '--theme-bg-default': config.palette.background.default,
      '--theme-bg-invert': config.palette.background.invert,
      
      // 边框色变量
      '--theme-border-default': config.palette.border.default,
      '--theme-border-subtle': config.palette.border.subtle,
      
      // 链接色变量
      '--theme-link-default': config.palette.link.default,
      '--theme-link-hover': config.palette.link.hover,
      '--theme-link-visited': config.palette.link.visited,
      
      // 字体变量
      '--theme-font-heading': config.typography.headingfont,
      '--theme-font-body': config.typography.bodyfont,
      '--theme-font-code': config.typography.codefont,
      '--theme-font-size-base': config.typography.baseFontSize
    } as ThemeStyles
    
    // 动态添加强调色变量
    config.palette.accent.forEach((color, index) => {
      (styles as any)[`--theme-accent-${index + 1}`] = color
    })
    
    return styles
  })

  /**
   * 计算主题Logo路径
   */
  const themeLogo = computed(() => {
    /**
     * 函数用途：返回当前主题的 Logo 路径（基于 BASE_URL 进行拼接）。
     */
    const config = themeConfig.value
    const logoPath = config?.logo || 'img/logo/default.svg'
    if (logoPath.startsWith('http')) return logoPath
    const basePath = import.meta.env.BASE_URL || '/'
    if (logoPath.startsWith('/')) {
      const cleanLogoPath = logoPath.substring(1)
      return `${basePath}${cleanLogoPath}`.replace(/\/+/g, '/')
    }
    return `${basePath}${logoPath}`.replace(/\/+/g, '/')
  })

  /**
   * 计算主题反色Logo路径
   */
  const themeInvertLogo = computed(() => {
    /**
     * 函数用途：返回当前主题的反色 Logo 路径；若未配置则退回正常 Logo。
     */
    const config = themeConfig.value
    if (!config?.invertLogo) return themeLogo.value
    const logoPath = config.invertLogo
    if (logoPath.startsWith('http')) return logoPath
    const basePath = import.meta.env.BASE_URL || '/'
    if (logoPath.startsWith('/')) {
      const cleanLogoPath = logoPath.substring(1)
      return `${basePath}${cleanLogoPath}`.replace(/\/+/g, '/')
    }
    return `${basePath}${logoPath}`.replace(/\/+/g, '/')
  })

  return {
    themeConfig,
    themeClass,
    themeStyles,
    themeLogo,
    themeInvertLogo,
    // 暴露配置管理方法
    loadThemeConfigs,
    reloadThemeConfigs,
    getThemeConfigs,
    getAvailableThemes,
    getDefaultTheme,
    isValidTheme
  }
}
// 全局主题切换能力已移除：不再提供 useGlobalTheme、initializeGlobalTheme、setGlobalTheme 等方法。
