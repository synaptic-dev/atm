#!/usr/bin/env node
import { Command } from 'commander';
import { buildTool } from './commands/build';
import { publishTool } from './commands/publish';
import { login } from './commands/login';
import { initTool } from './commands/init';

const program = new Command();

program
  .name('openkit')
  .description('OpenKit CLI')
  .version(require('../package.json').version);

program
  .command('init')
  .description('Initialize a new OpenKit tool from template')
  .argument('[folder]', 'Folder name to create the tool in')
  .action(initTool);

program
  .command('login')
  .description('Login to OpenKit')
  .action(login);

program
  .command('build')
  .description('Build an OpenKit tool or toolkit')
  .argument('[path]', 'Path to tool or toolkit entry file, defaults to index.ts in current directory', 'index.ts')
  .action(buildTool);

program
  .command('publish')
  .description('Publish tool to OpenKit registry')
  .option('-t, --target <path>', 'Path to tool directory to publish', 'openkit-dist')
  .option('-u, --userid <id>', 'User ID for publishing the tool')
  .action(publishTool);

program.parse(); 