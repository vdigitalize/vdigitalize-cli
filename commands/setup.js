/**
 * Setup Command
 * Interactive setup flow for creating full-stack projects
 * - Laravel backend with Composer
 * - React frontend with Vite
 * - Git repositories with multiple remotes
 * - GitHub Copilot integration with instructions and prompts
 * - Optional push.sh generation
 */

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import logger from '../utils/logger.js';

// Get current directory path (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate Git URL format (supports custom SSH configs)
 * Accepts:
 * - https://github.com/user/repo.git
 * - git@github.com:user/repo.git
 * - git@github-custom:user/repo.git (custom SSH host aliases)
 * - git@bitbucket.org:user/repo.git
 * - Any valid git SSH URL with custom host
 * @param {string} url - URL to validate
 * @returns {boolean|string} - true if valid, error message if invalid
 */
const validateGitUrl = (url) => {
  if (!url) return 'URL is required';
  
  // HTTPS pattern (GitHub, GitLab, Bitbucket, etc.)
  const httpsPattern = /^https:\/\/[\w.-]+\/[\w.-]+\/[\w.-]+(?:\.git)?$/;
  
  // SSH pattern - supports custom SSH host aliases like git@github-mycompany:user/repo.git
  // Format: git@<host>:<path>.git or git@<host>:<path>
  const sshPattern = /^git@[\w.-]+:[\w./-]+(?:\.git)?$/;
  
  if (httpsPattern.test(url) || sshPattern.test(url)) {
    return true;
  }
  
  return 'Please enter a valid Git URL (https://... or git@host:user/repo.git)';
};

/**
 * Validate folder name (no special characters except hyphen and underscore)
 * @param {string} name - Folder name to validate
 * @returns {boolean|string} - true if valid, error message if invalid
 */
const validateFolderName = (name) => {
  if (!name) return 'Folder name is required';
  if (!/^[\w-]+$/.test(name)) {
    return 'Folder name can only contain letters, numbers, hyphens, and underscores';
  }
  return true;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean|string} - true if valid, error message if invalid
 */
const validateUrl = (url) => {
  if (!url) return 'URL is required';
  try {
    new URL(url);
    return true;
  } catch {
    return 'Please enter a valid URL';
  }
};

/**
 * Execute a shell command with error handling
 * @param {string} command - Command to execute
 * @param {object} options - execSync options
 * @returns {string} - Command output
 */
const runCommand = (command, options = {}) => {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
};

/**
 * Check if a command exists on the system
 * @param {string} command - Command to check
 * @returns {boolean}
 */
