#!/bin/bash

# Dev Tools Setup Script
# This script helps team members set up Claude slash commands

set -e

echo "🔧 Setting up dev-tools..."

# Get the absolute path to the dev-tools directory
DEV_TOOLS_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📁 Dev tools located at: $DEV_TOOLS_PATH"

# Check if CLAUDE.md exists in current directory or parent directories
CLAUDE_MD_PATH=""
CURRENT_DIR="$(pwd)"

while [[ "$CURRENT_DIR" != "/" ]]; do
    if [[ -f "$CURRENT_DIR/CLAUDE.md" ]]; then
        CLAUDE_MD_PATH="$CURRENT_DIR/CLAUDE.md"
        break
    fi
    CURRENT_DIR="$(dirname "$CURRENT_DIR")"
done

if [[ -z "$CLAUDE_MD_PATH" ]]; then
    echo "📝 No CLAUDE.md found. Creating one in current directory..."
    CLAUDE_MD_PATH="$(pwd)/CLAUDE.md"
    cp "$DEV_TOOLS_PATH/claude/CLAUDE.md.template" "$CLAUDE_MD_PATH"
else
    echo "📝 Found existing CLAUDE.md at: $CLAUDE_MD_PATH"
    echo "   You can manually add commands from: $DEV_TOOLS_PATH/claude/CLAUDE.md.template"
fi

# Update the template with the actual path
sed -i.bak "s|PATH_TO_DEV_TOOLS|$DEV_TOOLS_PATH|g" "$CLAUDE_MD_PATH"
rm -f "$CLAUDE_MD_PATH.bak"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Available slash commands:"
echo "   /feature-flag - Manage k8s-template feature flags"
echo ""
echo "🚀 You can now use these commands in Claude Code!"
echo ""
echo "💡 Tip: If you have an existing CLAUDE.md, merge the commands manually from:"
echo "   $DEV_TOOLS_PATH/claude/CLAUDE.md.template"