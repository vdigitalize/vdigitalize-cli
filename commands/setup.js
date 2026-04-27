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
    ghCopilot: false,
    wpCli: commandExists('wp'),
    drush: commandExists('drush'),
    mysql: commandExists('mysql')
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
  if (deps.wpCli) {
    try {
      const output = execSync('wp --version', { encoding: 'utf8', stdio: 'pipe' });
      versions.wpCli = output.match(/(\d+\.\d+(\.\d+)?)/)?.[1] || 'unknown';
    } catch { versions.wpCli = 'unknown'; }
  }
  if (deps.drush) {
    try {
      const output = execSync('drush --version', { encoding: 'utf8', stdio: 'pipe' });
      versions.drush = output.match(/(\d+\.\d+(\.\d+)?)/)?.[1] || 'unknown';
    } catch { versions.drush = 'unknown'; }
  }
  if (deps.mysql) {
    try {
      const output = execSync('mysql --version', { encoding: 'utf8', stdio: 'pipe' });
      versions.mysql = output.match(/(\d+\.\d+(\.\d+)?)/)?.[1] || 'unknown';
    } catch { versions.mysql = 'unknown'; }
  }
  
  return { deps, versions };
};

/**
 * Get initial project type selection
 * @returns {Array} - Inquirer prompts array
 */
const getProjectTypePrompts = () => [
  {
    type: 'list',
    name: 'projectType',
    message: 'What type of project do you want to create?',
    choices: [
      { 
        name: 'Full-Stack (Laravel + React/Vite)', 
        value: 'fullstack',
        description: 'Modern full-stack with separate frontend and backend'
      },
      { 
        name: 'WordPress', 
        value: 'wordpress',
        description: 'WordPress CMS with theme/plugin development'
      },
      { 
        name: 'PrestaShop', 
        value: 'prestashop',
        description: 'PrestaShop e-commerce platform'
      },
      { 
        name: 'Drupal', 
        value: 'drupal',
        description: 'Drupal CMS for enterprise websites'
      },
      { 
        name: 'Custom CMS/PHP', 
        value: 'custom-php',
        description: 'Custom PHP project with your own structure'
      }
    ]
  }
];

/**
 * Get the prompts for full-stack setup flow
 * @returns {Array} - Inquirer prompts array
 */
const getFullStackPrompts = () => [
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
  }
];

/**
 * Get basic project info prompts (shared across all project types)
 * @returns {Array} - Inquirer prompts array
 */