const commandExists = (command) => {
  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${checkCmd} ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if a directory exists
 * @param {string} dirPath - Directory path
 * @returns {boolean}
 */
const directoryExists = (dirPath) => {
  return fs.existsSync(dirPath);
};

/**
 * Check system dependencies and return status
 * @returns {object} - Object with dependency status
 */
const checkDependencies = () => {
  const deps = {
    php: commandExists('php'),
    composer: commandExists('composer'),
    node: commandExists('node'),
    npm: commandExists('npm'),
    git: commandExists('git')
  };
  
  // Get versions for installed dependencies
  const versions = {};
  if (deps.php) {
    try {
      const output = execSync('php --version', { encoding: 'utf8', stdio: 'pipe' });
      versions.php = output.match(/PHP (\d+\.\d+(\.\d+)?)/)?.[1] || 'unknown';
    } catch { versions.php = 'unknown'; }
  }
  if (deps.composer) {
    try {
      const output = execSync('composer --version', { encoding: 'utf8', stdio: 'pipe' });
      versions.composer = output.match(/(\d+\.\d+(\.\d+)?)/)?.[1] || 'unknown';
    } catch { versions.composer = 'unknown'; }
  }
  
  return { deps, versions };
};

/**
 * Get the prompts for the setup flow
 * @returns {Array} - Inquirer prompts array
 */
const getSetupPrompts = () => [
  {
    type: 'input',
    name: 'projectName',
    message: 'What is your project name?',
    validate: validateFolderName,
    transformer: (input) => chalk.cyan(input)
  },
  {
    type: 'input',
    name: 'projectDescription',
    message: 'Project description:',
    default: 'A full-stack web application',
    validate: (input) => input.length > 0 || 'Description is required'
  },
  {
    type: 'input',
    name: 'frontendFolder',
    message: 'Frontend folder name:',
    default: 'frontend',
    validate: validateFolderName
  },
  {
    type: 'input',
    name: 'backendFolder',
    message: 'Backend folder name:',
    default: 'backend',
    validate: validateFolderName
  },
  {
    type: 'input',
    name: 'frontendRepoUrl',
    message: 'Frontend Git repository URL:',
    validate: validateGitUrl
  },
  {
    type: 'input',
    name: 'backendRepoUrl',
    message: 'Backend Git repository URL:',
    validate: validateGitUrl
  },
  {
    type: 'input',
    name: 'distRepoUrl',
    message: 'Frontend/dist Git repository URL:',
    validate: validateGitUrl
  },
  {
    type: 'confirm',
    name: 'hasStagingProd',
    message: 'Do you have staging and production environments?',
    default: false
  }
];

/**
 * Get environment URL prompts (only if staging/prod is enabled)
 * @returns {Array} - Inquirer prompts array
 */
const getEnvironmentPrompts = () => [
  {
    type: 'input',
    name: 'frontendStagingUrl',
    message: 'Frontend staging URL:',
    validate: validateUrl
  },
  {
    type: 'input',
    name: 'backendStagingUrl',
    message: 'Backend staging URL:',
    validate: validateUrl
  },
  {
    type: 'input',
    name: 'frontendProductionUrl',
    message: 'Frontend production URL:',
    validate: validateUrl
  },
  {
    type: 'input',
    name: 'backendProductionUrl',
    message: 'Backend production URL:',
    validate: validateUrl
  }
];

/**
 * Get project feature prompts for Copilot context
 * @returns {Array} - Inquirer prompts array
 */
const getProjectFeaturePrompts = () => [
  {
    type: 'checkbox',
    name: 'features',
    message: 'What features will your app include?',
    choices: [
      { name: 'User Authentication (Login/Register/OAuth)', value: 'auth', checked: true },
      { name: 'REST API endpoints', value: 'rest-api', checked: true },
      { name: 'Database with migrations', value: 'database', checked: true },
      { name: 'Admin Dashboard', value: 'admin-dashboard' },
      { name: 'File uploads', value: 'file-uploads' },
      { name: 'Email notifications', value: 'email' },
      { name: 'Real-time features (WebSockets)', value: 'websockets' },
      { name: 'Payment integration', value: 'payments' },
      { name: 'Multi-language support (i18n)', value: 'i18n' },
      { name: 'Dark mode support', value: 'dark-mode' }
    ]
  },
  {
    type: 'list',
    name: 'appType',
    message: 'What type of application is this?',
    choices: [
      { name: 'E-commerce / Online Store', value: 'ecommerce' },
      { name: 'SaaS Platform', value: 'saas' },
      { name: 'Content Management System (CMS)', value: 'cms' },
      { name: 'Social Network / Community', value: 'social' },
      { name: 'Portfolio / Landing Page', value: 'portfolio' },
      { name: 'Internal Business Tool', value: 'internal-tool' },
      { name: 'API Service / Backend Only', value: 'api-service' },
      { name: 'Other', value: 'other' }
    ]
  },
  {
    type: 'list',
    name: 'uiFramework',
    message: 'Which UI framework/library would you like to use?',
    choices: [
      { name: 'Tailwind CSS', value: 'tailwind' },
      { name: 'Material UI (MUI)', value: 'mui' },
      { name: 'Chakra UI', value: 'chakra' },
      { name: 'Ant Design', value: 'antd' },
      { name: 'Bootstrap', value: 'bootstrap' },
      { name: 'Plain CSS / Custom', value: 'custom' }
    ]
  },
  {
    type: 'list',
    name: 'stateManagement',
    message: 'State management preference:',
    choices: [
      { name: 'React Context + Hooks (Simple)', value: 'context' },
      { name: 'Redux Toolkit', value: 'redux' },
      { name: 'Zustand', value: 'zustand' },
      { name: 'Jotai', value: 'jotai' },
      { name: 'TanStack Query (for server state)', value: 'tanstack-query' }
    ]
  }
];

/**
 * Get push.sh and Copilot confirmation prompts
 * @returns {Array} - Inquirer prompts array
 */
const getFinalPrompts = () => [
  {
    type: 'confirm',
    name: 'wantPushSh',
    message: 'Do you want to create push.sh file?',
    default: true
  },
  {
    type: 'confirm',
    name: 'wantCopilotSetup',
    message: 'Do you want to setup GitHub Copilot instructions and prompts?',
    default: true
  }
];

/**
 * Initialize git repository in a directory
 * @param {string} dirPath - Directory path
 * @param {string} remoteName - Remote name (origin)
 * @param {string} remoteUrl - Remote URL
 * @param {ora.Ora} spinner - Ora spinner instance
 */
const initGitRepo = (dirPath, remoteName, remoteUrl, spinner) => {
  const originalCwd = process.cwd();
  
  try {
    process.chdir(dirPath);
    
    spinner.text = `Initializing git in ${path.basename(dirPath)}...`;
    
    // Initialize git if not already initialized
    if (!fs.existsSync(path.join(dirPath, '.git'))) {
      runCommand('git init', { silent: true });
    }
    
    // Add remote
    runCommand(`git remote add ${remoteName} ${remoteUrl}`, { silent: true });
    
    logger.success(`Git initialized in ${path.basename(dirPath)} with remote: ${remoteUrl}`);
  } catch (error) {
    // Remote might already exist, try updating
    try {
      runCommand(`git remote set-url ${remoteName} ${remoteUrl}`, { silent: true });
      logger.success(`Git remote updated in ${path.basename(dirPath)}`);
    } catch {
      throw error;
    }
  } finally {
    process.chdir(originalCwd);
  }
};

/**
 * Create Laravel project using Composer
 * @param {string} projectPath - Base project path
 * @param {string} backendFolder - Backend folder name
 * @param {ora.Ora} spinner - Ora spinner instance
 * @param {boolean} skipBackend - Whether to skip backend creation
 */
const createLaravelProject = async (projectPath, backendFolder, spinner, skipBackend = false) => {
  const backendPath = path.join(projectPath, backendFolder);
  
  if (skipBackend) {
    spinner.text = 'Creating backend folder structure (Composer not available)...';
    spinner.start();
    
    // Create basic folder structure
    await fs.ensureDir(backendPath);
    await fs.writeFile(
      path.join(backendPath, 'README.md'),
      `# Backend

This folder is for your Laravel backend.

## Setup Instructions

1. Install PHP >= 8.1
2. Install Composer from https://getcomposer.org/
3. Run: \`composer create-project laravel/laravel .\`
4. Configure your .env file
5. Run: \`php artisan serve\`
`
    );
    
    spinner.succeed('Backend folder created (install Laravel manually)');
    return backendPath;
  }
  
  spinner.text = 'Creating Laravel project...';
  spinner.start();
  
  try {
    runCommand(`composer create-project laravel/laravel ${backendFolder}`, {
      cwd: projectPath
    });
    
    spinner.succeed('Laravel project created successfully');
    return backendPath;
  } catch (error) {
    spinner.fail('Failed to create Laravel project');
    throw error;
  }
};

/**
 * Create Vite React project (non-interactive)
 * @param {string} projectPath - Base project path
 * @param {string} frontendFolder - Frontend folder name
 * @param {ora.Ora} spinner - Ora spinner instance
 */
const createViteProject = async (projectPath, frontendFolder, spinner) => {
  const frontendPath = path.join(projectPath, frontendFolder);
  
  spinner.text = 'Creating Vite React project...';
  spinner.start();
  
  try {
    // Create Vite project with React template (non-interactive with -- flag)
    // Use spawnSync to properly handle the non-interactive mode
    const result = spawnSync('npm', ['create', 'vite@latest', frontendFolder, '--', '--template', 'react'], {
      cwd: projectPath,
      stdio: 'inherit',
      shell: true
    });
    
    if (result.status !== 0) {
      throw new Error('Vite project creation failed');
    }
    
    spinner.succeed('Vite React project created');
    
    // Install dependencies
    spinner.text = 'Installing frontend dependencies...';
    spinner.start();
    
    runCommand('npm install', { cwd: frontendPath });
    
    spinner.succeed('Frontend dependencies installed');
    
    return frontendPath;
  } catch (error) {
    spinner.fail('Failed to create Vite project');
    throw error;
  }
};

/**
 * Create the dist folder and initialize git
 * @param {string} frontendPath - Frontend folder path
 * @param {string} distRepoUrl - Dist repository URL
 * @param {ora.Ora} spinner - Ora spinner instance
 */
const setupDistFolder = async (frontendPath, distRepoUrl, spinner) => {
  const distPath = path.join(frontendPath, 'dist');
  
  spinner.text = 'Setting up dist folder...';
  spinner.start();
  
  try {
    // Create dist folder if it doesn't exist
    await fs.ensureDir(distPath);
    
    // Create a placeholder .gitkeep file
    await fs.writeFile(path.join(distPath, '.gitkeep'), '');
    
    // Initialize git in dist folder
    initGitRepo(distPath, 'origin', distRepoUrl, spinner);
    
    spinner.succeed('Dist folder configured with git');
    
    return distPath;
  } catch (error) {
    spinner.fail('Failed to setup dist folder');
    throw error;
  }
};

/**
 * Copy and configure push.sh template
 * @param {string} projectPath - Project root path
 * @param {object} config - Project configuration
 * @param {ora.Ora} spinner - Ora spinner instance
 */
const setupPushScript = async (projectPath, config, spinner) => {
  spinner.text = 'Creating push.sh script...';
  spinner.start();
  
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'push.sh');
    const destPath = path.join(projectPath, 'push.sh');
    
    // Read template
    let template = await fs.readFile(templatePath, 'utf8');
    
    // Replace placeholders with actual values
    template = template
      .replace(/{{PROJECT_NAME}}/g, config.projectName)
      .replace(/{{FRONTEND_FOLDER}}/g, config.frontendFolder)
      .replace(/{{BACKEND_FOLDER}}/g, config.backendFolder)
      .replace(/{{FRONTEND_REPO}}/g, config.frontendRepoUrl)
      .replace(/{{BACKEND_REPO}}/g, config.backendRepoUrl)
      .replace(/{{DIST_REPO}}/g, config.distRepoUrl);
    
    // Add environment URLs if available
    if (config.hasStagingProd) {
      template = template
        .replace(/{{FRONTEND_STAGING_URL}}/g, config.frontendStagingUrl)
        .replace(/{{BACKEND_STAGING_URL}}/g, config.backendStagingUrl)
        .replace(/{{FRONTEND_PRODUCTION_URL}}/g, config.frontendProductionUrl)
        .replace(/{{BACKEND_PRODUCTION_URL}}/g, config.backendProductionUrl);
    } else {
      // Remove environment URL placeholders
      template = template
        .replace(/{{FRONTEND_STAGING_URL}}/g, '')
        .replace(/{{BACKEND_STAGING_URL}}/g, '')
        .replace(/{{FRONTEND_PRODUCTION_URL}}/g, '')
        .replace(/{{BACKEND_PRODUCTION_URL}}/g, '');
    }
    
    // Write configured script
    await fs.writeFile(destPath, template);
    
    // Make executable (Unix systems)
    if (process.platform !== 'win32') {
      runCommand(`chmod +x ${destPath}`, { silent: true });
    }
    
    spinner.succeed('push.sh created and made executable');
  } catch (error) {
    spinner.fail('Failed to create push.sh');
    throw error;
  }
};

