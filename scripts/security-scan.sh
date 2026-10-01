#!/bin/bash

set -e

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
