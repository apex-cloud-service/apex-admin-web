#!/usr/bin/env node
/**
 * 注释规范检查（只读，不修改任何文件）
 * ------------------------------------------------------------------
 * 依据 docs/reference/comment-style.md 检查两类注释存在性问题：
 *   1. 文件头：.ts 的首个非空行；.vue 的顶部 HTML 注释或 script 首行注释。
 *      文本规则接受普通注释，不验证是否为完整 JSDoc。
 *   2. 正则匹配到的导出 function/class/const/interface/enum/type 声明前是否有注释。
 * 不解析标签、参数或内容真实性；通过仅代表当前文本模式未发现缺失。
 * 退出码：0 = 通过，1 = 存在违规。
 *
 * 用法：npm run check:comments（或 node scripts/quality/check-comments.mjs）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SRC = path.join(ROOT, 'src')
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage'])

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(p, out)
    } else if (/\.(ts|vue)$/.test(entry.name) && !entry.name.endsWith('.bak') && !/\.d\.ts$/.test(entry.name)) {
      out.push(p)
    }
  }
  return out
}

/** 检查 Vue 顶部 HTML 注释或 script 首行普通注释；只看文本开头，不解析 JSDoc。 */
function hasVueHeader(lines) {
  const firstNonEmpty = lines.find((l) => l.trim() !== '')
  if (firstNonEmpty && /^<!--/.test(firstNonEmpty.trim())) return true
  const scriptIdx = lines.findIndex((l) => /<script\b/.test(l))
  if (scriptIdx < 0) return false
  let i = scriptIdx + 1
  while (i < lines.length && lines[i].trim() === '') i++
  return /^(\/\/|\/\*|\*)/.test((lines[i] || '').trim())
}

const violations = []
// src 全部 TS/Vue + 根目录构建配置 TS（与规范适用范围一致）
const files = [...walk(SRC), ...fs.readdirSync(ROOT)
  .filter((f) => /\.ts$/.test(f) && !/\.d\.ts$/.test(f))
  .map((f) => path.join(ROOT, f))].sort()

for (const file of files) {
  const rel = path.relative(ROOT, file)
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

  if (file.endsWith('.vue') ? !hasVueHeader(lines) : !/^(\/\/|\/\*|\*)/.test(lines.find((l) => l.trim() !== '') || '')) {
    violations.push(`${rel}:1  缺少文件头注释`)
  }

  lines.forEach((line, idx) => {
    const m = line.match(/^\s*export\s+(?:default\s+)?(?:async\s+)?(function|class|const|interface|enum|type)\s+(\w+)/)
    if (!m) return
    let j = idx - 1
    while (j >= 0 && lines[j].trim() === '') j--
    const prev = (lines[j] || '').trim()
    if (!(prev.endsWith('*/') || prev.startsWith('//') || prev.startsWith('*'))) {
      violations.push(`${rel}:${idx + 1}  导出${m[1]}「${m[2]}」缺少文档注释`)
    }
  })
}

if (violations.length) {
  console.error(`注释规范检查未通过（${violations.length} 处）：`)
  for (const v of violations) console.error('  ' + v)
  process.exit(1)
} else {
  console.log(`注释规范检查通过：${files.length} 个文件，文件头与导出符号文档注释齐全。`)
}
