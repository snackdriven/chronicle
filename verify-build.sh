#!/bin/bash
# Verification script for Memory MCP Server Phase 1

echo "=== Memory MCP Server - Phase 1 Verification ==="
echo ""

# Check if dist directory exists
if [ -d "dist" ]; then
    echo "✅ Build output exists"
else
    echo "❌ Build output missing - run 'pnpm build'"
    exit 1
fi

# Count type definition files
TYPE_FILES=$(find dist -name "*.d.ts" | wc -l)
echo "✅ Generated $TYPE_FILES type definition files"

# Count JavaScript files
JS_FILES=$(find dist -name "*.js" | wc -l)
echo "✅ Generated $JS_FILES JavaScript files"

# Check main exports
if [ -f "dist/index.d.ts" ]; then
    echo "✅ Main entry point exists"
else
    echo "❌ Main entry point missing"
    exit 1
fi

# Check tool exports
if [ -f "dist/tools/index.d.ts" ]; then
    echo "✅ Tool registry exists"
else
    echo "❌ Tool registry missing"
    exit 1
fi

# Check validation exports
if [ -f "dist/utils/validation.d.ts" ]; then
    echo "✅ Validation utilities exist"
else
    echo "❌ Validation utilities missing"
    exit 1
fi

# Count source files
SRC_FILES=$(find src -name "*.ts" | wc -l)
echo "✅ Source: $SRC_FILES TypeScript files"

echo ""
echo "=== Verification Complete ==="
echo "Phase 1: MCP Tool Interfaces & TypeScript Types ✅"
echo ""
echo "Next steps:"
echo "  - Phase 2: Entity & Relation tools"
echo "  - Phase 3: HTTP server mode"
echo "  - Phase 4: Import/Export scripts"