/**
 * Setup GitHub Copilot instructions and prompts folder
 * @param {string} projectPath - Project root path
 * @param {object} config - Project configuration
 * @param {ora.Ora} spinner - Ora spinner instance
 */
const setupCopilotIntegration = async (projectPath, config, spinner) => {
  spinner.text = 'Setting up GitHub Copilot integration...';
  spinner.start();
  
  try {
    const githubPath = path.join(projectPath, '.github');
    const promptsPath = path.join(githubPath, 'prompts');
    
    // Create directories
    await fs.ensureDir(githubPath);
    await fs.ensureDir(promptsPath);
    
    // Create copilot-instructions.md
    const copilotInstructions = generateCopilotInstructions(config);
    await fs.writeFile(path.join(githubPath, 'copilot-instructions.md'), copilotInstructions);
    
    // Create initial prompt files based on selected features
    const initialPrompts = generateInitialPrompts(config);
    let promptNumber = 1;
    
    for (const prompt of initialPrompts) {
      await fs.writeFile(
        path.join(promptsPath, `prompt_${String(promptNumber).padStart(3, '0')}.md`),
        prompt
      );
      promptNumber++;
    }
    
    // Create prompts README
    const promptsReadme = `# Project Prompts

This folder contains prompts used during development with GitHub Copilot.

## Usage

Each prompt file follows the naming convention: \`prompt_<number>.md\`

When working with GitHub Copilot, you can reference these prompts or add new ones.

## Adding New Prompts

Simply create a new file following the pattern:
- \`prompt_001.md\`
- \`prompt_002.md\`
- etc.

## Generated Prompts

The following prompts were auto-generated based on your project configuration:

${initialPrompts.map((_, i) => `- prompt_${String(i + 1).padStart(3, '0')}.md`).join('\n')}
`;
    
    await fs.writeFile(path.join(promptsPath, 'README.md'), promptsReadme);
    
    spinner.succeed('GitHub Copilot integration configured');
  } catch (error) {
    spinner.fail('Failed to setup Copilot integration');
    throw error;
  }
};

