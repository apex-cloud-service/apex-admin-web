import { chromium } from 'playwright'
import { exerciseBusinessSmoke } from './browser-business-smoke.mjs'

const endpoints = new Map([
  ['/api/v1/auth/captcha', 'captcha image'],
  ['/auth/v1/login', 'login'],
  ['/api/v1/user/info', 'identity'],
  ['/api/v1/auth/roles/my', 'roles'],
  ['/api/v1/auth/permissions/my', 'permissions'],
  ['/admin-api/v1/menus', 'menus'],
])

let browser
let stage = 'launch Chromium'
const base = new URL(process.env.BASE_URL ?? 'http://apex-admin-web').origin
const groups = process.argv.includes('--notification-only') ? [['notification', '/dashboard']]
  : process.argv.includes('--notification-push') ? [['notification-push', '/dashboard']]
  : process.argv.includes('--governance-reads') ? [['tenant-list', '/platform/tenant'], ['workflow-definitions', '/workflow/definition']]
  : process.argv.includes('--system-reads') ? [['system-users', '/system/user'], ['system-departments', '/system/dept'], ['system-configs', '/system/config']]
  : process.argv.includes('--monitor-reads') ? [['monitor-dashboard', '/monitor/dashboard']]
  : process.argv.includes('--integration-reads') ? [['connector', '/integration/connector']]
  : process.argv.includes('--office-reads') ? [['office-calendar', '/office/calendar']]
  : process.argv.includes('--workflow-reads') ? [['workflow-definitions', '/workflow/definition']]
  : process.argv.includes('--file-reads') ? [['upload', '/demo/file-upload']]
  : process.argv.includes('--knowledge-reads') ? [['knowledge-spaces', '/knowledge/space']]
  : process.argv.includes('--business')
  ? [['dashboard', '/dashboard'], ['dictionary', '/system/dict'], ...(process.argv.includes('--domains')
      ? [['connector', '/integration/connector'], ['upload', '/demo/file-upload']]
      : []), ...(process.argv.includes('--notification-fixtures') ? [['notification', '/dashboard']] : [])]
  : [['auth', '/']]

