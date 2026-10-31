#!/bin/bash

set -e

# 无论从何处调用，统一以仓库根为工作目录（报告输出 ./reports/lighthouse）
cd "$(dirname "$0")/../.."

URL="${1:-http://localhost:5173}"
OUTPUT_DIR="./reports/lighthouse"

mkdir -p "$OUTPUT_DIR"

echo "运行 Lighthouse 测试: $URL"

npx lighthouse "$URL" \
    --output html \
    --output json \
    --output-path "$OUTPUT_DIR/report" \
    --chrome-flags="--headless" \
    --preset=desktop

echo "Lighthouse 报告已生成: $OUTPUT_DIR/report.html"