/**
 * Generate Copilot instructions content
 * @param {object} config - Project configuration
 * @returns {string} - Copilot instructions content
 */
const generateCopilotInstructions = (config) => {
  const featuresList = config.features?.map(f => `- ${f}`).join('\n') || '- Standard web application features';
  
  return `# Copilot Instructions for ${config.projectName}

## Project Overview

**Name:** ${config.projectName}
**Description:** ${config.projectDescription}
**Type:** ${config.appType || 'Web Application'}

## Tech Stack

### Frontend
- **Framework:** React with Vite
- **UI Library:** ${config.uiFramework || 'Tailwind CSS'}
- **State Management:** ${config.stateManagement || 'React Context'}
- **Location:** \`/${config.frontendFolder}\`

### Backend
- **Framework:** Laravel (PHP)
- **Location:** \`/${config.backendFolder}\`

## Selected Features

${featuresList}

## Code Style Guidelines

### Frontend (React)
- Use functional components with hooks
- Follow React best practices
- Use TypeScript when applicable
- Keep components small and focused
- Use proper prop validation

### Backend (Laravel)
- Follow Laravel conventions
- Use Eloquent ORM for database operations
- Implement proper validation
- Use Laravel's built-in authentication when available
- Follow RESTful API design principles

## Prompt Logging

**IMPORTANT:** Save all significant prompts to the \`.github/prompts\` folder.

When a user provides a prompt that:
- Defines new features
- Requests architectural decisions
- Describes business logic
- Sets up integrations

Create a new file in \`.github/prompts/\` with the naming format:
\`prompt_<number>.md\`

Example:
\`\`\`
.github/prompts/prompt_001.md
.github/prompts/prompt_002.md
\`\`\`

Each prompt file should contain:
1. The original prompt
2. Date/timestamp
3. Summary of what was implemented
4. Any important decisions made

## Repository Structure

\`\`\`
${config.projectName}/
├── ${config.backendFolder}/     # Laravel API
├── ${config.frontendFolder}/    # React (Vite)
│   └── dist/        # Production build
├── .github/
│   ├── copilot-instructions.md
│   └── prompts/     # Saved prompts
├── README.md
└── push.sh          # Git push script
\`\`\`

## Environment URLs

${config.hasStagingProd ? `
### Staging
- Frontend: ${config.frontendStagingUrl}
- Backend: ${config.backendStagingUrl}

### Production
- Frontend: ${config.frontendProductionUrl}
- Backend: ${config.backendProductionUrl}
` : 'No staging/production URLs configured yet.'}

## Git Repositories

- Frontend: ${config.frontendRepoUrl}
- Backend: ${config.backendRepoUrl}
- Dist: ${config.distRepoUrl}
`;
};

