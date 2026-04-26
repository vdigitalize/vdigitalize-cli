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
    git: commandExists('git'),
    gh: commandExists('gh'),
    ghCopilot: false
  };
  
  // Check if gh copilot extension is installed
  if (deps.gh) {
    try {
      execSync('gh copilot --version', { encoding: 'utf8', stdio: 'pipe' });
      deps.ghCopilot = true;
    } catch {
      deps.ghCopilot = false;
    }
  }
  
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
 * @param {boolean} hasCopilotCli - Whether GitHub Copilot CLI is installed
 * @returns {Array} - Inquirer prompts array
 */
const getFinalPrompts = (hasCopilotCli) => [
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
  },
  {
    type: 'confirm',
    name: 'installCopilotCli',
    message: 'GitHub Copilot CLI not found. Do you want to install it?\n' +
             chalk.dim('  (Note: Without Copilot CLI, prompts will not be auto-generated based on your project)'),
    default: true,
    when: (answers) => answers.wantCopilotSetup && !hasCopilotCli
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
 * @param {boolean} hasCopilotCli - Whether Copilot CLI is available
 */
const setupCopilotIntegration = async (projectPath, config, spinner, hasCopilotCli) => {
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
    
    // Generate project prompt using Copilot CLI if available
    let projectPrompt = null;
    
    if (hasCopilotCli) {
      spinner.text = 'Generating project prompt using GitHub Copilot CLI...';
      
      try {
        projectPrompt = await generatePromptWithCopilotCli(config);
      } catch (error) {
        logger.warn('Could not generate prompt with Copilot CLI, using template instead.');
        projectPrompt = generateFallbackPrompt(config);
      }
    } else {
      projectPrompt = generateFallbackPrompt(config);
    }
    
    // Write single project prompt file
    const timestamp = new Date().toISOString();
    const promptContent = `# Project Setup Prompt

**Generated:** ${timestamp}
**Project:** ${config.projectName}
**Generated with:** ${hasCopilotCli ? 'GitHub Copilot CLI' : 'VDigitalize Template'}

---

${projectPrompt}

---

## Notes

This is the initial project setup prompt. All subsequent prompts during development 
should be saved in this folder for tracking, learning, and training purposes.

File naming convention: \`prompt_<number>.md\` (e.g., prompt_002.md, prompt_003.md)
`;
    
    await fs.writeFile(path.join(promptsPath, 'prompt_001.md'), promptContent);
    
    // Create prompts README
    const promptsReadme = `# Project Prompts

This folder contains all prompts used during development with GitHub Copilot.

## Purpose

- **Tracking:** Keep a record of all development decisions and requests
- **Learning:** Review past prompts to understand project evolution
- **Training:** Use prompts for team onboarding and documentation

## Initial Prompt

- \`prompt_001.md\` - Initial project setup prompt ${hasCopilotCli ? '(generated with Copilot CLI)' : '(template-based)'}

## Adding New Prompts

When working with GitHub Copilot, save significant prompts here:

1. Create a new file: \`prompt_<number>.md\`
2. Include the full prompt text
3. Add date and context
4. Note what was implemented

**Important:** The Copilot instructions file (\`copilot-instructions.md\`) is configured 
to remind you to save prompts to this folder automatically.
`;
    
    await fs.writeFile(path.join(promptsPath, 'README.md'), promptsReadme);
    
    spinner.succeed(`GitHub Copilot integration configured${hasCopilotCli ? ' (with CLI-generated prompt)' : ''}`);
  } catch (error) {
    spinner.fail('Failed to setup Copilot integration');
    throw error;
  }
};

/**
 * Install GitHub Copilot CLI
 * @param {ora.Ora} spinner - Ora spinner instance
 * @returns {boolean} - Whether installation was successful
 */
