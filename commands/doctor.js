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
  let hasErrors = false;

  // Check each dependency
  for (const dep of dependencies) {
    const version = getVersion(dep.command);
    results.push({
      ...dep,
      version,
      installed: version !== null
    });
    if (!version) hasErrors = true;
  }

  spinner.stop();

  // Display results
  logger.section('Dependencies Status');
  console.log();

  for (const result of results) {
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

  console.log();

  // If there are missing dependencies, show install instructions
  if (hasErrors) {
    const platform = process.platform;
    const platformName = getPlatformName();

    logger.section(`Installation Instructions (${platformName})`);
    console.log();

    for (const result of results) {
      if (!result.installed) {
        console.log(chalk.yellow(`  ${result.name}:`));
        console.log(chalk.gray(`    Command: ${result.installCommand[platform] || result.installCommand.linux}`));
        console.log(chalk.gray(`    Website: ${result.installUrl}`));
        console.log();
      }
    }

    logger.error('Some dependencies are missing. Please install them to continue.');
    logger.newLine();
    return false;
  }

  logger.success('All dependencies are installed and working!');
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
