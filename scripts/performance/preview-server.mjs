/**
 * vite preview 服务编排（性能/压测脚本共用）
 * ------------------------------------------------------------------
 * 以子进程启动 vite preview 并轮询就绪；调用方负责在结束时 kill。
 * 端口可用 PERF_PORT 覆盖（默认 4173，与开发端口 5173 隔离）。
 */
import { spawn } from 'node:child_process'

export const PERF_PORT = Number(process.env.PERF_PORT || 4173)
export const PERF_BASE = `http://localhost:${PERF_PORT}`

/**
 * 启动 preview 并轮询就绪。
 * @returns 启动器子进程，由调用方负责结束时清理
 * @throws Error 轮询截止前未取得成功响应；失败时向启动器发送终止信号
 * 轮询截止时间为 30 秒，但单次 fetch 没有超时，不保证严格 30 秒返回或整个进程树退出。
 */
export async function startPreviewServer() {
  const child = spawn('npx', ['vite', 'preview', '--port', String(PERF_PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })

  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(PERF_BASE)
      if (res.ok) return child
    } catch {
      // 未就绪，继续轮询
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  child.kill()
  throw new Error(`vite preview 未能在 30s 内就绪（端口 ${PERF_PORT}）`)
}