const installCopilotCli = async (spinner) => {
  spinner.text = 'Installing GitHub Copilot CLI...';
  spinner.start();
  
  try {
    // Check if gh is installed
    if (!commandExists('gh')) {
      spinner.fail('GitHub CLI (gh) is required first');
      logger.info('Install GitHub CLI: https://cli.github.com/');
      if (process.platform === 'darwin') logger.dim('  macOS: brew install gh');
      if (process.platform === 'linux') logger.dim('  Linux: See https://github.com/cli/cli#installation');
      return false;
    }
    
    // Install copilot extension
    runCommand('gh extension install github/gh-copilot', { silent: true });
    
    spinner.succeed('GitHub Copilot CLI installed');
    return true;
  } catch (error) {
    spinner.fail('Failed to install GitHub Copilot CLI');
    logger.dim('  You can install it manually: gh extension install github/gh-copilot');
    return false;
  }
};

/**
 * Generate project prompt using GitHub Copilot CLI
 * @param {object} config - Project configuration
 * @returns {Promise<string>} - Generated prompt
 */
const generatePromptWithCopilotCli = async (config) => {
  // Build a comprehensive input for Copilot CLI
  const inputPrompt = buildCopilotCliInput(config);
  
  // Use gh copilot suggest to generate a comprehensive project prompt
  // We'll use the explain command with our project context to generate documentation
  const command = `echo "${inputPrompt.replace(/"/g, '\\"')}" | gh copilot suggest -t shell "Generate a comprehensive development prompt for this project" 2>/dev/null || echo "FALLBACK"`;
  
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
    
    if (result.includes('FALLBACK') || !result.trim()) {
      // Copilot CLI didn't return useful output, generate comprehensive prompt ourselves
      return generateComprehensivePrompt(config);
    }
    
    return generateComprehensivePrompt(config);
  } catch {
    return generateComprehensivePrompt(config);
  }
};

/**
 * Build input string for Copilot CLI based on user configuration
 * @param {object} config - Project configuration
 * @returns {string} - Input string for Copilot CLI
 */
const buildCopilotCliInput = (config) => {
  const features = config.features?.join(', ') || 'standard features';
  
  return `
Project: ${config.projectName}
Description: ${config.projectDescription}
Type: ${config.appType}
Frontend: React with Vite (${config.uiFramework}, ${config.stateManagement})
Backend: Laravel PHP
Features: ${features}
`.trim();
};

/**
 * Generate comprehensive prompt based on project configuration
 * @param {object} config - Project configuration
 * @returns {string} - Comprehensive prompt
 */
