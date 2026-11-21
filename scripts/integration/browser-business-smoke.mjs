import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

const dictPath = '/admin-api/v1/dict/types'
const dataPath = '/admin-api/v1/dict/data'
const monitorPaths = ['overview', 'system', 'middleware', 'governance', 'business']
  .map((name) => `/admin-api/v1/monitor/${name}`)
const isPage = (data) => Array.isArray(data?.list) && Number.isSafeInteger(data.total) && data.total >= 0
const managementReads = new Map([
  ['tenant-list', ['/api/v2/platform/tenants', isPage, { pageNum: '1', pageSize: '10' }]],
  ['workflow-definitions', ['/api/v2/workflow-definitions', isPage, { pageNum: '1', pageSize: '10' }]],
  ['system-users', ['/admin-api/v1/users', isPage, { page: '1', size: '20' }]],
  ['system-departments', ['/admin-api/v1/depts', Array.isArray]],
  ['system-configs', ['/admin-api/v1/configs', Array.isArray]],
])

export async function exerciseBusinessSmoke(page, origin, group) {
  const matches = (response, method, path) => {
    const url = new URL(response.url())
    return url.origin === origin && response.request().method() === method && path.test(url.pathname)
  }
  const initialResponses = new Map()
  const [managementPath, acceptsManagementData, expectedQuery = {}] = managementReads.get(group) ?? []
  let managementRequest = false
  let managementRequestFailed = false
  let pageError = false
  const initialGetPath = (request) => {
    const url = new URL(request.url())
    return url.origin === origin && request.method() === 'GET' ? url.pathname : null
  }
  if (managementPath) {
    page.on('request', (request) => {
      if (initialGetPath(request) === managementPath) managementRequest = true
    })
    page.on('requestfailed', (request) => {
      if (initialGetPath(request) === managementPath) managementRequestFailed = true
    })
    page.on('pageerror', () => { pageError = true })
  }
  const agendaChecks = group === 'dashboard' ? [
    ...(process.argv.includes('--domains') ? [['/api/v1/workflows/tasks/pending', (data) => Array.isArray(data?.list) && Number.isSafeInteger(data.total)]] : []),
    ['/api/office/approvals/pending', Array.isArray],
    ['/api/office/calendar/events/range', Array.isArray],
    ['/api/v1/messages/inbox', Array.isArray],
    ['/api/v1/notifications/inbox', (data) => Array.isArray(data?.list) && Number.isSafeInteger(data.total)],
  ] : []
  const initialPaths = new Set(managementPath ? [managementPath] : group === 'dashboard'
    ? ['/api/v2/overview', '/api/v1/notifications/stream', ...agendaChecks.map(([path]) => path)]
    : group === 'monitor-dashboard'
      ? monitorPaths
    : group === 'connector' ? ['/integration/v1/connectors'] : group === 'dictionary' ? [dictPath]
      : group === 'notification' ? ['/api/v1/notifications/unread-count']
        : group === 'notification-push' ? ['/api/v1/notifications/stream'] : [])
  let pushReceived = false
  if (group === 'notification-push') {
    const marker = process.env.VERIFY_SSE_MARKER
    if (!/^FE029-push-[a-f0-9]{24}$/.test(marker ?? '')) throw new Error('missing SSE fixture marker')
    await page.exposeFunction('fe029PushReceived', () => { pushReceived = true })
    await page.addInitScript(({ origin, marker }) => {
      const fetch = window.fetch.bind(window)
      window.fetch = async (...args) => {
        const response = await fetch(...args)
        if (response.url === `${origin}/api/v1/notifications/stream` && response.ok) {
          const reader = response.clone().body?.pipeThrough(new TextDecoderStream()).getReader()
          if (reader) void (async () => {
            let pending = ''
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              const frames = (pending + value).split(/\r?\n\r?\n/)
              pending = frames.pop()
              if (frames.some((frame) => {
                const lines = frame.split(/\r?\n/)
                return lines.some((line) => /^event: ?notification$/.test(line))
                  && lines.some((line) => line.replace(/^data: ?/, '') === marker && line.startsWith('data:'))
              })) {
                await window.fe029PushReceived()
                void reader.cancel().catch(() => {})
                break
              }
            }
          })().catch(() => {})
        }
        return response
      }
    }, { origin, marker })
  }
  const initialRead = (path) => initialResponses.get(path) ?? page.waitForResponse(
    (response) => initialGetPath(response.request()) === path,
    { timeout: 32000 },
  ).catch(() => null)
  let ticket
  let upgrade
  let ping = false
  let pong = false
  let dictWritePermission = false
  if (group === 'dashboard') {
    const cdp = await page.context().newCDPSession(page)
    const sockets = new Set()
    await cdp.send('Network.enable')
    cdp.on('Network.webSocketCreated', ({ requestId, url }) => {
      const address = new URL(url)
      if (address.host === new URL(origin).host && address.pathname === '/api/v1/messages/ws') sockets.add(requestId)
    })
    cdp.on('Network.webSocketHandshakeResponseReceived', ({ requestId, response }) => {
      if (sockets.has(requestId)) upgrade = response.status
    })
  }
  page.on('response', async (response) => {
    const path = initialGetPath(response.request())
    if (initialPaths.has(path) && !initialResponses.has(path)) {
      initialResponses.set(path, response)
      if (group === 'monitor-dashboard') console.log(`Observed monitor response ${path}: HTTP ${response.status()}`)
    }
    if (matches(response, 'POST', /^\/api\/v1\/messages\/ws-ticket$/)) ticket = response.status()
    if (matches(response, 'GET', /^\/api\/v1\/auth\/permissions\/my$/)) {
      const body = await response.json().catch(() => null)
      dictWritePermission = Array.isArray(body?.data) && body.data.some((p) => (typeof p === 'string' ? p : p?.code) === 'system:dict:add')
    }
  })
  page.on('websocket', (socket) => {
    const url = new URL(socket.url())
    if (url.host !== new URL(origin).host || url.pathname !== '/api/v1/messages/ws') return
    socket.on('framereceived', ({ payload }) => {
      try { if (JSON.parse(payload.toString()).type === 'ping') ping = true } catch { /* Ignore non-JSON frames. */ }
    })
    socket.on('framesent', ({ payload }) => {
      if (ping && payload.toString() === 'pong') pong = true
    })
  })
  const run = async (label, test) => {
    try {
      await test()
      console.log(`${label}: passed`)
      return true
    } catch (error) {
      const kind = error instanceof Error ? error.name : 'UnknownError'
      console.log(`${label}: failed (${/Timeout/.test(kind) ? 'timeout' : 'assertion'})`)
      if (group === 'monitor-dashboard' && error instanceof Error) {
        console.log(`Monitor render diagnostic: ${error.message.split('\n')[0].slice(0, 120)}`)
      }
      return false
    }
  }
  async function check(response, label) {
    console.log(`${label}: ${response ? `HTTP ${response.status()}` : 'not observed'}`)
    if (response?.status() !== 200) throw new Error(label)
    return response
  }
  async function action(method, path, trigger, label, expectedPath) {
    const pending = page.waitForResponse((r) => matches(r, method, path), { timeout: 15000 }).catch(() => null)
    await trigger()
    const response = await pending
    const body = await response?.json().catch(() => null)
    const code = Number.isSafeInteger(body?.code) ? body.code : 'none'
    await check(response, `${method} ${label} (code ${code})`)
    if (body?.code !== 0) throw new Error('business failure')
    if (expectedPath && new URL(response.url()).pathname !== expectedPath) throw new Error('dictionary ID changed')
  }
  function readList(path) {
    const pattern = new RegExp(`^${path}$`)
    return page.waitForResponse((r) => matches(r, 'GET', pattern) && r.status() === 200, { timeout: 15000 }).catch(() => null)
  }
  async function listedId(pending, field, value) {
    const body = await (await pending)?.json()
    const id = body?.code === 0 && Array.isArray(body.data) ? body.data.find((row) => row[field] === value)?.id : null
    if (typeof id !== 'string' || !/^[1-9][0-9]*$/.test(id)) throw new Error('dictionary response ID must be a decimal string')
    return id
  }

  return async () => {
    page.setDefaultTimeout(12000)
    if (managementPath) {
      const passed = await run(group, async () => {
        const menuTarget = group === 'tenant-list' ? ['平台治理', '租户管理', '/platform/tenant']
          : group === 'workflow-definitions' ? ['工作流', '流程定义', '/workflow/definition']
            : null
        if (menuTarget) {
          const sidebar = page.locator('.layout-aside')
          const child = sidebar.getByText(menuTarget[1], { exact: true })
          if (!await child.isVisible().catch(() => false)) {
            await sidebar.locator('.el-sub-menu__title').filter({ hasText: menuTarget[0] }).click()
          }
          await child.waitFor({ state: 'visible' })
          await child.click()
          await page.waitForURL((url) => url.origin === origin && url.pathname === menuTarget[2], { timeout: 12000 })
          await page.locator('main .el-table').first().waitFor({ timeout: 15000 })
        }
        const response = await initialRead(managementPath)
        const body = await response?.json().catch(() => null)
        const code = Number.isSafeInteger(body?.code) ? body.code : 'none'
        if (code !== 0 || !acceptsManagementData(body.data)) {
          const message = typeof body?.message === 'string' ? body.message : ''
          const knownFailures = new Map([
            ['管理员不存在', 'system-user-not-found'],
            ['仅超级管理员可访问', 'super-admin-role-required'],
            ['Authenticated user is required', 'scope-principal-missing'],
            ['Authenticated user id is required', 'scope-user-id-missing'],
            ['No enabled role data scope', 'scope-role-missing'],
            ['Conflicting data scopes', 'scope-role-conflict'],
            ['Authenticated user department is required', 'scope-department-missing'],
            ['No enabled department data scope', 'scope-department-unavailable'],
            ['Required data scope could not be resolved', 'scope-unresolved'],
            ['Required data scope is missing from Reactor Context', 'scope-context-missing'],
          ])
          const failureClass = knownFailures.get(message)
            ?? (response?.status() === 403 ? 'authorization-denied'
              : response?.status() === 409 ? 'conflict-unclassified'
                : response ? 'unexpected-payload'
                  : managementRequestFailed ? 'request-failed'
                    : managementRequest ? 'response-not-observed' : 'request-not-observed')
          console.log(`${group} failure class: ${failureClass}`)
          const traceId = typeof body?.traceId === 'string' && /^[A-Za-z0-9-]{1,80}$/.test(body.traceId)
            ? body.traceId
            : null
          if (traceId) console.log(`${group} trace id: ${traceId}`)
          await check(response, `GET ${managementPath} (code ${code})`)
          throw new Error('invalid management response')
        }
        await check(response, `GET ${managementPath} (code ${code})`)
        const params = new URL(response.request().url()).searchParams
        if (!Object.entries(expectedQuery).every(([key, value]) => params.get(key) === value)) {
          throw new Error('unexpected pagination parameters')
        }
        await page.locator('main .el-table').first().waitFor()
      })
      if (!passed) {
        console.log(`${group} diagnostics: request=${managementRequest}, requestFailed=${managementRequestFailed}, pageError=${pageError}`)
        throw new Error('management reads smoke incomplete')
      }
      return
    }
    if (group === 'monitor-dashboard') {
      const passed = await run('Monitor dashboard API and rendering', async () => {
        const sidebar = page.locator('.layout-aside')
        const dashboardLink = sidebar.getByText('监控大盘', { exact: true })
        if (!await dashboardLink.isVisible().catch(() => false)) {
          await sidebar.locator('.el-sub-menu__title').filter({ hasText: '监控中心' }).click()
        }
        await dashboardLink.waitFor({ state: 'visible' })
        await dashboardLink.click()
        const dashboard = page.locator('.monitor-dashboard')
        await dashboard.waitFor({ state: 'visible', timeout: 15000 })
        console.log('Monitor dashboard route root rendered')
        const responses = await Promise.all(monitorPaths.map((path) => initialRead(path)))
        for (const [index, response] of responses.entries()) {
          const body = await response?.json().catch(() => null)
          await check(response, `GET ${monitorPaths[index]} (code ${Number.isSafeInteger(body?.code) ? body.code : 'none'})`)
          if (body?.code !== 0 || !body.data || typeof body.data !== 'object') throw new Error('invalid monitor payload')
        }
        console.log('Monitor dashboard route and five API sections rendered')
      })
      if (!passed) throw new Error('monitor dashboard smoke incomplete')
      return
    }
    if (group === 'notification-push') {
      const passed = await run('RocketMQ notification delivered to Chromium SSE', async () => {
        const response = await check(await initialRead('/api/v1/notifications/stream'), 'GET /api/v1/notifications/stream')
        if (!response.headers()['content-type']?.startsWith('text/event-stream')) throw new Error('invalid event stream')
        await writeFile('/tmp/fe029-sse-ready', '', { flag: 'wx' })
        const deadline = Date.now() + 75000
        while (!pushReceived && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250))
        if (!pushReceived) throw new Error('target notification not received')
      })
      if (!passed) throw new Error('notification delivery smoke incomplete')
      return
    }
    if (group === 'dashboard') {
      const reads = await Promise.all([
        ...agendaChecks.map(([path, accepts]) => run(`Agenda ${path}`, async () => {
          const response = await initialRead(path)
          const body = await response?.json().catch(() => null)
          const code = Number.isSafeInteger(body?.code) ? body.code : 'none'
          await check(response, `GET ${path} (code ${code})`)
          if (body?.code !== 0 || !accepts(body.data)) throw new Error('invalid agenda payload')
        })),
        run('Overview envelope', async () => {
          const response = await check(await initialRead('/api/v2/overview'), 'GET /api/v2/overview')
          const body = await response.json()
          if (body.code !== 0 || !body.data?.sources) throw new Error('invalid overview')
          console.log(`Overview sources: ${Object.values(body.data.sources).filter((source) => source?.status === 'DEGRADED').length} degraded`)
          if (process.argv.includes('--domains')) {
            for (const source of ['file', 'workflow', 'integration']) {
              console.log(`Overview ${source} UP: ${body.data.sources[source]?.status === 'UP'}`)
            }
            if (!['file', 'workflow', 'integration'].every((source) => body.data.sources[source]?.status === 'UP')) throw new Error('overview source not UP')
          }
        }),
        run('Notification SSE handshake', async () => {
          const response = await check(await initialRead('/api/v1/notifications/stream'), 'GET /api/v1/notifications/stream')
          if (!response.headers()['content-type']?.startsWith('text/event-stream')) throw new Error('invalid event stream')
        }),
        run('Message WebSocket heartbeat', async () => {
          const deadline = Date.now() + 45000
          while (!pong && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250))
          console.log(`POST /api/v1/messages/ws-ticket: ${ticket ? `HTTP ${ticket}` : 'not observed'}`)
          console.log(`GET /api/v1/messages/ws: ${upgrade ? `HTTP ${upgrade}` : 'not observed'}`)
          console.log(`WebSocket heartbeat: ping=${ping}, pong=${pong}`)
          if (ticket !== 200 || upgrade !== 101 || !ping || !pong) throw new Error('missing WebSocket heartbeat')
        }),
      ])
      if (!reads.every(Boolean)) throw new Error('dashboard smoke incomplete')
      return
    }
    if (group === 'notification') {
      let step = 'read initial unread count'
      const passed = await run('Notification center single read and read all', async () => {
        const item = (text) => page.locator('.notification-item').filter({ hasText: text })
        const single = item('FE029 single read fixture')
        const remaining = item('FE029 read all fixture')
        const badge = page.locator('.notification-badge .el-badge__content')
        const all = page.getByRole('button', { name: '\u5168\u90e8\u5df2\u8bfb' })
        const waitUnread = (count) => count === 0 ? badge.waitFor({ state: 'hidden' })
          : badge.filter({ hasText: new RegExp(`^${count}$`) }).waitFor()
        const post = async (path, trigger, expected) => {
          const pending = page.waitForResponse((r) => matches(r, 'POST', path), { timeout: 15000 }).catch(() => null)
          await trigger()
          const response = await check(await pending, `POST notifications ${expected === true ? 'read' : 'read-all'}`)
          const body = await response.json()
          if (body?.code !== 0 || body.data !== expected) throw new Error('unexpected read result')
        }
        const initial = await check(await initialRead('/api/v1/notifications/unread-count'), 'GET notifications unread-count')
        const initialBody = await initial.json()
        console.log(`Initial unread fixture count matches: ${initialBody?.code === 0 && initialBody.data === 2}`)
        if (initialBody?.code !== 0 || initialBody.data !== 2) throw new Error('invalid initial unread count')
        step = 'render badge with two unread notifications'
        await waitUnread(2)
        step = 'open popover and render unread rows'
        await page.locator('.notification-btn').click()
        await single.and(page.locator('.unread')).waitFor()
        await remaining.and(page.locator('.unread')).waitFor()
        step = 'mark one read and refresh badge'
        await post(/^\/api\/v1\/notifications\/29001\/read$/, () => single.click(), true)
        await single.and(page.locator(':not(.unread)')).waitFor()
        await waitUnread(1)
        step = 'mark all read and clear badge'
        await post(/^\/api\/v1\/notifications\/read-all$/, () => all.click(), 1)
        await remaining.and(page.locator(':not(.unread)')).waitFor()
        await waitUnread(0)
      })
      if (!passed) {
        console.log(`Notification center failed at: ${step}`)
        throw new Error('notification center smoke incomplete')
      }
      return
    }
    if (group === 'dictionary') {
      const refresh = await run('Real refresh and replay (one test-injected 401)', async () => {
        await check(await initialRead(dictPath), 'GET initial dictionary list')
        const target = `${origin}${dictPath}`
        const rejectOnce = (route) => route.fulfill({ status: 401, json: { code: 401, msg: 'integration test' } })
        await page.route(target, rejectOnce, { times: 1 })
        const rotate = page.waitForResponse((r) => matches(r, 'POST', /^\/auth\/v1\/refresh$/), { timeout: 20000 }).catch(() => null)
        const replay = page.waitForResponse((r) => matches(r, 'GET', /^\/admin-api\/v1\/dict\/types$/) && r.status() === 200, { timeout: 20000 }).catch(() => null)
        await page.reload({ timeout: 15000 })
        await check(await rotate, 'POST /auth/v1/refresh')
        const response = await check(await replay, 'GET dictionary list replay')
        const body = await response.json()
        if (body.code !== 0 || !Array.isArray(body.data)) throw new Error('invalid dictionary list')
      })
      const mutation = refresh && await run('Dictionary type and data CRUD and status', async () => {
        console.log(`Identity advertises system:dict:add: ${dictWritePermission}`)
        const key = `fe029_${randomUUID().replaceAll('-', '').slice(0, 12)}`
        const name = `FE029 ${key}`
        const row = page.getByRole('row').filter({ hasText: key })
        const dialog = page.getByRole('dialog', { name: /\u5b57\u5178\u7c7b\u578b/ })
        const exact = /^\/admin-api\/v1\/dict\/types$/
        const item = /^\/admin-api\/v1\/dict\/types\/\d+$/
        const typeStatus = /^\/admin-api\/v1\/dict\/types\/\d+\/status$/
        const dataList = /^\/admin-api\/v1\/dict\/data$/
        const dataItem = /^\/admin-api\/v1\/dict\/data\/\d+$/
        const dataStatus = /^\/admin-api\/v1\/dict\/data\/\d+\/status$/
        const confirmDelete = () => page.locator('.el-message-box__btns .el-button--primary').click()
        await page.getByRole('button', { name: '\u65b0\u589e\u7c7b\u578b' }).click()
        await dialog.getByPlaceholder('\u5982 \u6027\u522b').fill(name)
        await dialog.getByPlaceholder('\u5982 sys_gender').fill(key)
        const createdList = readList(dictPath)
        await action('POST', exact, () => dialog.getByRole('button', { name: '\u4fdd\u5b58' }).click(), dictPath)
        await row.getByText(name, { exact: true }).waitFor()
        const typeId = await listedId(createdList, 'dictType', key)
        await row.getByRole('button', { name: '\u7f16\u8f91' }).click()
        await dialog.getByPlaceholder('\u5982 \u6027\u522b').fill(`${name} updated`)
        await action('PUT', item, () => dialog.getByRole('button', { name: '\u4fdd\u5b58' }).click(), dictPath, `${dictPath}/${typeId}`)
        await row.getByText(`${name} updated`, { exact: true }).waitFor()

        await row.getByRole('button', { name: '\u6570\u636e', exact: true }).click()
        const drawer = page.getByRole('dialog', { name: `\u5b57\u5178\u6570\u636e \u00b7 ${key}` })
        const dataDialog = page.getByRole('dialog', { name: '\u5b57\u5178\u6570\u636e', exact: true })
        const dataRow = drawer.getByRole('row').filter({ hasText: 'FE029 item' })
        await drawer.getByRole('button', { name: '\u65b0\u589e\u6570\u636e' }).click()
        await dataDialog.getByPlaceholder('\u5982 \u7537').fill('FE029 item')
        await dataDialog.getByPlaceholder('\u5982 0').fill('fe029')
        const createdData = readList(dataPath)
        const saveData = () => dataDialog.getByRole('button', { name: '\u4fdd\u5b58' }).click()
        await action('POST', dataList, saveData, dataPath)
        const dataId = await listedId(createdData, 'dictValue', 'fe029')
        await dataRow.getByRole('button', { name: '\u7f16\u8f91' }).click()
        await dataDialog.getByPlaceholder('\u5982 \u7537').fill('FE029 item updated')
        await action('PUT', dataItem, saveData, dataPath, `${dataPath}/${dataId}`)
        await dataRow.getByText('FE029 item updated', { exact: true }).waitFor()
        await action('PUT', dataStatus, () => dataRow.getByRole('button', { name: '\u505c\u7528' }).click(), `${dataPath}/{id}/status`, `${dataPath}/${dataId}/status`)
        await dataRow.getByText('\u505c\u7528', { exact: true }).waitFor()
        await action('PUT', dataStatus, () => dataRow.getByRole('button', { name: '\u542f\u7528' }).click(), `${dataPath}/{id}/status`, `${dataPath}/${dataId}/status`)
        await dataRow.getByText('\u6b63\u5e38', { exact: true }).waitFor()
        await dataRow.getByRole('button', { name: '\u5220\u9664' }).click()
        await action('DELETE', dataItem, confirmDelete, dataPath, `${dataPath}/${dataId}`)
        await dataRow.waitFor({ state: 'detached' })
        await drawer.locator('.el-drawer__close-btn').click()
        await drawer.waitFor({ state: 'hidden' })

        await action('PUT', typeStatus, () => row.getByRole('button', { name: '\u505c\u7528' }).click(), `${dictPath}/{id}/status`, `${dictPath}/${typeId}/status`)
        await row.getByText('\u505c\u7528', { exact: true }).waitFor()
        await action('PUT', typeStatus, () => row.getByRole('button', { name: '\u542f\u7528' }).click(), `${dictPath}/{id}/status`, `${dictPath}/${typeId}/status`)
        await row.getByText('\u6b63\u5e38', { exact: true }).waitFor()
        await row.getByRole('button', { name: '\u5220\u9664' }).click()
        await action('DELETE', item, confirmDelete, dictPath, `${dictPath}/${typeId}`)
        await row.waitFor({ state: 'detached' })
      })
      if (!refresh || !mutation) throw new Error('dictionary smoke incomplete')
      return
    }
    if (group === 'connector') {
      const passed = await run('Connector list', async () => {
        const response = await initialRead('/integration/v1/connectors')
        const body = await response?.json().catch(() => null)
        const traceId = typeof body?.traceId === 'string' && /^[A-Za-z0-9-]{1,80}$/.test(body.traceId)
          ? body.traceId
          : null
        if (traceId) console.log(`connector trace id: ${traceId}`)
        await check(response, `GET /integration/v1/connectors (code ${Number.isSafeInteger(body?.code) ? body.code : 'none'})`)
        if (body?.code !== 0 || !Array.isArray(body.data?.list) || !Number.isSafeInteger(body.data?.total)) throw new Error('invalid connector page')
      })
      if (!passed) throw new Error('connector smoke incomplete')
      return
    }
    if (group === 'upload') {
      const passed = await run('Local multipart upload', async () => {
        const pending = page.waitForResponse((r) => matches(r, 'POST', /^\/api\/v1\/files\/generic$/), { timeout: 20000 }).catch(() => null)
        await page.locator('input[type=file]').first().setInputFiles({
          name: 'fe029-smoke.png',
          mimeType: 'image/png',
          buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=', 'base64'),
        })
        const response = await pending
        const body = await response?.json().catch(() => null)
        await check(response, `POST /api/v1/files/generic (code ${Number.isSafeInteger(body?.code) ? body.code : 'none'})`)
        if (body?.code !== 0 || typeof body.data?.fileName !== 'string' || !body.data.fileName.trim() || !body.data.bucketName || !body.data.url) {
          throw new Error('invalid upload response fields')
        }
        const result = page.locator('.result-box pre').first()
        await result.waitFor({ timeout: 10000 }).catch(() => { throw new Error('upload result not rendered') })
        let rendered
        try {
          rendered = JSON.parse(await result.textContent())
        } catch {
          throw new Error('invalid rendered upload JSON')
        }
        if (rendered?.objectName !== body.data.fileName) throw new Error('rendered object key differs from upload response')
      })
      if (!passed) throw new Error('upload smoke incomplete')
      return
    }
    throw new Error('unknown business group')
  }
}
