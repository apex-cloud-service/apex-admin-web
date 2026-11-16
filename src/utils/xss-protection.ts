/**
 * XSS 防护工具
 * 提供 HTML 内容清理和 XSS 攻击防护
 */

/**
 * HTML 实体编码映射
 */
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
}

/**
 * HTML 转义
 * 将特殊字符转换为 HTML 实体，防止 XSS 攻击
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return String(str).replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char)
}

/**
 * HTML 反转义
 * 将 HTML 实体转换回特殊字符
 */
export function unescapeHtml(str: string): string {
  if (!str) return ''
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

/**
 * 移除 HTML 标签
 * 仅保留纯文本内容
 */
export function stripHtmlTags(html: string): string {
  if (!html) return ''
  return String(html).replace(/<[^>]*>/g, '')
}

/**
 * 清理 URL，防止 JavaScript 伪协议
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ''
  
  const trimmedUrl = String(url).trim().toLowerCase()
  
  // 危险协议列表
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ]
  
  // 检查是否包含危险协议
  for (const protocol of dangerousProtocols) {
    if (trimmedUrl.startsWith(protocol)) {
      return 'about:blank'
    }
  }
  
  return url
}

/**
 * 允许的 HTML 标签白名单
 */
const defaultAllowedTags = [
  'p', 'br', 'span', 'div', 'strong', 'b', 'em', 'i', 'u',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'code', 'pre'
]

/**
 * 允许的 HTML 属性白名单
 */
const defaultAllowedAttrs: Record<string, string[]> = {
  'a': ['href', 'title', 'target'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  '*': ['class', 'id', 'style']
}

/**
 * 简易 HTML 清理器（轻量级实现）
 * 注意：生产环境建议使用 DOMPurify 库
 */
export function sanitizeHtml(
  html: string,
  options: {
    allowedTags?: string[]
    allowedAttrs?: Record<string, string[]>
  } = {}
): string {
  if (!html) return ''
  
  const allowedTags = options.allowedTags || defaultAllowedTags
  const allowedAttrs = options.allowedAttrs || defaultAllowedAttrs
  
  // 创建临时 DOM 元素
  const temp = document.createElement('div')
  temp.innerHTML = html
  
  // 递归清理节点
  function cleanNode(node: Element): void {
    const tagName = node.tagName?.toLowerCase()
    
    // 移除不允许的标签
    if (!allowedTags.includes(tagName)) {
      node.remove()
      return
    }
    
    // 清理属性
    const attrs = Array.from(node.attributes)
    const tagAllowedAttrs = [
      ...(allowedAttrs[tagName] || []),
      ...(allowedAttrs['*'] || [])
    ]
    
    for (const attr of attrs) {
      if (!tagAllowedAttrs.includes(attr.name)) {
        node.removeAttribute(attr.name)
      } else if (attr.name === 'href' || attr.name === 'src') {
        // 清理 URL 属性
        node.setAttribute(attr.name, sanitizeUrl(attr.value))
      }
    }
    
    // 递归清理子节点
    Array.from(node.children).forEach((child) => {
      cleanNode(child as Element)
    })
  }
  
  Array.from(temp.children).forEach((child) => {
    cleanNode(child as Element)
  })
  
  return temp.innerHTML
}

/**
 * 验证 JSON 输入，防止注入
 */
export function sanitizeJson(input: string): unknown {
  try {
    const parsed = JSON.parse(input)
    
    // 递归清理对象中的字符串值
    function cleanValue(value: unknown): unknown {
      if (typeof value === 'string') {
        return escapeHtml(value)
      } else if (Array.isArray(value)) {
        return value.map(cleanValue)
      } else if (typeof value === 'object' && value !== null) {
        const cleaned: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(value)) {
          cleaned[escapeHtml(key)] = cleanValue(val)
        }
        return cleaned
      }
      return value
    }
    
    return cleanValue(parsed)
  } catch (error) {
    console.error('[JSON 清理] 解析失败:', error)
    return null
  }
}

/**
 * 验证和清理用户输入
 */
export function sanitizeInput(input: string, type: 'text' | 'email' | 'url' | 'number' = 'text'): string {
  if (!input) return ''
  
  let sanitized = String(input).trim()
  
  switch (type) {
    case 'text':
      // 基础文本：转义 HTML
      sanitized = escapeHtml(sanitized)
      break
      
    case 'email':
      // 邮箱：只保留合法字符
      sanitized = sanitized.replace(/[^a-zA-Z0-9@._-]/g, '')
      break
      
    case 'url':
      // URL：清理危险协议
      sanitized = sanitizeUrl(sanitized)
      break
      
    case 'number':
      // 数字：只保留数字和小数点
      sanitized = sanitized.replace(/[^0-9.-]/g, '')
      break
  }
  
  return sanitized
}

/**
 * 内容安全策略（CSP）辅助函数
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 检测潜在的 XSS 攻击模式
 */
export function detectXSS(input: string): boolean {
  if (!input) return false
  
  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror 等事件
    /<iframe/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

/**
 * 导出所有工具
 */
export default {
  escapeHtml,
  unescapeHtml,
  stripHtmlTags,
  sanitizeUrl,
  sanitizeHtml,
  sanitizeJson,
  sanitizeInput,
  generateCSPNonce,
  detectXSS
}