const getBasicProjectPrompts = () => [
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
    default: 'A web application',
    validate: (input) => input.length > 0 || 'Description is required'
  },
  {
    type: 'input',
    name: 'repoUrl',
    message: 'Git repository URL:',
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
 * Get WordPress-specific prompts
 * @returns {Array} - Inquirer prompts array
 */
const getWordPressPrompts = () => [
  {
    type: 'list',
    name: 'wpSetupType',
    message: 'What type of WordPress setup?',
    choices: [
      { name: 'Fresh WordPress installation', value: 'fresh' },
      { name: 'Theme development (Starter theme)', value: 'theme' },
      { name: 'Plugin development', value: 'plugin' },
      { name: 'Full WordPress + Custom theme', value: 'full-theme' }
    ]
  },
  {
    type: 'input',
    name: 'themeName',
    message: 'Theme name:',
    default: (answers) => answers.projectName || 'my-theme',
    when: (answers) => ['theme', 'full-theme'].includes(answers.wpSetupType)
  },
  {
    type: 'input',
    name: 'pluginName',
    message: 'Plugin name:',
    default: (answers) => answers.projectName || 'my-plugin',
    when: (answers) => answers.wpSetupType === 'plugin'
  },
  {
    type: 'list',
    name: 'wpStarterTheme',
    message: 'Which starter theme?',
    choices: [
      { name: 'Underscores (_s) - Classic starter', value: 'underscores' },
      { name: 'Sage (Roots) - Modern with Laravel Blade', value: 'sage' },
      { name: 'Flavor starter (Tailwind + Alpine)', value: 'flavor' },
      { name: 'Blank theme (minimal)', value: 'blank' }
    ],
    when: (answers) => ['theme', 'full-theme'].includes(answers.wpSetupType)
  },
  {
    type: 'confirm',
    name: 'wpMultisite',
    message: 'Enable WordPress Multisite?',
    default: false,
    when: (answers) => ['fresh', 'full-theme'].includes(answers.wpSetupType)
  },
  {
    type: 'checkbox',
    name: 'wpPlugins',
    message: 'Install recommended plugins?',
    choices: [
      { name: 'Advanced Custom Fields (ACF)', value: 'acf', checked: true },
      { name: 'Yoast SEO', value: 'yoast' },
      { name: 'WooCommerce', value: 'woocommerce' },
      { name: 'Contact Form 7', value: 'cf7' },
      { name: 'Wordfence Security', value: 'wordfence' },
      { name: 'WP Super Cache', value: 'wp-super-cache' },
      { name: 'Query Monitor (dev)', value: 'query-monitor' }
    ],
    when: (answers) => ['fresh', 'full-theme'].includes(answers.wpSetupType)
  }
];

/**
 * Get PrestaShop-specific prompts
 * @returns {Array} - Inquirer prompts array
 */
const getPrestaShopPrompts = () => [
  {
    type: 'list',
    name: 'psSetupType',
    message: 'What type of PrestaShop setup?',
    choices: [
      { name: 'Fresh PrestaShop installation', value: 'fresh' },
      { name: 'Theme development', value: 'theme' },
      { name: 'Module development', value: 'module' },
      { name: 'Full PrestaShop + Custom theme', value: 'full-theme' }
    ]
  },
  {
    type: 'input',
    name: 'psVersion',
    message: 'PrestaShop version:',
    default: '8.1',
    when: (answers) => ['fresh', 'full-theme'].includes(answers.psSetupType)
  },
  {
    type: 'input',
    name: 'themeName',
    message: 'Theme name:',
    default: (answers) => answers.projectName || 'my-theme',
    when: (answers) => ['theme', 'full-theme'].includes(answers.psSetupType)
  },
  {
    type: 'input',
    name: 'moduleName',
    message: 'Module name:',
    default: (answers) => answers.projectName || 'mymodule',
    when: (answers) => answers.psSetupType === 'module'
  },
  {
    type: 'checkbox',
    name: 'psModules',
    message: 'Install recommended modules?',
    choices: [
      { name: 'ps_facetedsearch (Layered navigation)', value: 'ps_facetedsearch', checked: true },
      { name: 'ps_emailsubscription (Newsletter)', value: 'ps_emailsubscription' },
      { name: 'ps_socialfollow (Social links)', value: 'ps_socialfollow' },
      { name: 'ps_googleanalytics', value: 'ps_googleanalytics' }
    ],
    when: (answers) => ['fresh', 'full-theme'].includes(answers.psSetupType)
  }
];

/**
 * Get Drupal-specific prompts
 * @returns {Array} - Inquirer prompts array
 */
const getDrupalPrompts = () => [
  {
    type: 'list',
    name: 'drupalSetupType',
    message: 'What type of Drupal setup?',
    choices: [
      { name: 'Fresh Drupal installation', value: 'fresh' },
      { name: 'Theme development', value: 'theme' },
      { name: 'Module development', value: 'module' },
      { name: 'Full Drupal + Custom theme', value: 'full-theme' }
    ]
  },
  {
    type: 'list',
    name: 'drupalProfile',
    message: 'Installation profile:',
    choices: [
      { name: 'Standard (recommended)', value: 'standard' },
      { name: 'Minimal', value: 'minimal' },
      { name: 'Demo (Umami food magazine)', value: 'demo_umami' }
    ],
    when: (answers) => ['fresh', 'full-theme'].includes(answers.drupalSetupType)
  },
  {
    type: 'input',
    name: 'themeName',
    message: 'Theme name:',
    default: (answers) => answers.projectName || 'my_theme',
    when: (answers) => ['theme', 'full-theme'].includes(answers.drupalSetupType)
  },
  {
    type: 'input',
    name: 'moduleName',
    message: 'Module name:',
    default: (answers) => answers.projectName || 'my_module',
    when: (answers) => answers.drupalSetupType === 'module'
  },
  {
    type: 'list',
    name: 'drupalBaseTheme',
    message: 'Base theme:',
    choices: [
      { name: 'Olivero (default)', value: 'olivero' },
      { name: 'Claro (admin)', value: 'claro' },
      { name: 'Bootstrap 5', value: 'bootstrap5' },
      { name: 'FLAVOR', value: 'flavor' },
      { name: 'Custom (no base)', value: 'none' }
    ],
    when: (answers) => ['theme', 'full-theme'].includes(answers.drupalSetupType)
  },
  {
    type: 'checkbox',
    name: 'drupalModules',
    message: 'Install recommended modules?',
    choices: [
      { name: 'Admin Toolbar', value: 'admin_toolbar', checked: true },
      { name: 'Pathauto (URL aliases)', value: 'pathauto', checked: true },
      { name: 'Metatag (SEO)', value: 'metatag' },
      { name: 'Webform', value: 'webform' },
      { name: 'Paragraphs (content blocks)', value: 'paragraphs' },
      { name: 'Views UI', value: 'views_ui', checked: true },
      { name: 'Devel (development)', value: 'devel' }
    ],
    when: (answers) => ['fresh', 'full-theme'].includes(answers.drupalSetupType)
  }
];

/**
 * Get Custom PHP project prompts
 * @returns {Array} - Inquirer prompts array
 */
const getCustomPhpPrompts = () => [
  {
    type: 'list',
    name: 'phpFramework',
    message: 'PHP framework/structure:',
    choices: [
      { name: 'Plain PHP (no framework)', value: 'plain' },
      { name: 'Slim Framework', value: 'slim' },
      { name: 'Symfony', value: 'symfony' },
      { name: 'CodeIgniter', value: 'codeigniter' },
      { name: 'CakePHP', value: 'cakephp' }
    ]
  },
  {
    type: 'confirm',
    name: 'useComposer',
    message: 'Use Composer for dependencies?',
    default: true
  },
  {
    type: 'confirm',
    name: 'includeFrontend',
    message: 'Include frontend build tools (Vite/Webpack)?',
    default: true
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
 * Create WordPress project
 * @param {string} projectPath - Base project path
 * @param {object} config - Project configuration
 * @param {ora.Ora} spinner - Ora spinner instance
 * @param {object} deps - Dependencies status
 */
const createWordPressProject = async (projectPath, config, spinner, deps) => {
  spinner.text = 'Setting up WordPress project...';
  spinner.start();
  
  try {
    const wpSetupType = config.wpSetupType || 'fresh';
    
    if (['fresh', 'full-theme'].includes(wpSetupType)) {
      // Download WordPress using WP-CLI or Composer
      if (deps.wpCli) {
        spinner.text = 'Downloading WordPress using WP-CLI...';
        runCommand('wp core download', { cwd: projectPath });
        spinner.succeed('WordPress downloaded via WP-CLI');
      } else if (deps.composer) {
        spinner.text = 'Installing WordPress using Composer...';
        runCommand('composer create-project johnpbloch/wordpress .', { cwd: projectPath });
        spinner.succeed('WordPress installed via Composer');
      } else {
        // Create folder structure and instructions
        await fs.ensureDir(path.join(projectPath, 'wp-content', 'themes'));
        await fs.ensureDir(path.join(projectPath, 'wp-content', 'plugins'));
        
        await fs.writeFile(path.join(projectPath, 'SETUP.md'), `# WordPress Setup

## Manual Installation Required

WP-CLI and Composer not detected. Please install WordPress manually:

1. Download WordPress from https://wordpress.org/download/
2. Extract to this directory
3. Configure wp-config.php
4. Run the WordPress installation wizard

## Recommended Tools

- WP-CLI: https://wp-cli.org/
  Install: curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar

- Composer: https://getcomposer.org/
`);
        spinner.succeed('WordPress folder structure created (install WordPress manually)');
      }
      
      // Install plugins if WP-CLI is available
      if (deps.wpCli && config.wpPlugins && config.wpPlugins.length > 0) {
        spinner.text = 'Installing WordPress plugins...';
        spinner.start();
        
        for (const plugin of config.wpPlugins) {
          try {
            const pluginSlug = getWpPluginSlug(plugin);
            runCommand(`wp plugin install ${pluginSlug}`, { cwd: projectPath, silent: true });
          } catch {
            logger.warn(`Could not install plugin: ${plugin}`);
          }
        }
        spinner.succeed('WordPress plugins installed');
      }
    }
    
    // Theme setup
    if (['theme', 'full-theme'].includes(wpSetupType)) {
      const themesPath = path.join(projectPath, 'wp-content', 'themes');
      await fs.ensureDir(themesPath);
      
      const themeName = config.themeName || config.projectName;
      const themePath = path.join(themesPath, themeName);
      
      spinner.text = `Creating theme: ${themeName}...`;
      spinner.start();
      
      await createWordPressTheme(themePath, themeName, config.wpStarterTheme, config);
      spinner.succeed(`Theme "${themeName}" created`);
    }
    
    // Plugin setup
    if (wpSetupType === 'plugin') {
      const pluginsPath = path.join(projectPath, 'wp-content', 'plugins');
      await fs.ensureDir(pluginsPath);
      
      const pluginName = config.pluginName || config.projectName;
      const pluginPath = path.join(pluginsPath, pluginName);
      
      spinner.text = `Creating plugin: ${pluginName}...`;
      spinner.start();
      
      await createWordPressPlugin(pluginPath, pluginName, config);
      spinner.succeed(`Plugin "${pluginName}" created`);
    }
    
    return projectPath;
  } catch (error) {
    spinner.fail('Failed to setup WordPress project');
    throw error;
  }
};

/**
 * Get WordPress plugin slug from internal name
 */
const getWpPluginSlug = (plugin) => {
  const pluginMap = {
    'acf': 'advanced-custom-fields',
    'yoast': 'wordpress-seo',
    'woocommerce': 'woocommerce',
    'cf7': 'contact-form-7',
    'wordfence': 'wordfence',
    'wp-super-cache': 'wp-super-cache',
    'query-monitor': 'query-monitor'
  };
  return pluginMap[plugin] || plugin;
};

/**
 * Create WordPress theme structure
 */
const createWordPressTheme = async (themePath, themeName, starterTheme, config) => {
  await fs.ensureDir(themePath);
  await fs.ensureDir(path.join(themePath, 'assets'));
  await fs.ensureDir(path.join(themePath, 'assets', 'css'));
  await fs.ensureDir(path.join(themePath, 'assets', 'js'));
  await fs.ensureDir(path.join(themePath, 'assets', 'images'));
  await fs.ensureDir(path.join(themePath, 'template-parts'));
  await fs.ensureDir(path.join(themePath, 'inc'));
  
  // style.css (required)
  const styleContent = `/*
Theme Name: ${themeName}
Theme URI: 
Author: ${config.projectName}
Author URI: 
Description: ${config.projectDescription || 'Custom WordPress theme'}
Version: 1.0.0
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${themeName.toLowerCase().replace(/\s+/g, '-')}
*/
`;
  await fs.writeFile(path.join(themePath, 'style.css'), styleContent);
  
  // functions.php
  const functionsContent = `<?php
/**
 * ${themeName} functions and definitions
 */

if (!defined('ABSPATH')) {
    exit;
}

define('THEME_VERSION', '1.0.0');
define('THEME_DIR', get_template_directory());
define('THEME_URI', get_template_directory_uri());

/**
 * Enqueue scripts and styles
 */
function ${themeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_scripts() {
    wp_enqueue_style('${themeName}-style', get_stylesheet_uri(), array(), THEME_VERSION);
    wp_enqueue_style('${themeName}-main', THEME_URI . '/assets/css/main.css', array(), THEME_VERSION);
    wp_enqueue_script('${themeName}-main', THEME_URI . '/assets/js/main.js', array('jquery'), THEME_VERSION, true);
}
add_action('wp_enqueue_scripts', '${themeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_scripts');

/**
 * Theme setup
 */
function ${themeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));
    add_theme_support('custom-logo');
    
    register_nav_menus(array(
        'primary' => __('Primary Menu', '${themeName}'),
        'footer'  => __('Footer Menu', '${themeName}'),
    ));
}
add_action('after_setup_theme', '${themeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_setup');

/**
 * Register widget areas
 */
function ${themeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_widgets_init() {
    register_sidebar(array(
        'name'          => __('Sidebar', '${themeName}'),
        'id'            => 'sidebar-1',
        'description'   => __('Add widgets here.', '${themeName}'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ));
}
add_action('widgets_init', '${themeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_widgets_init');
`;
  await fs.writeFile(path.join(themePath, 'functions.php'), functionsContent);
  
  // index.php
  const indexContent = `<?php get_header(); ?>

<main id="main" class="site-main">
    <?php
    if (have_posts()) :
        while (have_posts()) :
            the_post();
            get_template_part('template-parts/content', get_post_type());
        endwhile;
        
        the_posts_pagination();
    else :
        get_template_part('template-parts/content', 'none');
    endif;
    ?>
</main>

<?php get_sidebar(); ?>
<?php get_footer(); ?>
`;
  await fs.writeFile(path.join(themePath, 'index.php'), indexContent);
  
  // header.php
  const headerContent = `<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header id="masthead" class="site-header">
    <div class="site-branding">
        <?php the_custom_logo(); ?>
        <h1 class="site-title"><a href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a></h1>
    </div>

    <nav id="site-navigation" class="main-navigation">
        <?php
        wp_nav_menu(array(
            'theme_location' => 'primary',
            'menu_id'        => 'primary-menu',
        ));
        ?>
    </nav>
</header>
`;
  await fs.writeFile(path.join(themePath, 'header.php'), headerContent);
  
  // footer.php
  const footerContent = `<footer id="colophon" class="site-footer">
    <div class="site-info">
        &copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
`;
  await fs.writeFile(path.join(themePath, 'footer.php'), footerContent);
  
  // sidebar.php
  const sidebarContent = `<?php if (is_active_sidebar('sidebar-1')) : ?>
<aside id="secondary" class="widget-area">
    <?php dynamic_sidebar('sidebar-1'); ?>
</aside>
<?php endif; ?>
`;
  await fs.writeFile(path.join(themePath, 'sidebar.php'), sidebarContent);
  
  // template-parts/content.php
  const contentPartContent = `<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
    <header class="entry-header">
        <?php the_title('<h2 class="entry-title"><a href="' . esc_url(get_permalink()) . '">', '</a></h2>'); ?>
    </header>

    <div class="entry-content">
        <?php the_excerpt(); ?>
    </div>

    <footer class="entry-footer">
        <?php echo get_the_date(); ?>
    </footer>
</article>
`;
  await fs.writeFile(path.join(themePath, 'template-parts', 'content.php'), contentPartContent);
  
  // Basic CSS
  await fs.writeFile(path.join(themePath, 'assets', 'css', 'main.css'), '/* Add your styles here */\n');
  
  // Basic JS
  await fs.writeFile(path.join(themePath, 'assets', 'js', 'main.js'), '// Add your JavaScript here\n');
};

/**
 * Create WordPress plugin structure
 */
const createWordPressPlugin = async (pluginPath, pluginName, config) => {
  await fs.ensureDir(pluginPath);
  await fs.ensureDir(path.join(pluginPath, 'includes'));
  await fs.ensureDir(path.join(pluginPath, 'admin'));
  await fs.ensureDir(path.join(pluginPath, 'public'));
  await fs.ensureDir(path.join(pluginPath, 'assets'));
  
  const pluginSlug = pluginName.toLowerCase().replace(/\s+/g, '-');
  const pluginClass = pluginName.replace(/[^a-zA-Z0-9]/g, '_');
  
  // Main plugin file
  const mainPluginContent = `<?php
/**
 * Plugin Name: ${pluginName}
 * Plugin URI: 
 * Description: ${config.projectDescription || 'A custom WordPress plugin'}
 * Version: 1.0.0
 * Author: 
 * Author URI: 
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: ${pluginSlug}
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) {
    exit;
}

define('${pluginClass.toUpperCase()}_VERSION', '1.0.0');
define('${pluginClass.toUpperCase()}_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('${pluginClass.toUpperCase()}_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Plugin activation
 */
function ${pluginClass.toLowerCase()}_activate() {
    // Activation code here
}
register_activation_hook(__FILE__, '${pluginClass.toLowerCase()}_activate');

/**
 * Plugin deactivation
 */
function ${pluginClass.toLowerCase()}_deactivate() {
    // Deactivation code here
}
register_deactivation_hook(__FILE__, '${pluginClass.toLowerCase()}_deactivate');

/**
 * Load plugin files
 */
require_once ${pluginClass.toUpperCase()}_PLUGIN_DIR . 'includes/class-${pluginSlug}.php';

/**
 * Initialize plugin
 */
function ${pluginClass.toLowerCase()}_init() {
    // Initialize plugin
}
add_action('plugins_loaded', '${pluginClass.toLowerCase()}_init');
`;
  await fs.writeFile(path.join(pluginPath, `${pluginSlug}.php`), mainPluginContent);
  
  // Main class file
  const classContent = `<?php
/**
 * Main plugin class
 */

if (!defined('ABSPATH')) {
    exit;
}

class ${pluginClass} {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init_hooks();
    }
    
    private function init_hooks() {
        add_action('init', array($this, 'init'));
        add_action('admin_init', array($this, 'admin_init'));
    }
    
    public function init() {
        // Frontend initialization
    }
    
    public function admin_init() {
        // Admin initialization
    }
}

// Initialize
${pluginClass}::get_instance();
`;
  await fs.writeFile(path.join(pluginPath, 'includes', `class-${pluginSlug}.php`), classContent);
};

/**
 * Create PrestaShop project
 * @param {string} projectPath - Base project path
 * @param {object} config - Project configuration
 * @param {ora.Ora} spinner - Ora spinner instance
 * @param {object} deps - Dependencies status
 */
const createPrestaShopProject = async (projectPath, config, spinner, deps) => {
  spinner.text = 'Setting up PrestaShop project...';
  spinner.start();
  
  try {
    const psSetupType = config.psSetupType || 'fresh';
    const psVersion = config.psVersion || '8.1';
    
    if (['fresh', 'full-theme'].includes(psSetupType) && deps.composer) {
      spinner.text = `Installing PrestaShop ${psVersion}...`;
      runCommand(`composer create-project prestashop/prestashop:${psVersion} .`, { cwd: projectPath });
      spinner.succeed(`PrestaShop ${psVersion} installed`);
    } else if (['fresh', 'full-theme'].includes(psSetupType)) {
      // Create basic structure
      await fs.ensureDir(path.join(projectPath, 'themes'));
      await fs.ensureDir(path.join(projectPath, 'modules'));
      await fs.writeFile(path.join(projectPath, 'SETUP.md'), `# PrestaShop Setup

## Manual Installation Required

Download PrestaShop from https://www.prestashop.com/en/download
Or use Composer: composer create-project prestashop/prestashop:${psVersion} .
`);
      spinner.succeed('PrestaShop folder structure created (install PrestaShop manually)');
    }
    
    // Theme setup
    if (['theme', 'full-theme'].includes(psSetupType)) {
      const themesPath = path.join(projectPath, 'themes');
      await fs.ensureDir(themesPath);
      
      const themeName = config.themeName || config.projectName;
      const themePath = path.join(themesPath, themeName);
      
      spinner.text = `Creating PrestaShop theme: ${themeName}...`;
      spinner.start();
      
      await createPrestaShopTheme(themePath, themeName, config);
      spinner.succeed(`PrestaShop theme "${themeName}" created`);
    }
    
    // Module setup
    if (psSetupType === 'module') {
      const modulesPath = path.join(projectPath, 'modules');
      await fs.ensureDir(modulesPath);
      
      const moduleName = config.moduleName || config.projectName;
      const modulePath = path.join(modulesPath, moduleName.toLowerCase());
      
      spinner.text = `Creating PrestaShop module: ${moduleName}...`;
      spinner.start();
      
      await createPrestaShopModule(modulePath, moduleName, config);
      spinner.succeed(`PrestaShop module "${moduleName}" created`);
    }
    
    return projectPath;
  } catch (error) {
    spinner.fail('Failed to setup PrestaShop project');
    throw error;
  }
};

/**
 * Create PrestaShop theme structure
 */
const createPrestaShopTheme = async (themePath, themeName, config) => {
  await fs.ensureDir(themePath);
  await fs.ensureDir(path.join(themePath, 'assets', 'css'));
  await fs.ensureDir(path.join(themePath, 'assets', 'js'));
  await fs.ensureDir(path.join(themePath, 'assets', 'img'));
  await fs.ensureDir(path.join(themePath, 'templates'));
  await fs.ensureDir(path.join(themePath, 'templates', '_partials'));
  await fs.ensureDir(path.join(themePath, 'modules'));
  
  // theme.yml
  const themeYml = `name: ${themeName}
display_name: ${themeName}
version: 1.0.0
author:
  name: "Developer"
  email: ""
  url: ""

meta:
  compatibility:
    from: 8.0.0
    to: ~
  available_layouts:
    layout-full-width:
      name: Full Width
      description: Full width layout
    layout-left-column:
      name: Left Column
      description: Left sidebar layout
    layout-right-column:
      name: Right Column
      description: Right sidebar layout

global_settings:
  configuration:
    PS_IMAGE_QUALITY: png
  modules:
    to_enable: []
    to_disable: []
    to_hook: []
`;
  await fs.writeFile(path.join(themePath, 'config', 'theme.yml'), themeYml);
  
  // index.tpl
  const indexTpl = `{extends file='page.tpl'}

{block name='page_content'}
  {foreach from=$products item="product"}
    {include file='catalog/_partials/miniatures/product.tpl' product=$product}
  {/foreach}
{/block}
`;
  await fs.ensureDir(path.join(themePath, 'templates'));
  await fs.writeFile(path.join(themePath, 'templates', 'index.tpl'), indexTpl);
  
  // preview.png placeholder
  await fs.writeFile(path.join(themePath, 'preview.png'), '');
};

/**
 * Create PrestaShop module structure
 */
const createPrestaShopModule = async (modulePath, moduleName, config) => {
  await fs.ensureDir(modulePath);
  await fs.ensureDir(path.join(modulePath, 'views', 'templates', 'admin'));
  await fs.ensureDir(path.join(modulePath, 'views', 'templates', 'front'));
  await fs.ensureDir(path.join(modulePath, 'views', 'css'));
  await fs.ensureDir(path.join(modulePath, 'views', 'js'));
  await fs.ensureDir(path.join(modulePath, 'controllers', 'admin'));
  await fs.ensureDir(path.join(modulePath, 'controllers', 'front'));
  
  const moduleClass = moduleName.charAt(0).toUpperCase() + moduleName.slice(1).toLowerCase();
  
  // Main module file
  const mainModuleContent = `<?php
/**
 * ${moduleName}
 *
 * @author    Developer
 * @copyright 2024
 * @license   
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

class ${moduleClass} extends Module
{
    public function __construct()
    {
        $this->name = '${moduleName.toLowerCase()}';
        $this->tab = 'other';
        $this->version = '1.0.0';
        $this->author = 'Developer';
        $this->need_instance = 0;
        $this->ps_versions_compliancy = [
            'min' => '8.0.0',
            'max' => _PS_VERSION_,
        ];
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = $this->l('${moduleName}');
        $this->description = $this->l('${config.projectDescription || 'Custom PrestaShop module'}');
        $this->confirmUninstall = $this->l('Are you sure you want to uninstall?');
    }

    public function install()
    {
        return parent::install()
            && $this->registerHook('displayHeader')
            && $this->registerHook('displayFooter');
    }

    public function uninstall()
    {
        return parent::uninstall();
    }

    public function hookDisplayHeader($params)
    {
        // Hook code here
    }

    public function hookDisplayFooter($params)
    {
        // Hook code here
    }
}
`;
  await fs.writeFile(path.join(modulePath, `${moduleName.toLowerCase()}.php`), mainModuleContent);
};

/**
 * Create Drupal project
 * @param {string} projectPath - Base project path
 * @param {object} config - Project configuration
 * @param {ora.Ora} spinner - Ora spinner instance
 * @param {object} deps - Dependencies status
 */
const createDrupalProject = async (projectPath, config, spinner, deps) => {
  spinner.text = 'Setting up Drupal project...';
  spinner.start();
  
  try {
    const drupalSetupType = config.drupalSetupType || 'fresh';
    const drupalProfile = config.drupalProfile || 'standard';
    
    if (['fresh', 'full-theme'].includes(drupalSetupType) && deps.composer) {
      spinner.text = 'Installing Drupal via Composer...';
      runCommand('composer create-project drupal/recommended-project .', { cwd: projectPath });
      spinner.succeed('Drupal installed via Composer');
      
      // Install modules if drush is available
      if (deps.drush && config.drupalModules && config.drupalModules.length > 0) {
        spinner.text = 'Installing Drupal modules...';
        spinner.start();
        
        for (const module of config.drupalModules) {
          try {
            runCommand(`composer require drupal/${module}`, { cwd: projectPath, silent: true });
          } catch {
            logger.warn(`Could not install module: ${module}`);
          }
        }
        spinner.succeed('Drupal modules installed');
      }
    } else if (['fresh', 'full-theme'].includes(drupalSetupType)) {
      await fs.ensureDir(path.join(projectPath, 'web', 'themes', 'custom'));
      await fs.ensureDir(path.join(projectPath, 'web', 'modules', 'custom'));
      await fs.writeFile(path.join(projectPath, 'SETUP.md'), `# Drupal Setup

## Installation

Use Composer: composer create-project drupal/recommended-project .
Or download from https://www.drupal.org/download
`);
      spinner.succeed('Drupal folder structure created (install Drupal manually)');
    }
    
    // Theme setup
    if (['theme', 'full-theme'].includes(drupalSetupType)) {
      const themesPath = (['fresh', 'full-theme'].includes(drupalSetupType) && deps.composer)
        ? path.join(projectPath, 'web', 'themes', 'custom')
        : path.join(projectPath, 'themes', 'custom');
      await fs.ensureDir(themesPath);
      
      const themeName = config.themeName || config.projectName;
      const themePath = path.join(themesPath, themeName.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      
      spinner.text = `Creating Drupal theme: ${themeName}...`;
      spinner.start();
      
      await createDrupalTheme(themePath, themeName, config);
      spinner.succeed(`Drupal theme "${themeName}" created`);
    }
    
    // Module setup
    if (drupalSetupType === 'module') {
      const modulesPath = path.join(projectPath, 'web', 'modules', 'custom');
      await fs.ensureDir(modulesPath);
      
      const moduleName = config.moduleName || config.projectName;
      const modulePath = path.join(modulesPath, moduleName.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      
      spinner.text = `Creating Drupal module: ${moduleName}...`;
      spinner.start();
      
      await createDrupalModule(modulePath, moduleName, config);
      spinner.succeed(`Drupal module "${moduleName}" created`);
    }
    
    return projectPath;
  } catch (error) {
    spinner.fail('Failed to setup Drupal project');
    throw error;
  }
};

/**
 * Create Drupal theme structure
 */
const createDrupalTheme = async (themePath, themeName, config) => {
  const themeSlug = themeName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  await fs.ensureDir(themePath);
  await fs.ensureDir(path.join(themePath, 'css'));
  await fs.ensureDir(path.join(themePath, 'js'));
  await fs.ensureDir(path.join(themePath, 'images'));
  await fs.ensureDir(path.join(themePath, 'templates'));
  
  // theme.info.yml
  const infoYml = `name: '${themeName}'
type: theme
description: '${config.projectDescription || 'Custom Drupal theme'}'
core_version_requirement: ^10 || ^11
base theme: ${config.drupalBaseTheme === 'none' ? 'false' : (config.drupalBaseTheme || 'olivero')}

libraries:
  - ${themeSlug}/global

regions:
  header: Header
  primary_menu: Primary menu
  secondary_menu: Secondary menu
  page_top: Page top
  page_bottom: Page bottom
  highlighted: Highlighted
  breadcrumb: Breadcrumb
  content: Content
  sidebar_first: Sidebar first
  sidebar_second: Sidebar second
  footer: Footer
`;
  await fs.writeFile(path.join(themePath, `${themeSlug}.info.yml`), infoYml);
  
  // theme.libraries.yml
  const librariesYml = `global:
  version: 1.0
  css:
    theme:
      css/style.css: {}
  js:
    js/script.js: {}
`;
  await fs.writeFile(path.join(themePath, `${themeSlug}.libraries.yml`), librariesYml);
  
  // Basic CSS
  await fs.writeFile(path.join(themePath, 'css', 'style.css'), '/* Add your styles here */\n');
  
  // Basic JS
  await fs.writeFile(path.join(themePath, 'js', 'script.js'), '// Add your JavaScript here\n');
};

/**
 * Create Drupal module structure
 */
const createDrupalModule = async (modulePath, moduleName, config) => {
  const moduleSlug = moduleName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  
  await fs.ensureDir(modulePath);
  await fs.ensureDir(path.join(modulePath, 'src'));
  await fs.ensureDir(path.join(modulePath, 'src', 'Controller'));
  await fs.ensureDir(path.join(modulePath, 'src', 'Form'));
  await fs.ensureDir(path.join(modulePath, 'templates'));
  
  // module.info.yml
  const infoYml = `name: '${moduleName}'
type: module
description: '${config.projectDescription || 'Custom Drupal module'}'
core_version_requirement: ^10 || ^11
package: Custom
`;
  await fs.writeFile(path.join(modulePath, `${moduleSlug}.info.yml`), infoYml);
  
  // module.module
  const moduleContent = `<?php

/**
 * @file
 * Primary module hooks for ${moduleName} module.
 */

/**
 * Implements hook_theme().
 */
function ${moduleSlug}_theme() {
  return [
    '${moduleSlug}' => [
      'render element' => 'children',
    ],
  ];
}
`;
  await fs.writeFile(path.join(modulePath, `${moduleSlug}.module`), moduleContent);
  
  // routing.yml
  const routingYml = `${moduleSlug}.page:
  path: '/${moduleSlug}'
  defaults:
    _controller: '\\Drupal\\${moduleSlug}\\Controller\\${moduleName.replace(/[^a-zA-Z0-9]/g, '')}Controller::content'
    _title: '${moduleName}'
  requirements:
    _permission: 'access content'
`;
  await fs.writeFile(path.join(modulePath, `${moduleSlug}.routing.yml`), routingYml);
  
  // Controller
  const controllerContent = `<?php

namespace Drupal\\${moduleSlug}\\Controller;

use Drupal\\Core\\Controller\\ControllerBase;

/**
 * Returns responses for ${moduleName} routes.
 */
class ${moduleName.replace(/[^a-zA-Z0-9]/g, '')}Controller extends ControllerBase {

  /**
   * Builds the response.
   */
  public function content() {
    return [
      '#markup' => $this->t('Hello, World!'),
    ];
  }

}
`;
  await fs.writeFile(
    path.join(modulePath, 'src', 'Controller', `${moduleName.replace(/[^a-zA-Z0-9]/g, '')}Controller.php`),
    controllerContent
  );
};

/**
 * Create Custom PHP project
 * @param {string} projectPath - Base project path
 * @param {object} config - Project configuration
 * @param {ora.Ora} spinner - Ora spinner instance
 * @param {object} deps - Dependencies status
 */
const createCustomPhpProject = async (projectPath, config, spinner, deps) => {
  spinner.text = 'Setting up PHP project...';
  spinner.start();
  
  try {
    const framework = config.phpFramework || 'plain';
    
    if (framework === 'slim' && deps.composer) {
      runCommand('composer require slim/slim slim/psr7', { cwd: projectPath });
    } else if (framework === 'symfony' && deps.composer) {
      runCommand('composer create-project symfony/skeleton .', { cwd: projectPath });
    } else if (framework === 'codeigniter' && deps.composer) {
      runCommand('composer create-project codeigniter4/appstarter .', { cwd: projectPath });
    } else if (framework === 'cakephp' && deps.composer) {
      runCommand('composer create-project cakephp/app .', { cwd: projectPath });
    } else {
      // Plain PHP structure
      await fs.ensureDir(path.join(projectPath, 'public'));
      await fs.ensureDir(path.join(projectPath, 'src'));
      await fs.ensureDir(path.join(projectPath, 'config'));
      await fs.ensureDir(path.join(projectPath, 'views'));
      await fs.ensureDir(path.join(projectPath, 'assets', 'css'));
      await fs.ensureDir(path.join(projectPath, 'assets', 'js'));
      
      // index.php
      const indexContent = `<?php
/**
 * ${config.projectName}
 * ${config.projectDescription || ''}
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Your application code here
echo "Hello, World!";
`;
      await fs.writeFile(path.join(projectPath, 'public', 'index.php'), indexContent);
      
      // composer.json
      if (config.useComposer && deps.composer) {
        const composerJson = {
          name: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          description: config.projectDescription || '',
          type: 'project',
          autoload: {
            'psr-4': {
              'App\\': 'src/'
            }
          },
          require: {
            php: '>=8.1'
          }
        };
        await fs.writeFile(path.join(projectPath, 'composer.json'), JSON.stringify(composerJson, null, 2));
        runCommand('composer install', { cwd: projectPath });
      }
    }
    
    spinner.succeed(`PHP project created (${framework})`);
    
    // Add frontend tools if requested
    if (config.includeFrontend) {
      spinner.text = 'Setting up frontend tools...';
      spinner.start();
      
      const packageJson = {
        name: config.projectName.toLowerCase(),
        version: '1.0.0',
        scripts: {
          dev: 'vite',
          build: 'vite build'
        },
        devDependencies: {
          vite: '^5.0.0'
        }
      };
      await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
      runCommand('npm install', { cwd: projectPath });
      
      spinner.succeed('Frontend tools configured');
    }
    
    return projectPath;
  } catch (error) {
    spinner.fail('Failed to setup PHP project');
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
 * Handle CMS-specific setup flows (WordPress, PrestaShop, Drupal, Custom PHP)
 * @param {string} projectType - The type of project to create
 * @param {object} deps - Dependencies status
 * @param {object} versions - Dependency versions
 * @param {ora.Ora} spinner - Ora spinner instance
 * @param {boolean} hasCopilotCli - Whether Copilot CLI is available
 */
const handleCmsSetup = async (projectType, deps, versions, spinner, hasCopilotCli) => {
  try {
    // Get CMS-specific prompts
    logger.section('Project Configuration');
    
    let cmsPrompts = [];
    const basePrompts = [
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: 'my-project',
        validate: (input) => {
          if (!input.trim()) return 'Project name is required';
          if (!/^[a-z0-9-_]+$/i.test(input)) return 'Use only alphanumeric, dash, or underscore';
          return true;
        }
      },
      {
        type: 'input',
        name: 'projectDescription',
        message: 'Project description (optional):',
        default: ''
      }
    ];
    
    // Add type-specific prompts
    if (projectType === 'wordpress') {
      cmsPrompts = [...basePrompts, ...getWordPressPrompts()];
    } else if (projectType === 'prestashop') {
      cmsPrompts = [...basePrompts, ...getPrestaShopPrompts()];
    } else if (projectType === 'drupal') {
      cmsPrompts = [...basePrompts, ...getDrupalPrompts()];
    } else if (projectType === 'custom-php') {
      cmsPrompts = [...basePrompts, ...getCustomPhpPrompts()];
    }
    
    // Add common options
    cmsPrompts.push(
      {
        type: 'input',
        name: 'repoUrl',
        message: 'Git repository URL (optional):',
        default: ''
      },
      {
        type: 'confirm',
        name: 'wantCopilotSetup',
        message: 'Add GitHub Copilot integration (.github folder)?',
        default: true
      }
    );
    
    const config = await inquirer.prompt(cmsPrompts);
    config.projectType = projectType;
    
    // Validate project directory doesn't exist
    const projectPath = path.join(process.cwd(), config.projectName);
    
    if (directoryExists(projectPath)) {
      logger.error(`Directory "${config.projectName}" already exists. Please choose a different name.`);
      process.exit(1);
    }
    
    // Start project creation
    logger.title('Creating Project');
    
    // Create project directory
    spinner = ora();
    spinner.text = 'Creating project directory...';
    spinner.start();
    
    await fs.ensureDir(projectPath);
    spinner.succeed(`Created project directory: ${config.projectName}`);
    
    // Create CMS project based on type
    if (projectType === 'wordpress') {
      logger.section('WordPress Setup');
      await createWordPressProject(projectPath, config, spinner, deps);
    } else if (projectType === 'prestashop') {
      logger.section('PrestaShop Setup');
      await createPrestaShopProject(projectPath, config, spinner, deps);
    } else if (projectType === 'drupal') {
      logger.section('Drupal Setup');
      await createDrupalProject(projectPath, config, spinner, deps);
    } else if (projectType === 'custom-php') {
      logger.section('PHP Project Setup');
      await createCustomPhpProject(projectPath, config, spinner, deps);
    }
    
    // Setup Git if repo URL provided
    if (config.repoUrl) {
      logger.section('Git Configuration');
      spinner = ora();
      spinner.text = 'Initializing git...';
      spinner.start();
      
      runCommand('git init', { cwd: projectPath, silent: true });
      runCommand(`git remote add origin ${config.repoUrl}`, { cwd: projectPath, silent: true });
      spinner.succeed('Git initialized with remote');
    } else {
      spinner = ora();
      spinner.text = 'Initializing git...';
      spinner.start();
      runCommand('git init', { cwd: projectPath, silent: true });
      spinner.succeed('Git initialized');
    }
    
    // Setup Copilot integration if requested
    if (config.wantCopilotSetup) {
      logger.section('GitHub Copilot Integration');
      await setupCopilotIntegration(projectPath, config, spinner, hasCopilotCli);
    }
    
    // Create README.md
    logger.section('Documentation');
    spinner = ora();
    spinner.text = 'Creating README.md...';
    spinner.start();
    
    const readmeContent = generateCmsReadme(config);
    await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);
    spinner.succeed('README.md created');
    
    // Create .gitignore
    spinner = ora();
    spinner.text = 'Creating .gitignore...';
    spinner.start();
    
    const gitignoreContent = getCmsGitignore(projectType);
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
    spinner.succeed('.gitignore created');
    
    // Success message
    logger.title('Setup Complete! 🎉');
    
    console.log(chalk.green('  Your project has been created successfully!'));
    console.log();
    console.log(chalk.white('  Project: ') + chalk.cyan(config.projectName));
    console.log(chalk.white('  Type: ') + chalk.cyan(getProjectTypeLabel(projectType)));
    console.log();
    
    console.log(chalk.white('  Next steps:'));
    console.log(chalk.cyan(`  1. cd ${config.projectName}`));
    
    if (projectType === 'wordpress') {
      if (!deps.wpCli && !deps.composer) {
        console.log(chalk.cyan('  2. Download WordPress from wordpress.org'));
      }
      console.log(chalk.cyan('  3. Configure wp-config.php'));
      console.log(chalk.cyan('  4. Run installation wizard'));
    } else if (projectType === 'prestashop') {
      console.log(chalk.cyan('  2. Configure database settings'));
      console.log(chalk.cyan('  3. Run installation wizard'));
    } else if (projectType === 'drupal') {
      console.log(chalk.cyan('  2. drush site:install (or use web installer)'));
    } else if (projectType === 'custom-php') {
      console.log(chalk.cyan('  2. Start your development server'));
    }
    
    console.log();
    
    if (config.wantCopilotSetup) {
      console.log(chalk.white('  GitHub Copilot:'));
      console.log(chalk.cyan('  Instructions: .github/copilot-instructions.md'));
      if (hasCopilotCli) {
        console.log(chalk.green('  ✔ Project prompt generated with Copilot CLI'));
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
 * Get human-readable label for project type
 */
const getProjectTypeLabel = (type) => {
  const labels = {
    'fullstack': 'Full-Stack (Laravel + React)',
    'wordpress': 'WordPress',
    'prestashop': 'PrestaShop',
    'drupal': 'Drupal',
    'custom-php': 'Custom PHP'
  };
  return labels[type] || type;
};

/**
 * Generate README for CMS projects
 */
const generateCmsReadme = (config) => {
  return `# ${config.projectName}

${config.projectDescription || ''}

## Project Type

${getProjectTypeLabel(config.projectType)}

## Setup Instructions

${config.projectType === 'wordpress' ? `
### WordPress Setup

1. Configure your database settings
2. Update wp-config.php with your credentials
3. Run the WordPress installation wizard
4. Activate your theme/plugins

#### Theme Development
Your custom theme is located in \`wp-content/themes/\`

#### Plugin Development
Your custom plugins are in \`wp-content/plugins/\`
` : ''}

${config.projectType === 'prestashop' ? `
### PrestaShop Setup

1. Configure database connection
2. Run the PrestaShop installer
3. Activate your theme/modules from back office

#### Theme Development
Custom themes: \`themes/\`

#### Module Development
Custom modules: \`modules/\`
` : ''}

${config.projectType === 'drupal' ? `
### Drupal Setup

1. Configure database in sites/default/settings.php
2. Run: \`drush site:install\` or use web installer
3. Enable your custom modules/themes

#### Theme Development
Custom themes: \`web/themes/custom/\`

#### Module Development
Custom modules: \`web/modules/custom/\`
` : ''}

${config.projectType === 'custom-php' ? `
### PHP Project

1. Install dependencies: \`composer install\`
2. Configure your environment
3. Run development server

#### Project Structure
- \`public/\` - Web root
- \`src/\` - Application code
- \`config/\` - Configuration files
` : ''}

## GitHub Copilot

${config.wantCopilotSetup ? `
This project includes GitHub Copilot integration:
- \`.github/copilot-instructions.md\` - AI context and guidelines
- \`.github/prompts/\` - Saved prompts for reference
` : 'No Copilot integration configured.'}

---

Generated with vdigitalize CLI
`;
};

/**
 * Get .gitignore content for CMS projects
 */
const getCmsGitignore = (projectType) => {
  const common = `# Dependencies
node_modules/
vendor/

# Environment files
.env
.env.local
.env.*.local
*.local.php

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
error_log
debug.log

# Cache
cache/
tmp/
`;

  const wpIgnore = `
# WordPress specific
wp-config.php
wp-content/uploads/
wp-content/upgrade/
wp-content/cache/
wp-content/backup-db/
wp-content/backups/
wp-content/blogs.dir/
wp-content/advanced-cache.php
wp-content/wp-cache-config.php
wp-content/debug.log

# Ignore all plugins/themes except custom
# wp-content/plugins/*
# !wp-content/plugins/your-custom-plugin/
# wp-content/themes/*
# !wp-content/themes/your-custom-theme/
`;

  const psIgnore = `
# PrestaShop specific
config/settings.inc.php
config/defines.inc.php
cache/*
var/*
upload/
download/
img/p/
img/c/
img/m/
img/tmp/
themes/*/cache/
`;

  const drupalIgnore = `
# Drupal specific
web/sites/*/settings.local.php
web/sites/*/files/
web/sites/*/private/
web/sites/simpletest/
web/sites/*/translations/
`;

  const phpIgnore = `
# Build outputs
dist/
build/
`;

  if (projectType === 'wordpress') return common + wpIgnore;
  if (projectType === 'prestashop') return common + psIgnore;
  if (projectType === 'drupal') return common + drupalIgnore;
  return common + phpIgnore;
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
    
    // Show CMS-specific tools
    if (deps.wpCli) logger.success(`WP-CLI ${versions.wpCli} detected`);
    if (deps.drush) logger.success(`Drush ${versions.drush} detected`);
    if (deps.mysql) logger.success(`MySQL ${versions.mysql} detected`);
    
    // Step 0: Select project type
    logger.section('Project Type');
    const { projectType } = await inquirer.prompt(getProjectTypePrompts());
    
    // Handle CMS-specific setups
    if (projectType !== 'fullstack') {
      return await handleCmsSetup(projectType, deps, versions, spinner, hasCopilotCli);
    }
    
    // Step 1: Collect basic project info (for fullstack only)
    logger.section('Project Configuration');
    const basicAnswers = await inquirer.prompt(getFullStackPrompts());
    
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
