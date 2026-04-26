/**
 * Doctor Command
 * Checks system dependencies and their versions
 * Helps users ensure their environment is properly configured
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import logger from '../utils/logger.js';

/**
 * List of required dependencies with their check commands and install instructions
 */
const dependencies = [
  {
    name: 'Node.js',
    command: 'node --version',
    installUrl: 'https://nodejs.org/',
    installCommand: {
      darwin: 'brew install node',
      linux: 'sudo apt install nodejs',
      win32: 'Download from https://nodejs.org/'
    }
  },
  {
    name: 'npm',
    command: 'npm --version',
    installUrl: 'https://www.npmjs.com/',
    installCommand: {
      darwin: 'Comes with Node.js',
      linux: 'sudo apt install npm',
      win32: 'Comes with Node.js'
    }
  },
  {
    name: 'Git',
    command: 'git --version',
    installUrl: 'https://git-scm.com/',
    installCommand: {
      darwin: 'brew install git',
      linux: 'sudo apt install git',
      win32: 'Download from https://git-scm.com/'
    }
  },
  {
    name: 'Composer',
    command: 'composer --version',
    installUrl: 'https://getcomposer.org/',
    installCommand: {
      darwin: 'brew install composer',
      linux: 'sudo apt install composer',
      win32: 'Download from https://getcomposer.org/'
    }
  },
  {
    name: 'PHP',
    command: 'php --version',
    installUrl: 'https://www.php.net/',
    installCommand: {
      darwin: 'brew install php',
      linux: 'sudo apt install php',
      win32: 'Download from https://www.php.net/'
    }
  },
  {
    name: 'GitHub CLI',
    command: 'gh --version',
    installUrl: 'https://cli.github.com/',
    installCommand: {
      darwin: 'brew install gh',
      linux: 'See https://github.com/cli/cli#installation',
      win32: 'Download from https://cli.github.com/'
    },
    optional: true
  },
  {
    name: 'Copilot CLI',
    command: 'gh copilot --version',
    installUrl: 'https://docs.github.com/en/copilot/github-copilot-in-the-cli',
    installCommand: {
      darwin: 'gh extension install github/gh-copilot',
      linux: 'gh extension install github/gh-copilot',
      win32: 'gh extension install github/gh-copilot'
    },
    optional: true,
    requiresGh: true
  }
];

/**
 * Execute a command and return the version string
 * @param {string} command - Command to execute
 * @returns {string|null} - Version string or null if command fails
 */
const getVersion = (command) => {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr
    });
    // Extract version number (handles various version output formats)
    const versionMatch = output.match(/(\d+\.\d+(\.\d+)?)/);
    return versionMatch ? versionMatch[0] : output.trim().split('\n')[0];
  } catch {
    return null;
  }
};

/**
 * Get the current platform name for user-friendly display
 * @returns {string} - Platform name
 */
const getPlatformName = () => {
  const platform = process.platform;
  switch (platform) {
    case 'darwin':
      return 'macOS';
    case 'linux':
      return 'Linux';
    case 'win32':
      return 'Windows';
    default:
      return platform;
  }
};

/**
 * Main doctor command handler
 * Checks all dependencies and reports their status
 */
export const doctor = async () => {
  logger.banner();
  logger.title('System Health Check');

  const spinner = ora('Checking system dependencies...').start();
  const results = [];
  let hasRequiredErrors = false;
  
  // Check if gh is installed first (needed for Copilot CLI check)
  const ghInstalled = getVersion('gh --version') !== null;

  // Check each dependency
  for (const dep of dependencies) {
    // Skip Copilot CLI check if gh is not installed
    if (dep.requiresGh && !ghInstalled) {
      results.push({
        ...dep,
        version: null,
        installed: false,
        skipped: true
      });
      continue;
    }
    
    const version = getVersion(dep.command);
    results.push({
      ...dep,
      version,
      installed: version !== null
    });
    if (!version && !dep.optional) hasRequiredErrors = true;
  }

  spinner.stop();

  // Display results
  logger.section('Required Dependencies');
  console.log();

  for (const result of results) {
    if (result.optional) continue;
    
    if (result.installed) {
      console.log(
        chalk.green('  ✔'),
        chalk.white(result.name.padEnd(12)),
        chalk.gray('│'),
        chalk.cyan(result.version)
      );
    } else {
      console.log(
        chalk.red('  ✖'),
        chalk.white(result.name.padEnd(12)),
        chalk.gray('│'),
        chalk.red('Not installed')
      );
    }
  }

  // Show optional dependencies
  logger.section('Optional Dependencies');
  console.log();

  for (const result of results) {
    if (!result.optional) continue;
    
    if (result.installed) {
      console.log(
        chalk.green('  ✔'),
        chalk.white(result.name.padEnd(12)),
        chalk.gray('│'),
        chalk.cyan(result.version)
      );
    } else if (result.skipped) {
      console.log(
        chalk.gray('  ○'),
        chalk.gray(result.name.padEnd(12)),
        chalk.gray('│'),
        chalk.gray('Requires GitHub CLI')
      );
    } else {
      console.log(
        chalk.yellow('  ○'),
        chalk.white(result.name.padEnd(12)),
        chalk.gray('│'),
        chalk.yellow('Not installed (optional)')
      );
    }
  }

  console.log();

  // If there are missing required dependencies, show install instructions
  if (hasRequiredErrors) {
    const platform = process.platform;
    const platformName = getPlatformName();

    logger.section(`Installation Instructions (${platformName})`);
    console.log();

    for (const result of results) {
      if (!result.installed && !result.optional) {
        console.log(chalk.yellow(`  ${result.name}:`));
        console.log(chalk.gray(`    Command: ${result.installCommand[platform] || result.installCommand.linux}`));
        console.log(chalk.gray(`    Website: ${result.installUrl}`));
        console.log();
      }
    }

    logger.error('Some required dependencies are missing. Please install them to continue.');
    logger.newLine();
    return false;
  }

  // Show optional installation tips
  const missingOptional = results.filter(r => r.optional && !r.installed && !r.skipped);
  if (missingOptional.length > 0) {
    logger.section('Optional Installations');
    console.log();
    console.log(chalk.dim('  These are optional but enhance the vdigitalize experience:'));
    console.log();
    
    const platform = process.platform;
    for (const result of missingOptional) {
      console.log(chalk.yellow(`  ${result.name}:`));
      console.log(chalk.gray(`    ${result.installCommand[platform] || result.installCommand.linux}`));
    }
    console.log();
  }

  logger.success('All required dependencies are installed!');
  logger.newLine();

  // Show system info
  logger.section('System Information');
  console.log();
  console.log(chalk.gray('  Platform:'), chalk.white(getPlatformName()));
  console.log(chalk.gray('  Architecture:'), chalk.white(process.arch));
  console.log(chalk.gray('  Node Path:'), chalk.white(process.execPath));
  logger.newLine();

  return true;
};

export default doctor;