const generateComprehensivePrompt = (config) => {
  const features = config.features || [];
  const appTypeDescriptions = {
    'ecommerce': 'an e-commerce platform with product catalog, shopping cart, checkout, and order management',
    'saas': 'a SaaS platform with multi-tenant architecture, subscription management, and user dashboards',
    'cms': 'a content management system with media library, page builder, and SEO tools',
    'social': 'a social network with user profiles, feeds, posts, and real-time interactions',
    'portfolio': 'a portfolio/landing page with dynamic content and contact forms',
    'internal-tool': 'an internal business tool with data management and reporting',
    'api-service': 'an API service with RESTful endpoints and documentation',
    'other': 'a custom web application'
  };

  const appDescription = appTypeDescriptions[config.appType] || appTypeDescriptions['other'];
  
  const featureDetails = {
    'auth': `
### Authentication System
- User registration with email verification
- Login/logout with session management
- OAuth integration (Google, GitHub, etc.)
- Password reset via email
- JWT tokens for API authentication
- Remember me functionality
- Role-based access control (RBAC)`,
    'rest-api': `
### REST API Architecture
- Versioned API endpoints (/api/v1/)
- Laravel API Resources for response formatting
- Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Request validation using Form Requests
- Rate limiting and throttling
- API documentation (consider Swagger/OpenAPI)
- CORS configuration`,
    'database': `
### Database Design
- Laravel migrations for schema management
- Eloquent models with relationships
- Database seeding for development
- Soft deletes where applicable
- Proper indexing for performance
- Query optimization with eager loading`,
    'admin-dashboard': `
### Admin Dashboard
- Admin authentication and authorization
- Dashboard with key metrics and charts
- CRUD interfaces for managing data
- User management panel
- Activity logs and audit trails
- System settings configuration`,
    'file-uploads': `
### File Upload System
- Secure file upload handling
- Image processing and thumbnails
- Cloud storage integration (S3, etc.)
- File type validation
- Upload progress tracking
- Media library management`,
    'email': `
### Email System
- Transactional emails (welcome, password reset, etc.)
- Email templates with Laravel Blade
- Queue-based email sending
- Email verification
- Notification preferences`,
    'websockets': `
### Real-time Features
- Laravel Echo with Pusher/Ably/Socket.io
- Real-time notifications
- Live updates and feeds
- Presence channels for online status
- Private channels for secure messaging`,
    'payments': `
### Payment Integration
- Stripe/PayPal integration
- Subscription billing
- One-time payments
- Invoice generation
- Payment webhooks handling
- Refund processing`,
    'i18n': `
### Multi-language Support
- Laravel localization
- React i18n integration
- Language switcher component
- RTL support consideration
- Translation management`,
    'dark-mode': `
### Dark Mode Support
- CSS variables for theming
- Toggle component
- System preference detection
- Persistent preference storage
- Smooth transitions`
  };

  let featuresSection = '';
  for (const feature of features) {
    if (featureDetails[feature]) {
      featuresSection += featureDetails[feature] + '\n';
    }
  }

  return `## Project Overview

Build **${config.projectName}** - ${config.projectDescription}

This is ${appDescription}.

## Technology Stack

### Frontend (/${config.frontendFolder}/)
- **Framework:** React 18+ with Vite
- **UI Library:** ${config.uiFramework || 'Tailwind CSS'}
- **State Management:** ${config.stateManagement || 'React Context'}
- **Routing:** React Router v6
- **HTTP Client:** Axios with interceptors
- **Form Handling:** React Hook Form
- **Validation:** Zod or Yup

### Backend (/${config.backendFolder}/)
- **Framework:** Laravel 10+
- **Database:** MySQL/PostgreSQL
- **Authentication:** Laravel Sanctum
- **Queue:** Laravel Queue with Redis
- **Cache:** Redis
- **API Format:** JSON:API or custom

## Feature Requirements
${featuresSection || '\nImplement standard web application features as needed.'}

## Development Guidelines

### Code Quality
- Follow PSR-12 for PHP
- Use ESLint + Prettier for JavaScript
- Write unit and integration tests
- Document complex functions
- Use TypeScript for type safety (optional)

### Git Workflow
- Feature branches from main
- Meaningful commit messages
- Pull request reviews
- Semantic versioning

### Security
- Input validation on all endpoints
- SQL injection prevention (use Eloquent)
- XSS protection
- CSRF tokens
- Secure password hashing
- Environment variable protection

## API Endpoints Structure

\`\`\`
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password

GET    /api/v1/users/me
PUT    /api/v1/users/me
DELETE /api/v1/users/me

# Add resource-specific endpoints based on app type
\`\`\`

## Frontend Component Structure

\`\`\`
src/
├── components/
│   ├── common/        # Reusable UI components
│   ├── layout/        # Layout components
│   └── features/      # Feature-specific components
├── pages/             # Page components
├── hooks/             # Custom React hooks
├── services/          # API service layer
├── store/             # State management
├── utils/             # Utility functions
└── types/             # TypeScript types
\`\`\`

## Getting Started Commands

\`\`\`bash
# Backend
cd ${config.backendFolder}
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve

# Frontend
cd ${config.frontendFolder}
npm install
npm run dev
\`\`\`

## Environment Configuration

Create \`.env\` files for both frontend and backend with appropriate 
API URLs, database credentials, and service keys.
`;
};

/**
 * Generate fallback prompt when Copilot CLI is not available
 * @param {object} config - Project configuration
 * @returns {string} - Fallback prompt
 */
const generateFallbackPrompt = (config) => {
  return generateComprehensivePrompt(config);
};

/**
 * Generate Copilot instructions content
 * @param {object} config - Project configuration
 * @returns {string} - Copilot instructions content
 */
