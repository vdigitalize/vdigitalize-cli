#!/usr/bin/env node

/**
 * VDigitalize CLI
 * A professional CLI tool for scaffolding full-stack projects
 * with Laravel backend, React frontend, and GitHub Copilot integration
 * 
 * Usage:
 *   vdigitalize setup   - Interactive project setup wizard
 *   vdigitalize doctor  - Check system dependencies
 * 
 * @author VDigitalize
 * @version 1.2.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { setup } from './commands/setup.js';
import { doctor } from './commands/doctor.js';
import logger from './utils/logger.js';

// Create the CLI program
const program = new Command();

// Program metadata
program
  .name('vdigitalize')
  .version('1.2.0', '-v, --version', 'Output the current version')
  .description(
    chalk.cyan('VDigitalize CLI') + 
    chalk.gray(' - Full-stack project scaffolding tool\n\n') +
    chalk.white('  A professional CLI for creating projects with:\n') +
    chalk.gray('  • Laravel backend (via Composer)\n') +
    chalk.gray('  • React frontend (via Vite)\n') +
    chalk.gray('  • Git multi-repository management\n') +
    chalk.gray('  • Automated push scripts')
  )
  .addHelpText('after', `
${chalk.cyan('Examples:')}
  ${chalk.gray('$')} vdigitalize setup     ${chalk.dim('# Start interactive project setup')}
  ${chalk.gray('$')} vdigitalize doctor    ${chalk.dim('# Check system dependencies')}
  ${chalk.gray('$')} vdigitalize --version ${chalk.dim('# Show CLI version')}
  ${chalk.gray('$')} vdigitalize --help    ${chalk.dim('# Show help information')}

${chalk.cyan('Documentation:')}
  ${chalk.gray('https://github.com/vdigitalize/vdigitalize-cli')}
`);

// Setup command - Interactive project scaffolding
program
  .command('setup')
  .alias('s')
  .description('Create a new full-stack project with interactive prompts')
  .action(async () => {
    try {
      await setup();
    } catch (error) {
      logger.error(`Setup failed: ${error.message}`);
      process.exit(1);
    }
  });

// Doctor command - System health check
program
  .command('doctor')
  .alias('d')
  .description('Check if all required dependencies are installed')
  .action(async () => {
    try {
      const success = await doctor();
      process.exit(success ? 0 : 1);
    } catch (error) {
      logger.error(`Doctor check failed: ${error.message}`);
      process.exit(1);
    }
  });

// Custom help command styling
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => chalk.cyan(cmd.name()) + (cmd.alias() ? chalk.gray(`, ${cmd.alias()}`) : '')
});

// Handle unknown commands
program.on('command:*', (operands) => {
  logger.error(`Unknown command: ${operands[0]}`);
  logger.info(`Run ${chalk.cyan('vdigitalize --help')} to see available commands.`);
  process.exit(1);
});

// Show help if no command provided
if (process.argv.length < 3) {
  logger.banner();
  program.outputHelp();
  process.exit(0);
}

// Parse command line arguments
program.parse(process.argv);
