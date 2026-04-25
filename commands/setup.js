/**
 * Setup Command
 * Interactive setup flow for creating full-stack projects
 * - Laravel backend with Composer
 * - React frontend with Vite
 * - Git repositories with multiple remotes
 * - Optional push.sh generation
 */

import { execSync } from 'child_process';
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
 * Validate GitHub URL format
 * @param {string} url - URL to validate
 * @returns {boolean|string} - true if valid, error message if invalid
 */
const validateGitHubUrl = (url) => {
  if (!url) return 'URL is required';
  
  // Allow both HTTPS and SSH Git URLs
  const httpsPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/;
  const sshPattern = /^git@github\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/;
  
  if (httpsPattern.test(url) || sshPattern.test(url)) {
    return true;
  }
  
  return 'Please enter a valid GitHub URL (https://github.com/user/repo or git@github.com:user/repo)';
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
 * Check if a directory exists
 * @param {string} dirPath - Directory path
 * @returns {boolean}
 */
const directoryExists = (dirPath) => {
  return fs.existsSync(dirPath);
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
    message: 'Frontend GitHub repository URL:',
    validate: validateGitHubUrl
  },
  {
    type: 'input',
    name: 'backendRepoUrl',
    message: 'Backend GitHub repository URL:',
    validate: validateGitHubUrl
  },
  {
    type: 'input',
    name: 'distRepoUrl',
    message: 'Frontend/dist GitHub repository URL:',
    validate: validateGitHubUrl
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
 * Get push.sh confirmation prompt
 * @returns {Array} - Inquirer prompts array
 */
const getPushShPrompt = () => [
  {
    type: 'confirm',
    name: 'wantPushSh',
    message: 'Do you want to create push.sh file?',
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
 */
const createLaravelProject = async (projectPath, backendFolder, spinner) => {
  const backendPath = path.join(projectPath, backendFolder);
  
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
 * Create Vite React project
 * @param {string} projectPath - Base project path
 * @param {string} frontendFolder - Frontend folder name
 * @param {ora.Ora} spinner - Ora spinner instance
 */
const createViteProject = async (projectPath, frontendFolder, spinner) => {
  const frontendPath = path.join(projectPath, frontendFolder);
  
  spinner.text = 'Creating Vite React project...';
  spinner.start();
  
  try {
    // Create Vite project with React template
    runCommand(`npm create vite@latest ${frontendFolder} -- --template react`, {
      cwd: projectPath
    });
    
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
 * Main setup command handler
 */
export const setup = async () => {
  logger.banner();
  logger.title('Project Setup Wizard');
  
  let spinner = ora();
  
  try {
    // Step 1: Collect user inputs
    logger.section('Project Configuration');
    
    const basicAnswers = await inquirer.prompt(getSetupPrompts());
    
    // Get environment URLs if needed
    let envAnswers = {};
    if (basicAnswers.hasStagingProd) {
      logger.section('Environment URLs');
      envAnswers = await inquirer.prompt(getEnvironmentPrompts());
    }
    
    // Ask about push.sh
    const pushShAnswer = await inquirer.prompt(getPushShPrompt());
    
    // Combine all answers
    const config = { ...basicAnswers, ...envAnswers, ...pushShAnswer };
    
    // Step 2: Validate project directory doesn't exist
    const projectPath = path.join(process.cwd(), config.projectName);
    
    if (directoryExists(projectPath)) {
      logger.error(`Directory "${config.projectName}" already exists. Please choose a different name.`);
      process.exit(1);
    }
    
    // Step 3: Start project creation
    logger.title('Creating Project');
    
    // Create project directory
    spinner.text = 'Creating project directory...';
    spinner.start();
    
    await fs.ensureDir(projectPath);
    spinner.succeed(`Created project directory: ${config.projectName}`);
    
    // Step 4: Create Laravel backend
    logger.section('Backend Setup (Laravel)');
    const backendPath = await createLaravelProject(projectPath, config.backendFolder, spinner);
    
    // Step 5: Create Vite React frontend
    logger.section('Frontend Setup (Vite + React)');
    const frontendPath = await createViteProject(projectPath, config.frontendFolder, spinner);
    
    // Step 6: Setup Git repositories
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
    
    // Step 7: Create push.sh if requested
    if (config.wantPushSh) {
      logger.section('Push Script');
      await setupPushScript(projectPath, config, spinner);
    }
    
    // Step 8: Create a README.md for the project
    logger.section('Documentation');
    spinner.text = 'Creating README.md...';
    spinner.start();
    
    const readmeContent = generateReadme(config);
    await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);
    spinner.succeed('README.md created');
    
    // Step 9: Create .gitignore for root
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
    console.log(chalk.gray('  ├── README.md'));
    console.log(chalk.gray('  ├── .gitignore'));
    if (config.wantPushSh) {
      console.log(chalk.gray('  └── push.sh'));
    }
    console.log();
    
    console.log(chalk.white('  Next steps:'));
    console.log(chalk.cyan(`  1. cd ${config.projectName}`));
    console.log(chalk.cyan(`  2. cd ${config.backendFolder} && php artisan serve`));
    console.log(chalk.cyan(`  3. cd ${config.frontendFolder} && npm run dev`));
    console.log();
    
    if (config.wantPushSh) {
      console.log(chalk.white('  To push all repositories:'));
      console.log(chalk.cyan('  ./push.sh "Your commit message"'));
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

Full-stack project with Laravel backend and React frontend.

## Project Structure

\`\`\`
${config.projectName}/
├── ${config.backendFolder}/     # Laravel API
├── ${config.frontendFolder}/    # React (Vite)
│   └── dist/        # Production build
├── README.md
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

## Created with ❤️ by VDigitalize CLI
`;

  return content;
};

export default setup;
