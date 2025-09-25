/**
 * Utility functions for analyzing enhanced profile data with source map information
 */

import { analyzeMemoryUsage } from './memoryAnalyzer';
import { analyzeThreadBlocking } from './threadBlockingAnalyzer';
import { analyzeCpuUsage } from './cpuUsageAnalyzer';

/**
 * Safely calculates percentage, returning 0 if denominator is 0
 */
function safePercentage(numerator: number, denominator: number): number {
  if (denominator === 0 || !isFinite(denominator) || !isFinite(numerator)) {
    return 0;
  }
  const percentage = (numerator / denominator) * 100;
  return isFinite(percentage) ? percentage : 0;
}

export interface EnhancedProfileNode {
  callFrame: {
    functionName: string;
    originalFunctionName?: string;
    originalSource?: string;
    originalLine?: number;
    originalColumn?: number;
    url: string;
  };
  hitCount?: number;
  children?: number[];
}

export interface EnhancedProfile {
  nodes: EnhancedProfileNode[];
  samples: any[];
  startTime: number;
  endTime: number;
}

/**
 * Analyzes profile data and returns comprehensive function performance statistics
 */
export function analyzeProfile(profile: EnhancedProfile) {
  const functionStats = new Map<string, {
    originalFunctionName: string;
    originalSource: string;
    originalLine: number;
    totalTime: number;
    hitCount: number;
    samples: number;
    averageTime: number;
    domain: string;
  }>();

  // Calculate total profile duration
  // Chrome DevTools profile timestamps are in microseconds, so convert to milliseconds
  const profileDurationMicroseconds = profile.endTime - profile.startTime;
  const profileDuration = profileDurationMicroseconds / 1000; // Convert to milliseconds
  // Each sample represents a point in time, so we need to calculate the time per sample
  // The actual time per sample depends on the profiler's sampling rate, but we can estimate
  // it as the total duration divided by the number of samples
  const timePerSample = profile.samples && profile.samples.length > 0 ? profileDuration / profile.samples.length : 0;

  // Analyze nodes
  if (!profile.nodes || !Array.isArray(profile.nodes)) {
    return [];
  }
  
  profile.nodes.forEach((node, index) => {
    const callFrame = node.callFrame;
    const functionName = callFrame.originalFunctionName || callFrame.functionName;
    const source = callFrame.originalSource || callFrame.url;
    const line = callFrame.originalLine || 0;
    
    // Extract domain from source URL
    let domain = 'unknown';
    try {
      if (source && source.startsWith('http')) {
        domain = new URL(source).hostname;
      } else if (source && source.includes('://')) {
        domain = new URL(source).hostname;
      } else if (source) {
        domain = 'local';
      }
    } catch (e) {
      domain = 'unknown';
    }
    
    if (!functionStats.has(functionName)) {
      functionStats.set(functionName, {
        originalFunctionName: functionName,
        originalSource: source,
        originalLine: line,
        totalTime: 0,
        hitCount: 0,
        samples: 0,
        averageTime: 0,
        domain: domain
      });
    }
    
    const stats = functionStats.get(functionName)!;
    stats.hitCount += node.hitCount || 0;
  });

  // Analyze samples and calculate execution time
  if (profile.samples && Array.isArray(profile.samples)) {
    profile.samples.forEach(sample => {
      // Sample is an index into the nodes array
      const nodeIndex = sample;
      if (nodeIndex !== undefined && profile.nodes[nodeIndex]) {
        const node = profile.nodes[nodeIndex];
        const functionName = node.callFrame.originalFunctionName || node.callFrame.functionName;
        
        if (functionStats.has(functionName)) {
          const stats = functionStats.get(functionName)!;
          stats.samples++;
          stats.totalTime += timePerSample;
        }
      }
    });
  }

  // Calculate average execution time per function
  functionStats.forEach(stats => {
    if (stats.hitCount > 0) {
      stats.averageTime = stats.totalTime / stats.hitCount;
    }
  });

  // Sort functions by total execution time (most expensive first)
  return Array.from(functionStats.values())
    .sort((a, b) => b.totalTime - a.totalTime);
}

