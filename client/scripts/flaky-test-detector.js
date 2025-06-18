#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FlakyTestDetector {
  constructor() {
    this.maxRetries = 3;
    this.flakyTests = new Set();
    this.testResults = new Map();
  }

  async runTest(testFile, attempt = 1) {
    return new Promise((resolve) => {
      console.log(`\n🔄 Running ${testFile} (attempt ${attempt}/${this.maxRetries})...`);
      
      const child = spawn('npx', [
        'vitest',
        'run',
        '--config', 'vitest.config.ci.ts',
        '--reporter', 'json',
        '--no-coverage',
        testFile
      ], {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=2048'
        }
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        output += data.toString();
      });

      child.on('exit', (code) => {
        try {
          // Extract JSON from output
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const results = JSON.parse(jsonMatch[0]);
            resolve({ code, results });
          } else {
            resolve({ code, results: null });
          }
        } catch (error) {
          console.error('Failed to parse test results:', error);
          resolve({ code, results: null });
        }
      });
    });
  }

  async detectFlakyTest(testFile) {
    const results = [];
    
    for (let i = 1; i <= this.maxRetries; i++) {
      const { code, results: testResults } = await this.runTest(testFile, i);
      results.push({ attempt: i, passed: code === 0, results: testResults });
      
      // Small delay between runs
      if (i < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Analyze results
    const passCount = results.filter(r => r.passed).length;
    const isFlaky = passCount > 0 && passCount < this.maxRetries;

    if (isFlaky) {
      this.flakyTests.add(testFile);
      console.log(`\n⚠️  FLAKY TEST DETECTED: ${testFile}`);
      console.log(`   Passed ${passCount}/${this.maxRetries} times`);
    } else if (passCount === 0) {
      console.log(`\n❌ CONSISTENTLY FAILING: ${testFile}`);
    } else {
      console.log(`\n✅ STABLE TEST: ${testFile}`);
    }

    this.testResults.set(testFile, {
      isFlaky,
      passCount,
      totalRuns: this.maxRetries,
      results
    });

    return isFlaky;
  }

  generateReport() {
    const report = {
      summary: {
        totalTests: this.testResults.size,
        flakyTests: this.flakyTests.size,
        stableTests: 0,
        failingTests: 0
      },
      flakyTests: [],
      failingTests: [],
      stableTests: []
    };

    this.testResults.forEach((data, testFile) => {
      if (data.isFlaky) {
        report.flakyTests.push({
          file: testFile,
          passRate: (data.passCount / data.totalRuns * 100).toFixed(1) + '%',
          runs: data.results
        });
      } else if (data.passCount === 0) {
        report.failingTests.push(testFile);
        report.summary.failingTests++;
      } else {
        report.stableTests.push(testFile);
        report.summary.stableTests++;
      }
    });

    return report;
  }

  saveReport(report) {
    const reportFile = path.join(__dirname, '..', 'flaky-test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Flaky Test Detection Report');
    console.log('================================');
    console.log(`Total Tests Analyzed: ${report.summary.totalTests}`);
    console.log(`Flaky Tests Found: ${report.summary.flakyTests}`);
    console.log(`Stable Tests: ${report.summary.stableTests}`);
    console.log(`Consistently Failing: ${report.summary.failingTests}`);
    
    if (report.flakyTests.length > 0) {
      console.log('\n⚠️  Flaky Tests:');
      report.flakyTests.forEach(test => {
        console.log(`- ${test.file} (${test.passRate} pass rate)`);
      });
    }
    
    console.log(`\nFull report saved to: ${reportFile}`);
  }
}

async function main() {
  const detector = new FlakyTestDetector();
  const testFiles = process.argv.slice(2);

  if (testFiles.length === 0) {
    console.error('Usage: node flaky-test-detector.js <test-file1> [test-file2] ...');
    console.error('Example: node flaky-test-detector.js src/**/__tests__/*.test.tsx');
    process.exit(1);
  }

  console.log(`🔍 Detecting flaky tests in ${testFiles.length} files...`);
  console.log(`Each test will be run ${detector.maxRetries} times to detect flakiness.\n`);

  for (const testFile of testFiles) {
    await detector.detectFlakyTest(testFile);
  }

  const report = detector.generateReport();
  detector.saveReport(report);

  // Exit with error if flaky tests found
  if (report.summary.flakyTests > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Flaky test detection failed:', error);
  process.exit(1);
});