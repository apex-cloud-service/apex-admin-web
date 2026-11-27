#!/usr/bin/env node
/**
 * 测试报告归一化
 * ------------------------------------------------------------------
 * 用途：
 * 把 `reports/` 下的机器可读测试结果改写为可入库的稳定形态。
 * Vitest 的 JUnit/JSON 报告与 v8 覆盖率摘要会写入绝对路径、执行主机名与
 * 随机时间段，直接提交会泄露本机目录结构，并在跨机器执行时产生无意义 diff。
 *
 * 处理内容：
 *   1. 当前仓库根路径前缀 → 相对路径（`src/...`），不处理其他机器或仓库外路径
 *   2. JUnit 的 hostname 统一为 `localhost`
 *   3. 覆盖率摘要的绝对路径键 → 相对路径键
 *
 * 不处理：时间戳保留，用于记录本次执行的时刻。
 *
 * 用法：node scripts/quality/normalize-test-report.mjs（由 npm run test:report 调用）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const REPORTS = path.join(ROOT, 'reports')

/** 删除字符串中的当前仓库根路径并统一分隔符；不处理仓库外或其他机器的绝对路径。 */
function toRelative(value) {
  if (typeof value !== 'string') return value
  const normalized = value.replaceAll(ROOT + path.sep, '').replaceAll(ROOT, '')
  return normalized.split(path.sep).join('/')
}

/** 递归归一化 JSON 内的所有字符串与对象键 */
function normalizeJsonValue(value) {
  if (typeof value === 'string') return toRelative(value)
  if (Array.isArray(value)) return value.map(normalizeJsonValue)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, val] of Object.entries(value)) {
      out[toRelative(key)] = normalizeJsonValue(val)
    }
    return out
  }
  return value
}

/** 处理 JUnit XML：改写绝对路径并抹掉主机名 */
function normalizeJunit(file) {
  if (!fs.existsSync(file)) return false
  const original = fs.readFileSync(file, 'utf8')
  const result = original
    .replaceAll(ROOT + path.sep, '')
    .replaceAll(ROOT, '')
    .replace(/hostname="[^"]*"/g, 'hostname="localhost"')
  fs.writeFileSync(file, result)
  return result !== original
}

/** 处理 JSON 报告：改写绝对路径（含对象键） */
function normalizeJson(file, indent = 0) {
  if (!fs.existsSync(file)) return false
  const original = fs.readFileSync(file, 'utf8')
  const result = JSON.stringify(normalizeJsonValue(JSON.parse(original)), null, indent) + '\n'
  fs.writeFileSync(file, result)
  return result !== original
}

let changed = 0
if (normalizeJunit(path.join(REPORTS, 'unit', 'test-results.xml'))) changed++
// 用例报告体积大（数十万字符），压缩为单行以免产生海量行级 diff
if (normalizeJson(path.join(REPORTS, 'unit', 'test-results.json'))) changed++
// 覆盖率摘要供人阅读与 CI 比对，保留缩进
if (normalizeJson(path.join(REPORTS, 'coverage', 'coverage-summary.json'), 2)) changed++

console.log(`[测试报告] 归一化完成：${changed} 个文件已改写`)
