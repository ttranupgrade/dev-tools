#!/usr/bin/env node

const { main: singleProjectMain } = require('./feature-flag-manager.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper function to simulate user input for the single project script
function createMockInput(operation, featureFlagName, projectName, envType) {
  const inputs = [
    operation,
    featureFlagName,
    projectName,
    envType,
    'y' // confirm
  ];
  
  let inputIndex = 0;
  const originalQuestion = require('readline').createInterface;
  
  // Mock readline interface
  const mockInterface = {
    question: (question, callback) => {
      const answer = inputs[inputIndex++] || '';
      console.log(`${question}${answer}`);
      setTimeout(() => callback(answer), 10);
    },
    close: () => {}
  };
  
  return mockInterface;
}

// Main function for bulk operations
async function bulkMain() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚩 Bulk K8s Template Feature Flag Manager');
    console.log('========================================\n');
    console.log('Usage: node bulk-feature-flag-manager.js <operation> <flag-name> <env-type> <project1> [project2] ...');
    console.log('Example: node bulk-feature-flag-manager.js remove REACT_APP_UNIFIED_HARDSHIP_UI_ENABLED non-prod ccp-portal-ui creditline-servicing-ui');
    process.exit(1);
  }
  
  const [operation, featureFlagName, envType, ...projects] = args;
  
  if (!operation || !featureFlagName || !envType || projects.length === 0) {
    console.error('❌ Missing required arguments');
    console.log('Usage: node bulk-feature-flag-manager.js <operation> <flag-name> <env-type> <project1> [project2] ...');
    process.exit(1);
  }
  
  if (!['add', 'remove'].includes(operation)) {
    console.error('❌ Operation must be "add" or "remove"');
    process.exit(1);
  }
  
  if (!['prod', 'non-prod'].includes(envType)) {
    console.error('❌ Environment type must be "prod" or "non-prod"');
    process.exit(1);
  }
  
  console.log('🚩 Bulk K8s Template Feature Flag Manager');
  console.log('========================================\n');
  console.log(`Operation: ${operation.toUpperCase()}`);
  console.log(`Feature Flag: ${featureFlagName}`);
  console.log(`Environment Type: ${envType}`);
  console.log(`Projects: ${projects.join(', ')}`);
  console.log('');
  
  // Process each project
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    console.log(`\n🔄 Processing project ${i + 1}/${projects.length}: ${project}`);
    console.log('='.repeat(50));
    
    try {
      // Use the existing feature-flag-manager with simulated inputs
      const { spawn } = require('child_process');
      
      const child = spawn('node', [
        path.join(__dirname, 'feature-flag-manager.js')
      ], {
        stdio: ['pipe', 'inherit', 'inherit'],
        env: process.env
      });
      
      // Send inputs to the child process
      child.stdin.write(`${operation}\n`);
      child.stdin.write(`${featureFlagName}\n`);
      child.stdin.write(`${project}\n`);
      child.stdin.write(`${envType}\n`);
      child.stdin.write('y\n');
      child.stdin.end();
      
      // Wait for the process to complete
      await new Promise((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Successfully processed ${project}`);
            resolve();
          } else {
            console.error(`❌ Failed to process ${project} (exit code: ${code})`);
            reject(new Error(`Process failed with code ${code}`));
          }
        });
        
        child.on('error', (error) => {
          console.error(`❌ Error processing ${project}:`, error.message);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error(`❌ Error processing ${project}:`, error.message);
      console.log('⚠️  Continuing with next project...\n');
    }
  }
  
  console.log('\n🎉 Bulk operation completed!');
  console.log(`Processed ${projects.length} project(s)`);
}

// Run if called directly
if (require.main === module) {
  bulkMain().catch(error => {
    console.error('❌ Bulk operation failed:', error.message);
    process.exit(1);
  });
}

module.exports = { bulkMain };