/**
 * Generate initial prompts based on project configuration
 * @param {object} config - Project configuration
 * @returns {Array<string>} - Array of prompt contents
 */
const generateInitialPrompts = (config) => {
  const prompts = [];
  const timestamp = new Date().toISOString();
  
  // Initial project setup prompt
  prompts.push(`# Initial Project Setup

**Date:** ${timestamp}
**Type:** Project Initialization

## Prompt

Set up a new ${config.appType || 'web application'} project called "${config.projectName}".

**Description:** ${config.projectDescription}

## Configuration

- Frontend: React with Vite in \`${config.frontendFolder}/\`
- Backend: Laravel in \`${config.backendFolder}/\`
- UI Framework: ${config.uiFramework || 'Tailwind CSS'}
- State Management: ${config.stateManagement || 'React Context'}

## Selected Features

${config.features?.map(f => `- ${f}`).join('\n') || '- Standard features'}

## Implementation Notes

This project was scaffolded using VDigitalize CLI.
`);

  // Feature-specific prompts
  if (config.features?.includes('auth')) {
    prompts.push(`# Authentication Setup

**Date:** ${timestamp}
**Type:** Feature Implementation

## Prompt

Implement user authentication for ${config.projectName}.

## Requirements

- User registration with email verification
- Login with email/password
- OAuth integration (Google, GitHub)
- Password reset functionality
- JWT token-based API authentication
- Remember me functionality

## Implementation Notes

### Backend (Laravel)
- Use Laravel Sanctum for API authentication
- Create User model with proper migrations
- Implement auth controllers

### Frontend (React)
- Create auth context for state management
- Build login/register forms
- Implement protected routes
- Store tokens securely
`);
  }

  if (config.features?.includes('rest-api')) {
    prompts.push(`# REST API Structure

**Date:** ${timestamp}
**Type:** Architecture

## Prompt

Design the REST API structure for ${config.projectName}.

## API Guidelines

- Use Laravel API resources for response formatting
- Implement proper HTTP status codes
- Version the API (v1, v2, etc.)
- Use middleware for authentication
- Implement rate limiting

## Endpoint Structure

\`\`\`
/api/v1/
├── /auth
│   ├── POST /login
│   ├── POST /register
│   ├── POST /logout
│   └── POST /refresh
├── /users
│   ├── GET /me
│   └── PUT /me
└── /resources
    ├── GET /
    ├── POST /
    ├── GET /:id
    ├── PUT /:id
    └── DELETE /:id
\`\`\`
`);
  }

  if (config.features?.includes('database')) {
    prompts.push(`# Database Schema Design

**Date:** ${timestamp}
**Type:** Database Architecture

## Prompt

Design the database schema for ${config.projectName}.

## Guidelines

- Use Laravel migrations
- Implement proper relationships
- Add necessary indexes
- Use soft deletes where appropriate
- Include timestamps

## Core Tables

- users
- password_resets
- personal_access_tokens
- [Add project-specific tables]

## Implementation Notes

Run migrations: \`php artisan migrate\`
Create models: \`php artisan make:model ModelName -m\`
`);
  }

  // App type specific prompt
  const appTypePrompts = {
    'ecommerce': `# E-commerce Features

**Date:** ${timestamp}
**Type:** Feature Planning

## Prompt

Plan the e-commerce features for ${config.projectName}.

## Core Features

- Product catalog with categories
- Shopping cart
- Checkout process
- Order management
- Inventory tracking
- Payment processing
- Shipping integration
`,
    'saas': `# SaaS Platform Features

**Date:** ${timestamp}
**Type:** Feature Planning

## Prompt

Plan the SaaS platform features for ${config.projectName}.

## Core Features

- Multi-tenant architecture
- Subscription management
- Usage billing
- Team/Organization support
- Role-based access control
- Admin dashboard
- Analytics and reporting
`,
    'cms': `# CMS Features

**Date:** ${timestamp}
**Type:** Feature Planning

## Prompt

Plan the CMS features for ${config.projectName}.

## Core Features

- Content management
- Media library
- Page builder
- SEO tools
- User roles and permissions
- Content scheduling
- Version control
`
  };

  if (config.appType && appTypePrompts[config.appType]) {
    prompts.push(appTypePrompts[config.appType]);
  }

  return prompts;
};

