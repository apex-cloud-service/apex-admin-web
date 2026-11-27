#!/bin/bash

set -e

# 无论从何处调用，统一以仓库根为工作目录；结果输出到控制台。
# npm run audit 的 HTML 报告输出为 reports/audit/audit.html，本脚本不生成该文件。
cd "$(dirname "$0")/../.."

echo "运行 npm 安全审计..."
npm audit --production

echo "检查过期依赖..."
npx npm-check-updates

echo "运行 Snyk 扫描..."
if command -v snyk &> /dev/null; then
    snyk test
else
    echo "Snyk 未安装，跳过"
fi

echo "安全扫描完成"
