#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper function to execute shell commands
function executeCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Helper function to get current branch
function getCurrentBranch() {
  try {
    return executeCommand('git rev-parse --abbrev-ref HEAD', { silent: true }).trim();
  } catch {
    return null;
  }
}

// Helper function to check if there are uncommitted changes
function hasUncommittedChanges() {
  try {
    const status = executeCommand('git status --porcelain', { silent: true });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

// Helper function to add feature flag to values.yaml file
function addFeatureFlagToFile(filePath, featureFlagName) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  console.log(`✏️  Updating ${filePath}...`);
  
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the feature flag already exists
  if (content.includes(`${featureFlagName}:`)) {
    console.log(`⚠️  Feature flag ${featureFlagName} already exists in ${filePath}`);
    return false;
  }
  
  // If file is empty or only has comments, create basic structure
  if (!content.trim() || !content.includes(':')) {
    content = `# Feature flags for this environment\n${featureFlagName}: true\n`;
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added ${featureFlagName}: true to ${filePath} (created new structure)`);
    return true;
  }
  
  // Add the feature flag at the end of the file
  // Ensure there's a newline at the end
  if (!content.endsWith('\n')) {
    content += '\n';
  }
  content += `${featureFlagName}: true\n`;
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content);
  console.log(`✅ Added ${featureFlagName}: true to ${filePath}`);
  return true;
}

// Helper function to get available projects
function getAvailableProjects() {
  const applicationsDir = 'v2/applications';
  if (!fs.existsSync(applicationsDir)) {
    return [];
  }
  
  return fs.readdirSync(applicationsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();
}

// Main function
async function main() {
  console.log('🚩 K8s Template Feature Flag Manager');
  console.log('====================================\n');

  let originalBranch = null;
  let stashCreated = false;

  try {
    // Get dev root from environment variable
    const devRoot = process.env.DEV_ROOT;
    if (!devRoot) {
      console.error('DEV_ROOT environment variable not set. Please run the setup script first.');
      process.exit(1);
    }

    // Navigate to k8s-template directory
    const k8sTemplatePath = path.join(devRoot, 'k8s-template');
    if (!fs.existsSync(k8sTemplatePath)) {
      console.error(`k8s-template directory not found at: ${k8sTemplatePath}`);
      console.error('Please ensure k8s-template is cloned in your dev root directory.');
      process.exit(1);
    }

    process.chdir(k8sTemplatePath);
    console.log(`📁 Working in directory: ${k8sTemplatePath}\n`);

    // Save current branch and stash changes if needed
    originalBranch = getCurrentBranch();
    console.log(`📍 Current branch: ${originalBranch}`);

    if (hasUncommittedChanges()) {
      console.log('💾 Stashing uncommitted changes...');
      executeCommand('git stash push -m "feature-flag-manager temporary stash"');
      stashCreated = true;
    }

    // Step 1: Ask for feature flag name
    const featureFlagName = await askQuestion('What is the feature flag name to create? ');
    if (!featureFlagName) {
      console.log('Feature flag name is required. Exiting.');
      process.exit(1);
    }

    // Step 2: Show available projects and ask for project name
    const availableProjects = getAvailableProjects();
    if (availableProjects.length > 0) {
      console.log('\n📋 Available projects:');
      availableProjects.slice(0, 10).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project}`);
      });
      if (availableProjects.length > 10) {
        console.log(`  ... and ${availableProjects.length - 10} more`);
      }
      console.log('');
    }

    const projectName = await askQuestion('What project is this for? ');
    if (!projectName) {
      console.log('Project name is required. Exiting.');
      process.exit(1);
    }

    // Check if project exists
    const projectPath = `v2/applications/${projectName}`;
    if (!fs.existsSync(projectPath)) {
      console.log(`⚠️  Project '${projectName}' not found in k8s-template applications.`);
      console.log(`Expected path: ${projectPath}`);
      const create = await askQuestion('Would you like to continue anyway? (y/n) ');
      if (create.toLowerCase() !== 'y' && create.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        process.exit(0);
      }
    }

    // Step 3: Ask for environment type
    let envType;
    while (true) {
      envType = await askQuestion('Is this for "prod" or "non-prod" environments? ');
      if (envType === 'prod' || envType === 'non-prod') {
        break;
      }
      console.log('Please enter either "prod" or "non-prod"');
    }

    console.log('\n📋 Summary:');
    console.log(`Feature Flag: ${featureFlagName}`);
    console.log(`Project: ${projectName}`);
    console.log(`Environment Type: ${envType}`);
    console.log('');

    const confirm = await askQuestion('Proceed with these settings? (y/n) ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Operation cancelled.');
      process.exit(0);
    }

    // Step 4: Checkout master branch and pull latest
    console.log('\n🔄 Checking out master branch and pulling latest...');
    executeCommand('git fetch origin');
    executeCommand('git checkout master');
    executeCommand('git pull origin master');

    // Step 5: Determine which environment directories to update
    const envDirs = [];
    if (envType === 'prod') {
      envDirs.push('prod');
    } else {
      // Non-prod environments: main, ondemand, stage, preprod
      envDirs.push('main', 'ondemand', 'stage', 'preprod');
    }

    console.log(`\n📝 Will update ${envDirs.length} environment(s) for project ${projectName}:`);
    envDirs.forEach(env => console.log(`  - ${projectPath}/${env}/`));

    // Step 6: Create a new branch for changes
    const branchName = `add-${featureFlagName}-${projectName}-${envType}-${Date.now()}`;
    console.log(`\n🌿 Creating new branch: ${branchName}`);
    executeCommand(`git checkout -b ${branchName}`);

    // Step 7: Update project environment files
    let filesUpdated = 0;
    
    for (const env of envDirs) {
      const envDir = path.join(projectPath, env);
      const valuesFile = path.join(envDir, 'values.yaml');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(envDir)) {
        console.log(`📁 Creating directory: ${envDir}`);
        fs.mkdirSync(envDir, { recursive: true });
      }
      
      if (addFeatureFlagToFile(valuesFile, featureFlagName)) {
        filesUpdated++;
      }
    }

    if (filesUpdated === 0) {
      console.log('\n❌ No files were updated. Exiting.');
      process.exit(1);
    }

    // Step 8: Commit changes
    console.log('\n📦 Committing changes...');
    executeCommand('git add .');
    
    const commitMessage = `Add ${featureFlagName} feature flag for ${projectName} in ${envType} environments

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`;
    
    executeCommand(`git commit -m "${commitMessage}"`);

    // Step 9: Push branch and create pull request
    console.log('\n🚀 Pushing branch and creating pull request...');
    
    // Try to find a suitable remote for pushing (prefer ttranupgrade, fallback to origin)
    let pushRemote = 'origin';
    try {
      const remotes = executeCommand('git remote', { silent: true }).split('\n').filter(r => r.trim());
      if (remotes.includes('ttranupgrade')) {
        pushRemote = 'ttranupgrade';
      }
    } catch (error) {
      // Use default origin if remote command fails
    }
    
    console.log(`📤 Pushing to remote: ${pushRemote}`);
    executeCommand(`git push -u ${pushRemote} ${branchName}`);
    
    // Create PR using GitHub CLI
    const prTitle = `Add ${featureFlagName} feature flag for ${projectName} (${envType})`;
    const prBody = `## Summary
- Add \`${featureFlagName}: true\` to ${envType} environment configurations for ${projectName}
- Updated ${filesUpdated} environment file(s)

## Environment files updated:
${envDirs.map(env => `- ${projectPath}/${env}/values.yaml`).join('\n')}

🤖 Generated with Claude Code`;

    executeCommand(`gh pr create --title "${prTitle}" --body "$(cat <<'EOF'
${prBody}
EOF
)"`);
    
    console.log('\n✅ Pull request created successfully!');

    // Step 10: Return to original branch and restore stash
    console.log('\n🔄 Returning to original state...');
    if (originalBranch && originalBranch !== 'master') {
      console.log(`📍 Checking out original branch: ${originalBranch}`);
      executeCommand(`git checkout ${originalBranch}`);
    }

    if (stashCreated) {
      console.log('💾 Restoring stashed changes...');
      executeCommand('git stash pop');
    }

    console.log('\n🎉 Task completed successfully!');
    console.log(`Branch state restored to: ${originalBranch || 'master'}`);

  } catch (error) {
    console.error('\n❌ An error occurred:', error.message);
    
    // Attempt to restore original state on error
    try {
      if (originalBranch && originalBranch !== 'master') {
        console.log(`🔄 Attempting to restore original branch: ${originalBranch}`);
        executeCommand(`git checkout ${originalBranch}`);
      }
      
      if (stashCreated) {
        console.log('💾 Attempting to restore stashed changes...');
        executeCommand('git stash pop');
      }
    } catch (restoreError) {
      console.error('⚠️  Could not fully restore original state:', restoreError.message);
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };