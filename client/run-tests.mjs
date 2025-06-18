#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting test runner...');
console.log('Working directory:', process.cwd());

const vitestPath = join(__dirname, 'node_modules', '.bin', 'vitest');
const args = ['run', '--reporter=verbose', '--no-threads', 'src/lib/__tests__/simple.test.ts'];

console.log('Running command:', vitestPath, args.join(' '));

const vitest = spawn(vitestPath, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'test',
  }
});

vitest.on('close', (code) => {
  console.log(`Test runner exited with code ${code}`);
  process.exit(code);
});

vitest.on('error', (err) => {
  console.error('Failed to start test runner:', err);
  process.exit(1);
});