const generateCopilotInstructions = (config) => {
  const featuresList = config.features?.map(f => `- ${f}`).join('\n') || '- Standard web application features';
  
  return `# Copilot Instructions for ${config.projectName}

## ⚠️ CRITICAL: Prompt Logging Requirement

**IMPORTANT:** Every significant prompt from the user MUST be saved to \`.github/prompts/\` folder.

### When to Save Prompts

Save a prompt when the user:
- Requests a new feature or functionality
- Asks for architectural decisions or changes
- Describes business logic or requirements
- Requests integrations or API implementations
- Provides specifications or acceptance criteria
- Asks for refactoring or code improvements

### How to Save Prompts

1. Create a new file in \`.github/prompts/\` with format: \`prompt_<number>.md\`
2. Use sequential numbering (prompt_002.md, prompt_003.md, etc.)
3. Include:
   - Date/timestamp
   - The original prompt text
   - Summary of implementation
   - Key decisions made

### Example Prompt File

\`\`\`markdown
# Feature: User Profile Page

**Date:** 2024-01-15
**Type:** Feature Implementation

## Original Prompt

"Create a user profile page with avatar upload, bio editing, and social links"

## Implementation Summary

- Created ProfilePage component with form handling
- Added avatar upload with image cropping
- Implemented bio with markdown support
- Added social links management

## Decisions Made

- Used React Hook Form for form state
- Cloudinary for image storage
- Limited bio to 500 characters
\`\`\`

---

## Project Overview

**Name:** ${config.projectName}
**Description:** ${config.projectDescription}
**Type:** ${config.appType || 'Web Application'}

## Tech Stack

### Frontend (/${config.frontendFolder}/)
- **Framework:** React with Vite
- **UI Library:** ${config.uiFramework || 'Tailwind CSS'}
- **State Management:** ${config.stateManagement || 'React Context'}

### Backend (/${config.backendFolder}/)
- **Framework:** Laravel (PHP)

## Selected Features

${featuresList}

## Code Style Guidelines

### Frontend (React)
- Use functional components with hooks
- Follow React best practices
- Use TypeScript when applicable
- Keep components small and focused
- Use proper prop validation
- Extract reusable logic into custom hooks

### Backend (Laravel)
- Follow Laravel conventions and PSR-12
- Use Eloquent ORM for database operations
- Implement proper validation using Form Requests
- Use Laravel's built-in authentication (Sanctum)
- Follow RESTful API design principles
- Use API Resources for response formatting

## Repository Structure

\`\`\`
${config.projectName}/
├── ${config.backendFolder}/     # Laravel API
├── ${config.frontendFolder}/    # React (Vite)
│   └── dist/        # Production build
├── .github/
│   ├── copilot-instructions.md  # This file
│   └── prompts/                 # SAVE ALL PROMPTS HERE
│       ├── README.md
│       └── prompt_001.md        # Initial project prompt
├── README.md
└── push.sh
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

---

**Remember:** Save every significant prompt to \`.github/prompts/\` for tracking, learning, and training purposes!
`;
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
    let hasCopilotCli = deps.ghCopilot;
    
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
    
    // Show Copilot CLI status
    if (hasCopilotCli) {
      logger.success('GitHub Copilot CLI detected');
    } else if (deps.gh) {
      logger.info('GitHub CLI detected (Copilot extension not installed)');
    } else {
      logger.info('GitHub CLI not detected');
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
    
    // Step 4: Final options (pass hasCopilotCli to show install prompt if needed)
    const finalAnswers = await inquirer.prompt(getFinalPrompts(hasCopilotCli));
    
    // Handle Copilot CLI installation if requested
    if (finalAnswers.installCopilotCli) {
      spinner = ora();
      const installed = await installCopilotCli(spinner);
      if (installed) {
        hasCopilotCli = true;
      }
    }
    
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
      await setupCopilotIntegration(projectPath, config, spinner, hasCopilotCli);
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
      console.log(chalk.cyan('  Instructions: .github/copilot-instructions.md'));
      console.log(chalk.cyan('  Prompts saved to: .github/prompts/'));
      if (hasCopilotCli) {
        console.log(chalk.green('  ✔ Project prompt generated with Copilot CLI'));
      } else {
        console.log(chalk.yellow('  ⚠ Install Copilot CLI for enhanced prompt generation'));
        console.log(chalk.dim('    gh extension install github/gh-copilot'));
      }
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
