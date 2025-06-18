#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestPerformanceAnalyzer {
  constructor() {
    this.slowTestThreshold = 5000; // 5 seconds
    this.flakyTestThreshold = 0.8; // 80% pass rate
    this.testHistory = new Map();
  }

  loadTestResults(jsonFile) {
    try {
      const data = fs.readFileSync(jsonFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load test results from ${jsonFile}:`, error);
      return null;
    }
  }

  loadHistoricalData() {
    const historyFile = path.join(__dirname, '..', '.test-history.json');
    if (fs.existsSync(historyFile)) {
      try {
        const data = fs.readFileSync(historyFile, 'utf8');
        const history = JSON.parse(data);
        Object.entries(history).forEach(([key, value]) => {
          this.testHistory.set(key, value);
        });
      } catch (error) {
        console.warn('Failed to load test history:', error);
      }
    }
  }

  saveHistoricalData() {
    const historyFile = path.join(__dirname, '..', '.test-history.json');
    const historyObj = Object.fromEntries(this.testHistory);
    fs.writeFileSync(historyFile, JSON.stringify(historyObj, null, 2));
  }

  updateTestHistory(testName, duration, passed) {
    const history = this.testHistory.get(testName) || {
      runs: [],
      totalRuns: 0,
      totalPassed: 0,
      averageDuration: 0
    };

    history.runs.push({ duration, passed, timestamp: Date.now() });
    history.totalRuns++;
    if (passed) history.totalPassed++;
    
    // Keep only last 20 runs
    if (history.runs.length > 20) {
      history.runs = history.runs.slice(-20);
    }

    // Calculate average duration
    const durations = history.runs.map(r => r.duration);
    history.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    this.testHistory.set(testName, history);
  }

  analyzeTestResults(results) {
    const analysis = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      slowTests: [],
      flakyTests: [],
      performanceMetrics: {
        totalDuration: 0,
        averageDuration: 0,
        slowestTest: null,
        fastestTest: null
      }
    };

    if (!results || !results.testResults) {
      return analysis;
    }

    // Load historical data
    this.loadHistoricalData();

    // Analyze each test suite
    results.testResults.forEach(suite => {
      suite.assertionResults.forEach(test => {
        analysis.totalTests++;
        
        if (test.status === 'passed') {
          analysis.passedTests++;
        } else {
          analysis.failedTests++;
        }

        const duration = test.duration || 0;
        analysis.performanceMetrics.totalDuration += duration;

        // Track slow tests
        if (duration > this.slowTestThreshold) {
          analysis.slowTests.push({
            name: test.fullName,
            duration,
            file: suite.name
          });
        }

        // Update performance metrics
        if (!analysis.performanceMetrics.slowestTest || duration > analysis.performanceMetrics.slowestTest.duration) {
          analysis.performanceMetrics.slowestTest = { name: test.fullName, duration };
        }
        if (!analysis.performanceMetrics.fastestTest || duration < analysis.performanceMetrics.fastestTest.duration) {
          analysis.performanceMetrics.fastestTest = { name: test.fullName, duration };
        }

        // Update test history
        this.updateTestHistory(test.fullName, duration, test.status === 'passed');
      });
    });

    // Calculate average duration
    if (analysis.totalTests > 0) {
      analysis.performanceMetrics.averageDuration = 
        analysis.performanceMetrics.totalDuration / analysis.totalTests;
    }

    // Identify flaky tests based on history
    this.testHistory.forEach((history, testName) => {
      const passRate = history.totalPassed / history.totalRuns;
      if (passRate < this.flakyTestThreshold && passRate > 0 && history.totalRuns >= 5) {
        analysis.flakyTests.push({
          name: testName,
          passRate: (passRate * 100).toFixed(1),
          runs: history.totalRuns,
          averageDuration: history.averageDuration
        });
      }
    });

    // Save updated history
    this.saveHistoricalData();

    return analysis;
  }

  generateReport(analysis) {
    const report = [];
    
    report.push('# Test Performance Report');
    report.push('');
    report.push(`Generated at: ${new Date().toISOString()}`);
    report.push('');
    
    // Summary
    report.push('## Summary');
    report.push(`- Total Tests: ${analysis.totalTests}`);
    report.push(`- Passed: ${analysis.passedTests} (${((analysis.passedTests / analysis.totalTests) * 100).toFixed(1)}%)`);
    report.push(`- Failed: ${analysis.failedTests}`);
    report.push(`- Total Duration: ${(analysis.performanceMetrics.totalDuration / 1000).toFixed(2)}s`);
    report.push(`- Average Test Duration: ${analysis.performanceMetrics.averageDuration.toFixed(0)}ms`);
    report.push('');

    // Slow Tests
    if (analysis.slowTests.length > 0) {
      report.push('## ⚠️ Slow Tests (> 5s)');
      analysis.slowTests
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .forEach(test => {
          report.push(`- **${test.name}**: ${(test.duration / 1000).toFixed(2)}s`);
          report.push(`  - File: ${test.file}`);
        });
      report.push('');
    }

    // Flaky Tests
    if (analysis.flakyTests.length > 0) {
      report.push('## 🎲 Flaky Tests');
      analysis.flakyTests.forEach(test => {
        report.push(`- **${test.name}**`);
        report.push(`  - Pass Rate: ${test.passRate}% (${test.runs} runs)`);
        report.push(`  - Avg Duration: ${(test.averageDuration / 1000).toFixed(2)}s`);
      });
      report.push('');
    }

    // Performance Extremes
    report.push('## Performance Extremes');
    if (analysis.performanceMetrics.slowestTest) {
      report.push(`- **Slowest Test**: ${analysis.performanceMetrics.slowestTest.name} (${(analysis.performanceMetrics.slowestTest.duration / 1000).toFixed(2)}s)`);
    }
    if (analysis.performanceMetrics.fastestTest) {
      report.push(`- **Fastest Test**: ${analysis.performanceMetrics.fastestTest.name} (${analysis.performanceMetrics.fastestTest.duration}ms)`);
    }
    report.push('');

    // Recommendations
    report.push('## Recommendations');
    if (analysis.slowTests.length > 0) {
      report.push('- Consider optimizing slow tests or moving them to a separate test suite');
    }
    if (analysis.flakyTests.length > 0) {
      report.push('- Investigate and fix flaky tests to improve CI reliability');
    }
    if (analysis.performanceMetrics.averageDuration > 1000) {
      report.push('- Average test duration is high. Consider parallelization or test optimization');
    }

    return report.join('\n');
  }

  generateHtmlReport(analysis) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Performance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1, h2 { color: #333; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .summary-card { background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff; }
    .summary-card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #333; }
    .test-list { list-style: none; padding: 0; }
    .test-item { background: #f8f9fa; margin: 10px 0; padding: 10px; border-radius: 4px; }
    .slow { border-left: 4px solid #ffc107; }
    .flaky { border-left: 4px solid #dc3545; }
    .chart { margin: 20px 0; }
    .progress-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
    .progress-fill { background: #28a745; height: 100%; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Test Performance Report</h1>
    <p>Generated at: ${new Date().toLocaleString()}</p>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${analysis.totalTests}</div>
      </div>
      <div class="summary-card">
        <h3>Pass Rate</h3>
        <div class="value">${((analysis.passedTests / analysis.totalTests) * 100).toFixed(1)}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(analysis.passedTests / analysis.totalTests) * 100}%"></div>
        </div>
      </div>
      <div class="summary-card">
        <h3>Total Duration</h3>
        <div class="value">${(analysis.performanceMetrics.totalDuration / 1000).toFixed(1)}s</div>
      </div>
      <div class="summary-card">
        <h3>Avg Duration</h3>
        <div class="value">${analysis.performanceMetrics.averageDuration.toFixed(0)}ms</div>
      </div>
    </div>

    ${analysis.slowTests.length > 0 ? `
    <h2>⚠️ Slow Tests</h2>
    <ul class="test-list">
      ${analysis.slowTests.slice(0, 10).map(test => `
        <li class="test-item slow">
          <strong>${test.name}</strong><br>
          Duration: ${(test.duration / 1000).toFixed(2)}s<br>
          File: ${test.file}
        </li>
      `).join('')}
    </ul>
    ` : ''}

    ${analysis.flakyTests.length > 0 ? `
    <h2>🎲 Flaky Tests</h2>
    <ul class="test-list">
      ${analysis.flakyTests.map(test => `
        <li class="test-item flaky">
          <strong>${test.name}</strong><br>
          Pass Rate: ${test.passRate}% (${test.runs} runs)<br>
          Avg Duration: ${(test.averageDuration / 1000).toFixed(2)}s
        </li>
      `).join('')}
    </ul>
    ` : ''}
  </div>
</body>
</html>
    `;

    return html;
  }
}

// Main execution
async function main() {
  const analyzer = new TestPerformanceAnalyzer();
  const metricsFile = process.argv[2];

  if (!metricsFile) {
    console.error('Usage: node analyze-test-performance.js <test-metrics.json>');
    process.exit(1);
  }

  const results = analyzer.loadTestResults(metricsFile);
  if (!results) {
    process.exit(1);
  }

  const analysis = analyzer.analyzeTestResults(results);
  
  // Generate text report
  const textReport = analyzer.generateReport(analysis);
  console.log(textReport);
  
  // Save text report
  const reportFile = path.join(path.dirname(metricsFile), 'test-performance-report.md');
  fs.writeFileSync(reportFile, textReport);
  
  // Generate and save HTML report
  const htmlReport = analyzer.generateHtmlReport(analysis);
  const htmlFile = path.join(path.dirname(metricsFile), 'test-performance-report.html');
  fs.writeFileSync(htmlFile, htmlReport);

  console.log(`\nReports saved to:`);
  console.log(`- ${reportFile}`);
  console.log(`- ${htmlFile}`);

  // Exit with error if there are failures
  if (analysis.failedTests > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Performance analysis failed:', error);
  process.exit(1);
});