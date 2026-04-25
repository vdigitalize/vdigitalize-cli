/**
 * Logger Utility
 * Provides colored console output using Chalk
 * Includes helper functions for different log types
 */

import chalk from 'chalk';

/**
 * Display a success message (green checkmark)
 * @param {string} message - The message to display
 */
export const success = (message) => {
  console.log(chalk.green('✔'), chalk.green(message));
};

/**
 * Display an error message (red cross)
 * @param {string} message - The message to display
 */
export const error = (message) => {
  console.log(chalk.red('✖'), chalk.red(message));
};

/**
 * Display an info message (blue info icon)
 * @param {string} message - The message to display
 */
export const info = (message) => {
  console.log(chalk.blue('ℹ'), chalk.blue(message));
};

/**
 * Display a step/progress message (yellow arrow)
 * @param {string} message - The message to display
 */
export const step = (message) => {
  console.log(chalk.yellow('→'), chalk.yellow(message));
};

/**
 * Display a warning message (orange warning icon)
 * @param {string} message - The message to display
 */
export const warn = (message) => {
  console.log(chalk.hex('#FFA500')('⚠'), chalk.hex('#FFA500')(message));
};

/**
 * Display a title/header message (bold cyan)
 * @param {string} message - The message to display
 */
export const title = (message) => {
  console.log();
  console.log(chalk.bold.cyan('═'.repeat(50)));
  console.log(chalk.bold.cyan(`  ${message}`));
  console.log(chalk.bold.cyan('═'.repeat(50)));
  console.log();
};

/**
 * Display a section header (bold white)
 * @param {string} message - The message to display
 */
export const section = (message) => {
  console.log();
  console.log(chalk.bold.white(`▸ ${message}`));
  console.log(chalk.gray('─'.repeat(40)));
};

/**
 * Display a dim/muted message
 * @param {string} message - The message to display
 */
export const dim = (message) => {
  console.log(chalk.dim(`  ${message}`));
};

/**
 * Display a blank line
 */
export const newLine = () => {
  console.log();
};

/**
 * Display a command that was/will be run
 * @param {string} command - The command to display
 */
export const command = (command) => {
  console.log(chalk.gray(`  $ ${command}`));
};

/**
 * Display the CLI banner
 */
export const banner = () => {
  console.log();
  console.log(chalk.bold.magenta('  ╦  ╦╔╦╗╦╔═╗╦╔╦╗╔═╗╦  ╦╔═╗╔═╗'));
  console.log(chalk.bold.magenta('  ╚╗╔╝ ║║║║ ╦║ ║ ╠═╣║  ║╔═╝║╣ '));
  console.log(chalk.bold.magenta('   ╚╝ ═╩╝╩╚═╝╩ ╩ ╩ ╩╩═╝╩╚═╝╚═╝'));
  console.log(chalk.dim('  Full-Stack Project Scaffolding Tool'));
  console.log();
};

export default {
  success,
  error,
  info,
  step,
  warn,
  title,
  section,
  dim,
  newLine,
  command,
  banner
};
