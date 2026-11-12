/**
 * 静态服务压力测试入口（npm run test:stress）
 * ------------------------------------------------------------------
 * 对 vite preview 构建产物做两档并发压测：
 *   1. 首页 HTML（50 并发 × 15s）
 *   2. 最大体积的 JS 产物（100 并发 × 15s，对应 Nginx 30 天缓存资产）
 * 结果落 reports/stress/stress-results.json 并输出 p99/吞吐摘要。
 * 口径说明：本脚本衡量前端静态服务承载能力；业务接口压测属后端/网关范畴。
 */
import { writeFile, mkdir, readdir, stat } from 'node:fs/promises'
import autocannon from 'autocannon'
import { startPreviewServer, PERF_BASE } from './preview-server.mjs'

const OUTPUT_DIR = './reports/stress'

/** 挑选构建产物中体积最大的 JS 文件作为缓存资产压测对象（本仓库产物目录为 dist/js） */
async function pickLargestAsset() {
  for (const dir of ['./dist/js', './dist/assets']) {
    let largest = ''
    let largestSize = 0
    let entries
    try {
      entries = await readdir(dir)
    } catch {
      // 目录不存在则尝试下一个
      continue
    }
    for (const name of entries) {
      if (!name.endsWith('.js')) continue
      const info = await stat(`${dir}/${name}`)
      if (info.size > largestSize) {
        largestSize = info.size
        largest = name
      }
    }
    if (largest) {
      const urlDir = dir.replace('./dist', '')
      return { path: `${urlDir}/${largest}`, sizeKb: Math.round(largestSize / 1024) }
    }
  }
  throw new Error('dist 下未找到 JS 产物，请先执行构建')
}

/** 执行单场景压测并归集关键指标 */
function runScenario(url, connections, duration) {
  return new Promise((resolve, reject) => {
    autocannon(
      { url, connections, duration, pipelining: 1 },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve({
          url,
          connections,
          durationSeconds: duration,
          requestsTotal: result.requests.total,
          requestsPerSecAvg: Math.round(result.requests.average),
          latencyP99Ms: result.latency.p99,
          latencyMeanMs: Math.round(result.latency.mean * 10) / 10,
          errors: result.errors,
          non2xx: result.non2xx,
          throughputMbPerSec: Math.round((result.throughput.average / 1024 / 1024) * 10) / 10,
        })
      },
    )
  })
}

const server = await startPreviewServer()
try {
  const asset = await pickLargestAsset()
  console.log(`压测目标: ${PERF_BASE}（最大 JS 产物 ${asset.path}，${asset.sizeKb}KB）`)

  const scenarios = [
    { name: '首页 HTML（50 并发）', url: `${PERF_BASE}/`, connections: 50, duration: 15 },
    { name: `静态 JS 产物（100 并发）`, url: `${PERF_BASE}${asset.path}`, connections: 100, duration: 15 },
  ]

  const results = []
  for (const scenario of scenarios) {
    console.log(`\n>>> ${scenario.name} 运行中…`)
    const result = await runScenario(scenario.url, scenario.connections, scenario.duration)
    results.push({ scenario: scenario.name, ...result })
    console.log(
      `    平均 ${result.requestsPerSecAvg} req/s · p99 ${result.latencyP99Ms}ms · ` +
        `错误 ${result.errors} · 非 2xx ${result.non2xx} · 吞吐 ${result.throughputMbPerSec} MB/s`,
    )
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(
    `${OUTPUT_DIR}/stress-results.json`,
    JSON.stringify({ base: PERF_BASE, ranAt: new Date().toISOString(), results }, null, 2),
  )
  console.log(`\n结果已写入: ${OUTPUT_DIR}/stress-results.json`)
} finally {
  server.kill()
}
