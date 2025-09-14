import { runWebVitalsGuardian } from './dist/index.mjs';

async function testNetworkRequests() {
  try {
    const config = {
      scenariosPath: './examples',
      headless: true,
      budgets: {
        FCP: 1800,
        LCP: 2500,
        CLS: 0.1,
        INP: 200,
        TTFB: 600
      },
      webVitals: {
        usePerformanceObserver: true,
        fallbackToPackage: false
      }
    };

    console.log('🚀 Testing Network Requests Collection...');
    
    const result = await runWebVitalsGuardian(config);
    
    console.log('\n📊 Network Requests Test Results:');
    result.reports.forEach(report => {
      console.log(`\n${report.scenario}:`);
      console.log(`  URL: ${report.url}`);
      
      if (report.network) {
        console.log('  Network Summary:');
        console.log(`    Total Requests: ${report.network.summary.totalRequests}`);
        console.log(`    Total Transfer Size: ${report.network.summary.totalTransferSize} bytes`);
        console.log(`    Average Response Time: ${report.network.summary.averageResponseTime.toFixed(2)}ms`);
        console.log(`    Failed Requests: ${report.network.summary.failedRequests}`);
        
        if (report.network.summary.slowestRequest) {
          console.log(`    Slowest Request: ${report.network.summary.slowestRequest.url} (${report.network.summary.slowestRequest.responseTime.toFixed(2)}ms)`);
        }
        
        console.log('    Requests by Type:');
        Object.entries(report.network.summary.requestsByType).forEach(([type, count]) => {
          console.log(`      ${type}: ${count}`);
        });
        
        console.log('    Requests by Domain:');
        Object.entries(report.network.summary.requestsByDomain).forEach(([domain, count]) => {
          console.log(`      ${domain}: ${count}`);
        });
        
        console.log('  Sample Network Requests:');
        report.network.requests.slice(0, 5).forEach((req, index) => {
          console.log(`    ${index + 1}. ${req.resourceType} - ${req.url}`);
          console.log(`       Response Time: ${req.responseTime.toFixed(2)}ms, Size: ${req.transferSize} bytes`);
        });
        
        if (report.network.requests.length > 5) {
          console.log(`    ... and ${report.network.requests.length - 5} more requests`);
        }
      } else {
        console.log('  ❌ No network data collected');
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing network requests:', error);
    process.exit(1);
  }
}

testNetworkRequests();