async function verify(group, destination) {
  let stage = 'create context'
  const results = new Map()
  let identityName
  let menuNames = []
  let context
  try {
    context = await browser.newContext()
    const page = await context.newPage()
    stage = 'prepare business smoke'
    const business = group === 'auth' ? null : await exerciseBusinessSmoke(page, base, group)
    page.on('response', async (response) => {
      const url = new URL(response.url())
      const name = endpoints.get(url.pathname)
      if (url.origin !== base || !name || response.request().method() !== (name === 'login' ? 'POST' : 'GET')) return
      const result = { status: response.status() }
      // Never read the login body: the application alone consumes the tokens.
      if (name !== 'login') {
        const body = await response.json().catch(() => null)
        if (name === 'menus') {
          const { responseEnd } = response.request().timing()
          if (responseEnd >= 0) result.duration = Math.round(responseEnd)
          if (Number.isSafeInteger(body?.code)) result.code = body.code
        }
        result.valid = body?.code === 0 && (name === 'captcha image'
          ? Boolean(body.data?.image)
          : name === 'identity'
            ? body.data?.id != null && Boolean(body.data?.username || body.data?.nickName)
            : Array.isArray(body.data) && body.data.length > 0)
        if (result.valid && name === 'identity') identityName = body.data.nickName || body.data.username
        if (result.valid && name === 'menus') {
          menuNames = body.data.map((menu) => menu?.menuName)
            .filter((title) => typeof title === 'string' && title.trim() && title !== '\u5de5\u4f5c\u53f0')
        }
      }
      results.set(name, result)
    })
    stage = 'load login page and captcha image'
    const login = new URL('/login', base)
    login.searchParams.set('redirect', destination)
    await page.goto(login.href, { waitUntil: 'domcontentloaded', timeout: 30000 })
    stage = 'wait for captcha image to render'
    await page.locator('img.captcha-img').waitFor({ timeout: 30000 })
    stage = 'submit login and initialize admin shell'
    await page.getByPlaceholder('\u8bf7\u8f93\u5165\u8d26\u53f7').fill('admin')
    await page.getByPlaceholder('\u8bf7\u8f93\u5165\u5bc6\u7801').fill(process.env.TEST_LOGIN_PASSWORD ?? '')
    // Auth Center does not consume the legacy captcha fields sent by this form.
    await page.locator('input[maxlength="6"]').fill('1234')
    const menuResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.origin === base && url.pathname === '/admin-api/v1/menus'
        && response.request().method() === 'GET'
    }, { timeout: 25000 }).catch(() => null)
    const loginError = page.locator('.el-message--error').first()
      .waitFor({ state: 'visible', timeout: 26000 })
      .then(() => 'login-error', () => null)
    await page.locator('button.login-btn').click()
    stage = 'load initial menu tree'
    const menu = await Promise.race([menuResponse, loginError])
    if (menu === 'login-error') {
      stage = 'login form displayed an error'
      throw new Error('login form displayed an error')
    }
    if (!menu) {
      const onLogin = new URL(page.url()).pathname === '/login'
      console.log(`Menu request not observed: login page=${onLogin}`)
      throw new Error('menu request not observed')
    }
    if (menu.status() !== 200) throw new Error('menu request failed')
    const userName = page.locator('.user-name')
    await userName.waitFor({ timeout: 25000 })
    stage = 'validate all initialization responses'
    for (const name of endpoints.values()) {
      const result = results.get(name)
      if (result?.status !== 200 || (name !== 'login' && !result.valid)) throw new Error('assertion failed')
    }
    stage = 'render initialized identity and dynamic menu'
    if ((await userName.innerText()).trim() !== identityName?.trim()) throw new Error('identity mismatch')
    const visibleTitles = await page.locator('.layout-aside .el-menu > .el-menu-item:visible, .layout-aside .el-menu > .el-sub-menu > .el-sub-menu__title:visible').allTextContents()
    if (!visibleTitles.some((title) => menuNames.includes(title.trim()))) throw new Error('dynamic menu missing')
    console.log(`[${group}] Browser login, identity, roles, permissions and menu rendering passed`)
    if (business) {
      stage = 'reach business route'
      await page.waitForURL((url) => url.origin === base && url.pathname === destination, { timeout: 12000 })
      stage = 'verify business flows'
      await business()
    }
    return true
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    const detail = stage === 'create context' && error instanceof Error
      ? `: ${error.message.replace(/[\r\n]+/g, ' ').slice(0, 200)}`
      : ''
    console.error(`[${group}] Browser smoke failed: ${stage} (${errorName})${detail}`)
    return false
  } finally {
    for (const name of endpoints.values()) {
      const result = results.get(name)
      const details = result ? [`HTTP ${result.status}`] : ['not observed']
      if (result?.valid !== undefined) details.push(`payload ${result.valid ? 'valid' : 'invalid'}`)
      if (result?.duration !== undefined) details.push(`${result.duration} ms`)
      if (result?.code !== undefined) details.push(`code ${result.code}`)
      console.log(`[${group}] ${name}: ${details.join(', ')}`)
    }
    await context?.close()
  }
}

try {
  browser = await chromium.launch({ timeout: 60000 })
  if (process.argv.includes('--launch-only')) {
    stage = 'create context'
    const context = await browser.newContext()
    stage = 'create blank page'
    await context.newPage()
    await context.close()
    console.log('Chromium launch, context and blank page passed')
  } else {
    for (const [group, destination] of groups) {
      stage = `manage ${group} context`
      if (!await verify(group, destination)) process.exitCode = 1
    }
  }
} catch {
  console.error(`Chromium smoke failed: ${stage}`)
  process.exitCode = 1
} finally {
  await browser?.close()
}
