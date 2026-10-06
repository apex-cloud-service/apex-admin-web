#!/usr/bin/env node
/**
 * 注释规范检查（只读，不修改任何文件）
 * ------------------------------------------------------------------
 * 依据 docs/reference/comment-style.md 检查两类问题：
 *   1. 文件头注释缺失：.ts 检查首个非空行；.vue 兼容两种合法形式——
 *      <template> 之前的 HTML 头注、<script> 块内 JSDoc（只看 script 会误报）
 *   2. 导出函数/类/接口/枚举/常量缺少文档注释
 * 退出码：0 = 通过，1 = 存在违规。
 *
 * 用法：npm run check:comments（或 node scripts/check-comments.mjs）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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

/** .vue 文件头注：文件首个非空行为 HTML 注释，或 <script> 块内首个非空行为 JSDoc */
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
