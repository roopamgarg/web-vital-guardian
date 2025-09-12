/**
 * Utility functions for analyzing enhanced profile data with source map information
 */

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
 * Analyzes profile data and returns function performance statistics
 */
export function analyzeProfile(profile: EnhancedProfile) {
  const functionStats = new Map<string, {
    originalFunctionName: string;
    originalSource: string;
    originalLine: number;
    totalTime: number;
    hitCount: number;
    samples: number;
  }>();

  // Analyze nodes
  profile.nodes.forEach((node, index) => {
    const callFrame = node.callFrame;
    const functionName = callFrame.originalFunctionName || callFrame.functionName;
    const source = callFrame.originalSource || callFrame.url;
    const line = callFrame.originalLine || 0;
    
    if (!functionStats.has(functionName)) {
      functionStats.set(functionName, {
        originalFunctionName: functionName,
        originalSource: source,
        originalLine: line,
        totalTime: 0,
        hitCount: 0,
        samples: 0
      });
    }
    
    const stats = functionStats.get(functionName)!;
    stats.hitCount += node.hitCount || 0;
  });

  // Analyze samples
  profile.samples.forEach(sample => {
    if (sample.stackId !== undefined && profile.nodes[sample.stackId]) {
      const node = profile.nodes[sample.stackId];
      const functionName = node.callFrame.originalFunctionName || node.callFrame.functionName;
      
      if (functionStats.has(functionName)) {
        functionStats.get(functionName)!.samples++;
      }
    }
  });

  return Array.from(functionStats.values())
    .sort((a, b) => b.samples - a.samples);
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
 * Exports profile data in a readable format
 */
export function exportProfileData(profile: EnhancedProfile, format: 'json' | 'csv' = 'json') {
  const analysis = analyzeProfile(profile);
  
  if (format === 'csv') {
    const headers = 'Function Name,Source File,Line,Samples,Hit Count';
    const rows = analysis.map(func => 
      `"${func.originalFunctionName}","${func.originalSource}",${func.originalLine},${func.samples},${func.hitCount}`
    );
    return [headers, ...rows].join('\n');
  }
  
  return JSON.stringify(analysis, null, 2);
}
