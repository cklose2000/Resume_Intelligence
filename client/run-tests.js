#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting test runner...');
console.log('Working directory:', process.cwd());

const vitestPath = path.join(__dirname, 'node_modules', '.bin', 'vitest');
const args = ['run', '--reporter=verbose', '--no-threads'];

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