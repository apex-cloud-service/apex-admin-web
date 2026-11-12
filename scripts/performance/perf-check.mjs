/**
 * Lighthouse 性能测试入口（npm run test:perf）
 * ------------------------------------------------------------------
 * 构建产物（vite preview）上运行 Lighthouse desktop 预设，
 * HTML/JSON 报告落 reports/lighthouse/，控制台输出四类得分摘要。
 * 口径说明：无后端环境下 API 请求失败，TTI/SEO 受影响，
 * 结果作为静态资源加载性能基线，不作为业务可用性结论。
 */
import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { startPreviewServer, PERF_BASE } from './preview-server.mjs'

const OUTPUT_DIR = './reports/lighthouse'
mkdirSync(OUTPUT_DIR, { recursive: true })

const server = await startPreviewServer()
try {
  console.log(`Lighthouse 测试目标: ${PERF_BASE}`)
  execSync(
    `npx lighthouse ${PERF_BASE} --output html --output json --output-path ${OUTPUT_DIR}/report ` +
      '--chrome-flags="--headless" --preset=desktop',
    { stdio: 'inherit' },
  )

  const report = JSON.parse(await readFile(`${OUTPUT_DIR}/report.report.json`, 'utf8'))
  const categories = report.categories ?? {}
  console.log('\n===== Lighthouse 得分摘要 =====')
  for (const [key, category] of Object.entries(categories)) {
    console.log(`${key}: ${Math.round((category.score ?? 0) * 100)}`)
  }
  console.log(`报告: ${OUTPUT_DIR}/report.report.html`)
} finally {
  server.kill()
}