/**
 * Main setup command handler
 */
export const setup = async () => {
  logger.banner();
  logger.title('Project Setup Wizard');
  
  let spinner = ora();
  
  try {
    // Check system dependencies first
    logger.section('System Check');
    const { deps, versions } = checkDependencies();
    
    let skipBackend = false;
    
    if (!deps.php || !deps.composer) {
      logger.warn('PHP or Composer not found on your system.');
      
      if (!deps.php) {
        logger.info('PHP is not installed or not in PATH');
        logger.dim('  Install: https://www.php.net/downloads');
        if (process.platform === 'darwin') logger.dim('  macOS: brew install php');
        if (process.platform === 'linux') logger.dim('  Linux: sudo apt install php');
      }
      
      if (!deps.composer) {
        logger.info('Composer is not installed or not in PATH');
        logger.dim('  Install: https://getcomposer.org/download/');
        if (process.platform === 'darwin') logger.dim('  macOS: brew install composer');
        if (process.platform === 'linux') logger.dim('  Linux: sudo apt install composer');
      }
      
      console.log();
      
      const { continueWithoutBackend } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continueWithoutBackend',
        message: 'Continue without Laravel setup? (You can install it manually later)',
        default: true
      }]);
      
      if (!continueWithoutBackend) {
        logger.error('Please install PHP and Composer, then run vdigitalize setup again.');
        process.exit(1);
      }
      
      skipBackend = true;
    } else {
      logger.success(`PHP ${versions.php} detected`);
      logger.success(`Composer ${versions.composer} detected`);
    }
    
    if (!deps.node || !deps.npm) {
      logger.error('Node.js and npm are required. Please install them first.');
      process.exit(1);
    }
    
    if (!deps.git) {
      logger.error('Git is required. Please install it first.');
      process.exit(1);
    }
    
    // Step 1: Collect basic project info
    logger.section('Project Configuration');
    const basicAnswers = await inquirer.prompt(getSetupPrompts());
    
    // Step 2: Get project features for Copilot context
    logger.section('Project Features');
    logger.info('These selections help configure GitHub Copilot instructions.');
    const featureAnswers = await inquirer.prompt(getProjectFeaturePrompts());
    
    // Step 3: Get environment URLs if needed
    let envAnswers = {};
    if (basicAnswers.hasStagingProd) {
      logger.section('Environment URLs');
      envAnswers = await inquirer.prompt(getEnvironmentPrompts());
    }
    
    // Step 4: Final options
    const finalAnswers = await inquirer.prompt(getFinalPrompts());
    
    // Combine all answers
    const config = { ...basicAnswers, ...featureAnswers, ...envAnswers, ...finalAnswers };
    
    // Validate project directory doesn't exist
    const projectPath = path.join(process.cwd(), config.projectName);
    
    if (directoryExists(projectPath)) {
      logger.error(`Directory "${config.projectName}" already exists. Please choose a different name.`);
      process.exit(1);
    }
    
    // Start project creation
    logger.title('Creating Project');
    
    // Create project directory
    spinner.text = 'Creating project directory...';
    spinner.start();
    
    await fs.ensureDir(projectPath);
    spinner.succeed(`Created project directory: ${config.projectName}`);
    
    // Create Laravel backend
    logger.section('Backend Setup (Laravel)');
    const backendPath = await createLaravelProject(projectPath, config.backendFolder, spinner, skipBackend);
    
    // Create Vite React frontend
    logger.section('Frontend Setup (Vite + React)');
    const frontendPath = await createViteProject(projectPath, config.frontendFolder, spinner);
    
    // Setup Git repositories
    logger.section('Git Configuration');
    
    // Initialize root git
    spinner.text = 'Initializing git in project root...';
    spinner.start();
    
    runCommand('git init', { cwd: projectPath, silent: true });
    spinner.succeed('Git initialized in project root');
    
    // Setup git in backend
    spinner = ora();
    initGitRepo(backendPath, 'origin', config.backendRepoUrl, spinner);
    
    // Setup git in frontend
    initGitRepo(frontendPath, 'origin', config.frontendRepoUrl, spinner);
    
    // Setup dist folder with git
    await setupDistFolder(frontendPath, config.distRepoUrl, spinner);
    
    // Create push.sh if requested
    if (config.wantPushSh) {
      logger.section('Push Script');
      await setupPushScript(projectPath, config, spinner);
    }
    
    // Setup Copilot integration if requested
    if (config.wantCopilotSetup) {
      logger.section('GitHub Copilot Integration');
      await setupCopilotIntegration(projectPath, config, spinner);
    }
    
    // Create README.md
    logger.section('Documentation');
    spinner.text = 'Creating README.md...';
    spinner.start();
    
    const readmeContent = generateReadme(config);
    await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);
    spinner.succeed('README.md created');
    
    // Create .gitignore for root
    spinner.text = 'Creating .gitignore...';
    spinner.start();
    
    const gitignoreContent = `# Dependencies
node_modules/

# Environment files
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Build outputs
dist/
build/
`;
    
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
    spinner.succeed('.gitignore created');
    
    // Success message
    logger.title('Setup Complete! 🎉');
    
    console.log(chalk.green('  Your project has been created successfully!'));
    console.log();
    console.log(chalk.white('  Project structure:'));
    console.log(chalk.gray(`  ${config.projectName}/`));
    console.log(chalk.gray(`  ├── ${config.backendFolder}/    (Laravel)`));
    console.log(chalk.gray(`  ├── ${config.frontendFolder}/   (Vite + React)`));
    console.log(chalk.gray(`  │   └── dist/       (Build output)`));
    if (config.wantCopilotSetup) {
      console.log(chalk.gray('  ├── .github/'));
      console.log(chalk.gray('  │   ├── copilot-instructions.md'));
      console.log(chalk.gray('  │   └── prompts/'));
    }
    console.log(chalk.gray('  ├── README.md'));
    console.log(chalk.gray('  ├── .gitignore'));
    if (config.wantPushSh) {
      console.log(chalk.gray('  └── push.sh'));
    }
    console.log();
    
    console.log(chalk.white('  Next steps:'));
    console.log(chalk.cyan(`  1. cd ${config.projectName}`));
    if (!skipBackend) {
      console.log(chalk.cyan(`  2. cd ${config.backendFolder} && php artisan serve`));
    } else {
      console.log(chalk.cyan(`  2. Install Laravel in ${config.backendFolder}/ when ready`));
    }
    console.log(chalk.cyan(`  3. cd ${config.frontendFolder} && npm run dev`));
    console.log();
    
    if (config.wantPushSh) {
      console.log(chalk.white('  To push all repositories:'));
      console.log(chalk.cyan('  ./push.sh "Your commit message"'));
      console.log();
    }
    
    if (config.wantCopilotSetup) {
      console.log(chalk.white('  GitHub Copilot:'));
      console.log(chalk.cyan('  Instructions configured in .github/copilot-instructions.md'));
      console.log(chalk.cyan('  Prompts will be saved to .github/prompts/'));
      console.log();
    }
    
    logger.success('Happy coding! 🚀');
    logger.newLine();
    
  } catch (error) {
    spinner.fail('Setup failed');
    logger.error(error.message);
    logger.newLine();
    logger.info('If you need help, run: vdigitalize doctor');
    process.exit(1);
  }
};

