#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const root = process.cwd()
if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log('Usage (from frontend root): node scripts/integration/api-route-audit.mjs [backend-root] [markdown-output]')
  process.exit(0)
}
const apiDir = path.join(root, 'src/api')
const backendRoot = path.resolve(root, process.argv[2] || '../apex-scaffold')
const backendDoc = path.join(backendRoot, 'docs/03-api/API_ROUTES.md')
const markdownOut = process.argv[3] ? path.resolve(root, process.argv[3]) : null
const methods = new Map([
  ['get', 'GET'],
  ['post', 'POST'],
  ['put', 'PUT'],
  ['del', 'DELETE'],
])

function normalizeRoute(route) {
  return route.replace(/\$\{[^}]+\}/g, '{param}').replace(/\{[^}]+\}/g, '{param}').replace(/\/+/g, '/')
}

function readRoute(node) {
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map((span) => {
      const expression = span.expression.getText()
      return `\${${expression}}${span.literal.text}`
    }).join('')
  }
  return null
}

function objectProperty(node, name) {
  if (!node || !ts.isObjectLiteralExpression(node)) return null
  const property = node.properties.find((item) =>
    (ts.isPropertyAssignment(item) || ts.isShorthandPropertyAssignment(item)) &&
    item.name && (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) &&
    item.name.text === name)
  return property && ts.isPropertyAssignment(property) ? property.initializer : null
}

function collectCalls(node, found) {
  if (ts.isCallExpression(node)) {
    const callee = node.expression
    const name = ts.isIdentifier(callee) ? callee.text : null
    if (name && methods.has(name) && node.arguments.length) {
      const route = readRoute(node.arguments[0])
      if (route) found.push({ method: methods.get(name), route, dynamic: route.includes('${') })
    } else if (name === 'request' && node.arguments.length) {
      const config = node.arguments[0]
      const route = readRoute(objectProperty(config, 'url'))
      const method = readRoute(objectProperty(config, 'method'))?.toUpperCase() || 'GET?'
      if (route) found.push({ method, route, dynamic: route.includes('${') })
    }
  }
  ts.forEachChild(node, (child) => collectCalls(child, found))
}

function exportedFunctions(sourceFile) {
  const results = []
  for (const statement of sourceFile.statements) {
    if (!ts.canHaveModifiers(statement) || !ts.getModifiers(statement)?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)) continue
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      results.push({ name: statement.name.text, body: statement.body })
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) {
          results.push({ name: declaration.name.text, body: declaration.initializer.body })
        }
      }
    }
  }
  return results
}

function collectSourcePaths(directory, found) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory() && !['.git', 'node_modules', 'target', 'build', 'dist', '.idea'].includes(entry.name)) {
      collectSourcePaths(filename, found)
    }
    else if (entry.isFile() && entry.name.endsWith('.java') && filename.includes(`${path.sep}src${path.sep}main${path.sep}java${path.sep}`)) {
      const content = fs.readFileSync(filename, 'utf8')
      for (const match of content.matchAll(/["'](\/(?:api|admin-api|auth|integration|oauth2)\/[^"']+)["']/g)) {
        const route = normalizeRoute(match[1].split('?')[0])
        if (!found.has(route)) found.set(route, path.relative(backendRoot, filename))
      }
    }
  }
}

const docText = fs.readFileSync(backendDoc, 'utf8')
const backendRoutes = new Set()
for (const line of docText.split(/\r?\n/)) {
  const match = line.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/)
  if (!match) continue
  const verbs = match[1].split('/').map((item) => item.trim().toUpperCase())
  const routes = [...match[2].matchAll(/`([^`]+)`/g)].map((item) => item[1])
  const absoluteBase = routes.find((route) => route.startsWith('/'))
  const relativeBase = absoluteBase?.replace(/\/[^/]+$/, '')
  const expandedRoutes = routes.map((route) =>
    route.startsWith('/') && !/^\/(api|admin-api|auth|integration|oauth2)\//.test(route) && relativeBase
      ? `${relativeBase}${route}`
      : route)
  for (const verb of verbs) for (const route of expandedRoutes) backendRoutes.add(`${verb} ${normalizeRoute(route)}`)
}
const sourcePaths = new Map()
collectSourcePaths(backendRoot, sourcePaths)

const rows = []
for (const filename of fs.readdirSync(apiDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts')).sort()) {
  const file = path.join(apiDir, filename)
  const source = fs.readFileSync(file, 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  for (const fn of exportedFunctions(ast)) {
    const calls = []
    if (fn.body) collectCalls(fn.body, calls)
    const unique = [...new Map(calls.map((call) =>
      [`${call.method} ${call.route}`, call])).values()]
    if (!unique.length) {
      rows.push({ file: filename, function: fn.name, method: '-', route: '-', status: 'NO_STATIC_HTTP_CALL' })
      continue
    }
    for (const call of unique) {
      const routePath = normalizeRoute(call.route.split('?')[0])
      const verbMatches = backendRoutes.has(`${call.method} ${routePath}`)
      const sourcePath = sourcePaths.get(routePath)
      const status = verbMatches
        ? call.dynamic ? 'DOC_MATCH_DYNAMIC' : 'DOC_MATCH'
        : sourcePath ? 'SOURCE_PATH_FOUND_DOC_MISSING'
        : call.dynamic ? 'DYNAMIC_ROUTE_REVIEW' : 'NOT_IN_ROUTE_INDEX'
      rows.push({ file: filename, function: fn.name, method: call.method, route: call.route, status, sourcePath })
    }
  }
}

const counts = rows.reduce((result, row) => {
  result[row.status] = (result[row.status] || 0) + 1
  return result
}, {})
const lines = [
  '# Frontend API Route Audit',
  '',
  `- Source: \`src/api/*.ts\` exported functions (${new Set(rows.map((row) => `${row.file}:${row.function}`)).size} functions).`,
  `- Backend route index: \`${path.relative(root, backendDoc)}\`.`,
  '- `DOC_MATCH` statuses compare normalized method/path to the route index; `SOURCE_PATH_FOUND_DOC_MISSING` means the path literal exists in backend Java source but is absent from the route index. Neither status proves runtime behavior or successful E2E.',
  `- Status totals: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ')}.`,
  '',
  '| API module | Export | Method | Path | Static status | Backend source evidence |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| \`${row.file}\` | \`${row.function}\` | ${row.method} | \`${row.route}\` | ${row.status} | ${row.sourcePath ? `\`${row.sourcePath}\`` : '-'} |`),
  '',
]
const report = lines.join('\n')
if (markdownOut) fs.writeFileSync(markdownOut, report)
else process.stdout.write(report)
