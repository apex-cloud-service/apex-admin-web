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
 * 清理 URL，拦截危险协议。
 * 命中 javascript:/data:/vbscript:/file:/about: 前缀时返回 about:blank，其余原样返回
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
 * 按白名单清理 HTML（依赖浏览器 DOM，轻量级实现）。
 * 自定义白名单替换默认值；属性取标签专属项与 '*' 的并集。
 * 不允许的标签连同子树删除；href/src 经过 URL 清理，但 style 不做 CSS 清理。
 * @param html HTML 字符串
 * @param options 可选标签和属性白名单
 * @returns 清理后的 HTML，空输入返回空串；不构成完整的不可信 HTML 安全净化保证
 * 生产环境需使用经过验证的 HTML 净化方案，本函数不能覆盖所有输出上下文。
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
 * 解析 JSON，递归对字符串值与对象键做 HTML 实体转义，不提供 JS/CSS/URL 上下文净化。
 * @param input JSON 文本
 * @returns 转义后的结构；解析失败和合法 JSON null 均返回 null，不能据此区分二者
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
 * 按输入类别清理字符，不验证邮箱或数值的格式有效性。
 * @param input 输入文本，先转换为字符串并去首尾空白
 * @param type 清理类别（可选，默认 text）：HTML 转义、邮箱字符、URL 协议或数字字符
 * @returns 清理后的字符串，空输入返回空串；字符保留不等于业务校验通过
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
      // 数字：保留数字、小数点和负号，不校验多个点或负号是否组成有效数值
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
