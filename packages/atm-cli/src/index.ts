#!/usr/bin/env node
import { Command } from 'commander';
import { buildTool } from './commands/build';
import { publishTool } from './commands/publish';
import { login } from './commands/login';
import { initTool } from './commands/init';

const program = new Command();

program
  .name('atm')
  .description('ATM (Agent Tool Manager) CLI By Synaptic')
  .version(require('../package.json').version);

program
  .command('init')
  .description('Initialize a new ATM tool from template')
  .argument('[folder]', 'Folder name to create the tool in')
  .action(initTool);

program
  .command('login')
  .description('Login to ATM')
  .action(login);

program
  .command('build')
  .description('Build an ATM tool or toolkit')
  .argument('[path]', 'Path to tool or toolkit entry file, defaults to index.ts in current directory', 'index.ts')
  .action(buildTool);

program
  .command('publish')
  .description('Publish tool to ATM registry')
  .option('-t, --target <path>', 'Path to tool directory to publish', 'atm-dist')
  .option('-u, --userid <id>', 'User ID for publishing the tool')
  .action(publishTool);

program.parse(); 