/**
 * Gets the top N most expensive functions
 */
export function getTopExpensiveFunctions(profile: EnhancedProfile, limit: number = 10) {
  const analysis = analyzeProfile(profile);
  return analysis.slice(0, limit);
}

/**
 * Filters functions by source file
 */
export function getFunctionsBySource(profile: EnhancedProfile, sourcePattern: string) {
  const analysis = analyzeProfile(profile);
  return analysis.filter(func => 
    func.originalSource.includes(sourcePattern)
  );
}

/**
 * Formats profile analysis for console output
 */
export function formatProfileAnalysis(profile: EnhancedProfile) {
  const topFunctions = getTopExpensiveFunctions(profile, 10);
  
  console.log('\n📊 Profile Analysis - Top 10 Most Expensive Functions:');
  console.log('=' .repeat(80));
  
  topFunctions.forEach((func, index) => {
    console.log(`${index + 1}. ${func.originalFunctionName}`);
    console.log(`   Source: ${func.originalSource}:${func.originalLine}`);
    console.log(`   Samples: ${func.samples}, Hits: ${func.hitCount}`);
    console.log('');
  });
  
  return topFunctions;
}

/**
 * Generates comprehensive profile summary with Phase 1 metrics
 */
export function generateProfileSummary(profile: EnhancedProfile, totalLoadTime: number = 0) {
  // Safety check for profile data
  if (!profile || !profile.nodes || !Array.isArray(profile.nodes)) {
    return {
      totalExecutionTime: 0,
      totalFunctions: 0,
      totalCalls: 0,
      longestFunctionTime: 0,
      topFunctions: [],
      functionCallFrequency: {},
      thirdPartyImpact: {
        totalTime: 0,
        percentage: 0,
        scripts: []
      },
      executionEfficiency: {
        jsExecutionPercentage: 0,
        idleTimePercentage: 0,
        mainThreadBlockingTime: 0
      },
      memoryAnalysis: {
        totalMemoryAllocated: 0,
        peakMemoryUsage: 0,
        memoryLeaks: [],
        gcImpact: {
          totalGCTime: 0,
          gcFrequency: 0,
          gcEfficiency: 0,
          memoryPressure: 0
        },
        allocationPatterns: [],
        memoryEfficiency: {
          memoryUtilization: 0,
          fragmentationLevel: 0,
          allocationEfficiency: 0
        }
      },
      threadBlockingAnalysis: {
        totalBlockingTime: 0,
        blockingPercentage: 0,
        longestBlockingEvent: 0,
        blockingEvents: [],
        blockingPatterns: {
          continuousBlocking: 0,
          intermittentBlocking: 0,
          peakBlockingTime: 0,
          averageBlockingTime: 0
        },
        responsivenessImpact: {
          userInteractionDelay: 0,
          frameDrops: 0,
          responsivenessScore: 100
        }
      },
      cpuUsageAnalysis: {
        totalCpuTime: 0,
        averageCpuUsage: 0,
        peakCpuUsage: 0,
        cpuIntensiveFunctions: [],
        cpuUsagePatterns: {
          highCpuPeriods: 0,
          lowCpuPeriods: 0,
          cpuSpikes: 0,
          averageCpuPerPeriod: 0
        },
        cpuEfficiency: {
          cpuUtilizationScore: 100,
          cpuWastePercentage: 0,
          optimizationPotential: 0
        }
      }
    };
  }

  const analysis = analyzeProfile(profile);
  // Chrome DevTools profile timestamps are in microseconds, so convert to milliseconds
  const profileDurationMicroseconds = profile.endTime - profile.startTime;
  const profileDuration = profileDurationMicroseconds / 1000; // Convert to milliseconds
  
  // Calculate total execution time (excluding idle time)
  const totalExecutionTime = analysis.reduce((sum, func) => sum + func.totalTime, 0);
  
  // Get top 10 most expensive functions (already sorted by analyzeProfile)
  const topFunctions = analysis.slice(0, 10).map(func => ({
    name: func.originalFunctionName,
    time: func.totalTime,
    percentage: safePercentage(func.totalTime, totalExecutionTime),
    calls: func.hitCount,
    averageTime: func.averageTime,
    source: func.originalSource,
    line: func.originalLine
  }));

  // Calculate function call frequency
  const functionCallFrequency: Record<string, number> = {};
  analysis.forEach(func => {
    if (func.hitCount > 0) {
      functionCallFrequency[func.originalFunctionName] = func.hitCount;
    }
  });

  // Analyze third-party script impact
  const domainStats = new Map<string, {
    domain: string;
    time: number;
    functions: number;
  }>();

  analysis.forEach(func => {
    if (func.domain !== 'local' && func.domain !== 'unknown') {
      if (!domainStats.has(func.domain)) {
        domainStats.set(func.domain, {
          domain: func.domain,
          time: 0,
          functions: 0
        });
      }
      const stats = domainStats.get(func.domain)!;
      stats.time += func.totalTime;
      stats.functions += 1;
    }
  });

  const thirdPartyScripts = Array.from(domainStats.values())
    .map(script => ({
      domain: script.domain,
      time: script.time,
      percentage: safePercentage(script.time, totalExecutionTime),
      functions: script.functions
    }))
    .sort((a, b) => b.time - a.time);

  const thirdPartyTotalTime = thirdPartyScripts.reduce((sum, script) => sum + script.time, 0);

  // Calculate execution efficiency metrics
  const idleTime = analysis.find(func => func.originalFunctionName === '(idle)')?.totalTime || 0;
  const idleTimePercentage = safePercentage(idleTime, profileDuration);
  
  // JS execution time should exclude idle time to avoid double-counting
  const jsExecutionTime = totalExecutionTime - idleTime;
  const jsExecutionPercentage = safePercentage(jsExecutionTime, profileDuration);

  return {
    totalExecutionTime,
    totalFunctions: analysis.length,
    totalCalls: analysis.reduce((sum, func) => sum + func.hitCount, 0),
    longestFunctionTime: analysis.length > 0 ? analysis[0].totalTime : 0,
    topFunctions,
    functionCallFrequency,
    thirdPartyImpact: {
      totalTime: thirdPartyTotalTime,
      percentage: safePercentage(thirdPartyTotalTime, totalExecutionTime),
      scripts: thirdPartyScripts
    },
    executionEfficiency: {
      jsExecutionPercentage,
      idleTimePercentage,
      mainThreadBlockingTime: totalExecutionTime - idleTime
    },
    memoryAnalysis: analyzeMemoryUsage(profile, profileDuration),
    threadBlockingAnalysis: analyzeThreadBlocking(profile, profileDuration),
    cpuUsageAnalysis: analyzeCpuUsage(profile, profileDuration)
  };
}

/**
 * Exports profile data in a readable format
 */
export function exportProfileData(profile: EnhancedProfile, format: 'json' | 'csv' = 'json') {
  const analysis = analyzeProfile(profile);
  
  if (format === 'csv') {
    const headers = 'Function Name,Source File,Line,Samples,Hit Count,Total Time,Average Time,Domain';
    const rows = analysis.map(func => 
      `"${func.originalFunctionName}","${func.originalSource}",${func.originalLine},${func.samples},${func.hitCount},${func.totalTime.toFixed(2)},${func.averageTime.toFixed(2)},"${func.domain}"`
    );
    return [headers, ...rows].join('\n');
  }
  
  return JSON.stringify(analysis, null, 2);
}
