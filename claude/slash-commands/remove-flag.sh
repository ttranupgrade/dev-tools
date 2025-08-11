#!/bin/bash

# Script to remove REACT_APP_UNIFIED_HARDSHIP_UI_ENABLED from both projects

cd /Users/ttran/dev/dev-tools/claude/slash-commands

echo "🚩 Removing REACT_APP_UNIFIED_HARDSHIP_UI_ENABLED from ccp-portal-ui..."
echo -e "remove\nREACT_APP_UNIFIED_HARDSHIP_UI_ENABLED\nccp-portal-ui\nnon-prod\ny" | DEV_ROOT=/Users/ttran/dev node feature-flag-manager.js

echo ""
echo "🚩 Removing REACT_APP_UNIFIED_HARDSHIP_UI_ENABLED from creditline-servicing-ui..."
echo -e "remove\nREACT_APP_UNIFIED_HARDSHIP_UI_ENABLED\ncreditline-servicing-ui\nnon-prod\ny" | DEV_ROOT=/Users/ttran/dev node feature-flag-manager.js

echo ""
echo "✅ Removal process completed for both projects!"