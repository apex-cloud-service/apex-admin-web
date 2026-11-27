/**
 * XSS 防护工具单元测试
 * ------------------------------------------------------------------
 * 覆盖 HTML 转义/反转义、标签剥离、危险协议拦截、HTML 白名单清理、
 * JSON 清理、输入分类清理、XSS 特征检测与 CSP nonce 长度及十六进制格式。
 */
import { describe, expect, it } from 'vitest'
import {
  detectXSS,
  escapeHtml,
  generateCSPNonce,
  sanitizeHtml,
  sanitizeInput,
  sanitizeJson,
  sanitizeUrl,
  stripHtmlTags,
  unescapeHtml,
} from '@/utils/xss-protection'

describe('escapeHtml / unescapeHtml', () => {
  it('转义五类特殊字符', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#x27;&amp;&#x27;&lt;&#x2F;a&gt;')
  })

  it('空值返回空串', () => {
    expect(escapeHtml('')).toBe('')
    expect(unescapeHtml('')).toBe('')
  })

  it('转义后可还原原文', () => {
    const raw = `<script>alert("x")</script>`
    expect(unescapeHtml(escapeHtml(raw))).toBe(raw)
  })
})

describe('stripHtmlTags', () => {
  it('移除标签保留文本', () => {
    expect(stripHtmlTags('<p>你好<strong>世界</strong></p>')).toBe('你好世界')
  })

  it('空值返回空串', () => {
    expect(stripHtmlTags('')).toBe('')
  })
})

describe('sanitizeUrl', () => {
  it.each(['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,1', 'vbscript:x', 'file:///etc/passwd', 'about:config'])(
    '危险协议 %s 被替换为 about:blank',
    (url) => {
      expect(sanitizeUrl(url)).toBe('about:blank')
    },
  )

  it('合法地址原样返回', () => {
    expect(sanitizeUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(sanitizeUrl('')).toBe('')
  })
})

describe('sanitizeHtml', () => {
  it('移除白名单外的标签与属性', () => {
    const result = sanitizeHtml('<p onclick="x()">ok</p><script>bad()</script>')
    expect(result).toBe('<p>ok</p>')
  })

  it('保留白名单属性并清理危险 URL', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)" title="t">x</a>')
    expect(result).toBe('<a href="about:blank" title="t">x</a>')
  })

  it('根节点不在白名单时连同允许的子节点一并移除', () => {
    expect(sanitizeHtml('<p><span>x</span></p>', { allowedTags: ['span'] })).toBe('')
  })

  it('空值返回空串', () => {
    expect(sanitizeHtml('')).toBe('')
  })
})

describe('sanitizeJson', () => {
  it('递归转义字符串值与键名', () => {
    const result = sanitizeJson('{"name":"<b>x</b>","list":["<i>y</i>"],"num":1}')
    expect(result).toEqual({
      name: '&lt;b&gt;x&lt;&#x2F;b&gt;',
      list: ['&lt;i&gt;y&lt;&#x2F;i&gt;'],
      num: 1,
    })
  })

  it('非法 JSON 返回 null', () => {
    expect(sanitizeJson('{invalid')).toBeNull()
  })
})

describe('sanitizeInput', () => {
  it('text 转义并裁剪空白', () => {
    expect(sanitizeInput('  <b>x</b>  ', 'text')).toBe('&lt;b&gt;x&lt;&#x2F;b&gt;')
  })

  it('email 只保留合法字符', () => {
    expect(sanitizeInput(' a<b>@ex.com ', 'email')).toBe('ab@ex.com')
  })

  it('url 拦截危险协议', () => {
    expect(sanitizeInput('javascript:alert(1)', 'url')).toBe('about:blank')
  })

  it('number 只保留数字、小数点和负号', () => {
    expect(sanitizeInput(' -1a2.3x ', 'number')).toBe('-12.3')
  })

  it('空值返回空串', () => {
    expect(sanitizeInput('')).toBe('')
  })
})

describe('detectXSS', () => {
  it.each(['<script>alert(1)</script>', 'javascript:x', '<img onerror="x">', '<iframe src="x">', 'eval(1)', 'expression(x)'])(
    '识别攻击特征 %s',
    (input) => {
      expect(detectXSS(input)).toBe(true)
    },
  )

  it('正常文本不误报', () => {
    expect(detectXSS('普通文本 <p>段落</p>')).toBe(false)
    expect(detectXSS('')).toBe(false)
  })
})

describe('generateCSPNonce', () => {
  it('生成 32 位十六进制字符串', () => {
    expect(generateCSPNonce()).toMatch(/^[0-9a-f]{32}$/)
  })
})