/**
 * Generate README content for the project
 * @param {object} config - Project configuration
 * @returns {string} - README content
 */
const generateReadme = (config) => {
  let content = `# ${config.projectName}

${config.projectDescription}

## Tech Stack

- **Frontend:** React with Vite
- **Backend:** Laravel (PHP)
- **UI:** ${config.uiFramework || 'Tailwind CSS'}
- **State:** ${config.stateManagement || 'React Context'}

## Project Structure

\`\`\`
${config.projectName}/
├── ${config.backendFolder}/     # Laravel API
├── ${config.frontendFolder}/    # React (Vite)
│   └── dist/        # Production build
${config.wantCopilotSetup ? `├── .github/
│   ├── copilot-instructions.md
│   └── prompts/
` : ''}├── README.md
└── push.sh          # Git push script
\`\`\`

## Getting Started

### Backend (Laravel)

\`\`\`bash
cd ${config.backendFolder}
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
\`\`\`

### Frontend (React)

\`\`\`bash
cd ${config.frontendFolder}
npm install
npm run dev
\`\`\`

## Features

${config.features?.map(f => `- ${f}`).join('\n') || '- Standard web application features'}

## Git Repositories

- **Frontend:** ${config.frontendRepoUrl}
- **Backend:** ${config.backendRepoUrl}
- **Dist:** ${config.distRepoUrl}
`;

  if (config.hasStagingProd) {
    content += `
## Environment URLs

### Staging
- Frontend: ${config.frontendStagingUrl}
- Backend: ${config.backendStagingUrl}

### Production
- Frontend: ${config.frontendProductionUrl}
- Backend: ${config.backendProductionUrl}
`;
  }

  content += `
## Deployment

Use the push script to commit and push changes to all repositories:

\`\`\`bash
./push.sh "Your commit message"
\`\`\`

${config.wantCopilotSetup ? `
## GitHub Copilot

This project includes GitHub Copilot configuration:

- \`.github/copilot-instructions.md\` - Instructions for Copilot
- \`.github/prompts/\` - Saved prompts for reference
` : ''}

## Created with ❤️ by VDigitalize CLI
`;

  return content;
};

export default setup;
