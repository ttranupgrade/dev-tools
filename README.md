# Dev Tools

A collection of development tools and Claude slash commands for team productivity.

## Quick Setup

1. Clone this repository:
   ```bash
   # Option A: Clone the original (if you have access)
   git clone https://github.com/ttranupgrade/dev-tools.git
   
   # Option B: Clone your fork
   git clone https://github.com/YOUR_USERNAME/dev-tools.git
   
   cd dev-tools
   ```

2. Run the setup script:
   ```bash
   ./setup.sh
   ```

3. Start using Claude slash commands!

## Available Tools

### Claude Slash Commands

- **`/feature-flag`** - Manage feature flags in k8s-template configurations

## Usage

Once set up, you can use slash commands in Claude Code:

```
/feature-flag
```

This will prompt you for:
- Feature flag name
- Project name  
- Environment type (prod/non-prod)

The tool will automatically create a branch, add the feature flag to the appropriate environment files, commit changes, and create a pull request.

## Contributing

To add new slash commands:

1. Add your script to `claude/slash-commands/`
2. Update `claude/CLAUDE.md.template` with the new command
3. Update this README