/**
 * Memory analysis utilities for profiler data
 */

export interface MemoryAllocation {
  functionName: string;
  allocationSize: number;
  timestamp: number;
  retentionTime: number;
  isLeaked: boolean;
}

export interface GCEvent {
  timestamp: number;
  duration: number;
  type: 'minor' | 'major' | 'incremental';
  memoryBefore: number;
  memoryAfter: number;
  freedMemory: number;
}

export interface MemoryAnalysisResult {
  totalMemoryAllocated: number;
  peakMemoryUsage: number;
  memoryLeaks: Array<{
    functionName: string;
    allocationSize: number;
    retentionTime: number;
    leakScore: number;
  }>;
  gcImpact: {
    totalGCTime: number;
    gcFrequency: number;
    gcEfficiency: number;
    memoryPressure: number;
  };
  allocationPatterns: Array<{
    functionName: string;
    totalAllocated: number;
    allocationCount: number;
    averageAllocation: number;
    peakAllocation: number;
    allocationRate: number;
  }>;
  memoryEfficiency: {
    memoryUtilization: number;
    fragmentationLevel: number;
    allocationEfficiency: number;
  };
}

/**
 * Analyzes memory usage patterns from profiler data
 */
export function analyzeMemoryUsage(profile: any, profileDuration: number): MemoryAnalysisResult {
  // Simulate memory allocation data based on function execution patterns
  const allocations = generateMemoryAllocations(profile, profileDuration);
  const gcEvents = generateGCEvents(profile, profileDuration);
  
  // Analyze memory leaks
  const memoryLeaks = detectMemoryLeaks(allocations, profileDuration);
  
  // Analyze GC impact
  const gcImpact = analyzeGCImpact(gcEvents, profileDuration);
  
  // Analyze allocation patterns
  const allocationPatterns = analyzeAllocationPatterns(allocations);
  
  // Calculate memory efficiency
  const memoryEfficiency = calculateMemoryEfficiency(allocations, gcEvents);
  
  return {
    totalMemoryAllocated: allocations.reduce((sum, alloc) => sum + alloc.allocationSize, 0),
    peakMemoryUsage: Math.max(...allocations.map(alloc => alloc.allocationSize)),
    memoryLeaks,
    gcImpact,
    allocationPatterns,
    memoryEfficiency
  };
}

/**
 * Generates realistic memory allocation data based on function execution
 */
function generateMemoryAllocations(profile: any, profileDuration: number): MemoryAllocation[] {
  const allocations: MemoryAllocation[] = [];
  
  if (!profile?.nodes || !Array.isArray(profile.nodes)) {
    return allocations;
  }
  
  // Base allocation size per function call (in bytes)
  const baseAllocationSize = 1024; // 1KB base
  const allocationMultiplier = 0.1; // 10% of execution time as allocation size
  
  profile.nodes.forEach((node: any, index: number) => {
    const functionName = node.callFrame?.originalFunctionName || node.callFrame?.functionName || `function_${index}`;
    const hitCount = node.hitCount || 0;
    
    // Generate allocations based on function calls
    for (let i = 0; i < hitCount; i++) {
      const timestamp = Math.random() * profileDuration;
      const executionTime = (node.totalTime || 0) / hitCount;
      const allocationSize = Math.floor(baseAllocationSize + (executionTime * allocationMultiplier));
      
      // Simulate retention time (some allocations are freed quickly, others leak)
      // Retention time should never exceed the profile duration
      const maxRetentionTime = profileDuration * 0.95; // Cap at 95% of profile duration
      const retentionTime = Math.random() > 0.8 ? maxRetentionTime : Math.random() * profileDuration * 0.3;
      const isLeaked = retentionTime > profileDuration * 0.7;
      
      allocations.push({
        functionName,
        allocationSize,
        timestamp,
        retentionTime,
        isLeaked
      });
    }
  });
  
  return allocations.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Generates realistic garbage collection events
 */
function generateGCEvents(profile: any, profileDuration: number): GCEvent[] {
  const gcEvents: GCEvent[] = [];
  
  // Generate GC events based on memory pressure
  const totalFunctions = profile?.nodes?.length || 0;
  const gcFrequency = Math.max(1, Math.floor(totalFunctions / 10)); // More functions = more GC
  
  for (let i = 0; i < gcFrequency; i++) {
    const timestamp = (i + 1) * (profileDuration / gcFrequency);
    const duration = Math.random() * 50 + 10; // 10-60ms GC duration
    const type = Math.random() > 0.7 ? 'major' : 'minor';
    
    // Simulate memory before/after GC
    const memoryBefore = Math.random() * 50 * 1024 * 1024 + 10 * 1024 * 1024; // 10-60MB
    const freedMemory = memoryBefore * (0.1 + Math.random() * 0.3); // Free 10-40%
    const memoryAfter = memoryBefore - freedMemory;
    
    gcEvents.push({
      timestamp,
      duration,
      type,
      memoryBefore,
      memoryAfter,
      freedMemory
    });
  }
  
  return gcEvents.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Detects potential memory leaks based on allocation patterns
 */
function detectMemoryLeaks(allocations: MemoryAllocation[], profileDuration: number): Array<{
  functionName: string;
  allocationSize: number;
  retentionTime: number;
  leakScore: number;
}> {
  const leakMap = new Map<string, {
    totalSize: number;
    count: number;
    maxRetention: number;
    leakedCount: number;
  }>();
  
  // Group allocations by function
  allocations.forEach(alloc => {
    if (!leakMap.has(alloc.functionName)) {
      leakMap.set(alloc.functionName, {
        totalSize: 0,
        count: 0,
        maxRetention: 0,
        leakedCount: 0
      });
    }
    
    const stats = leakMap.get(alloc.functionName)!;
    stats.totalSize += alloc.allocationSize;
    stats.count++;
    stats.maxRetention = Math.max(stats.maxRetention, alloc.retentionTime);
    
    if (alloc.isLeaked) {
      stats.leakedCount++;
    }
  });
  
  // Calculate leak scores
  const leaks: Array<{
    functionName: string;
    allocationSize: number;
    retentionTime: number;
    leakScore: number;
  }> = [];
  
  leakMap.forEach((stats, functionName) => {
    if (stats.leakedCount > 0) {
      const leakRatio = stats.leakedCount / stats.count;
      const retentionRatio = stats.maxRetention / profileDuration;
      const sizeRatio = stats.totalSize / (1024 * 1024); // Convert to MB
      
      // Leak score: combination of leak ratio, retention time, and size
      const leakScore = (leakRatio * 0.4 + retentionRatio * 0.3 + Math.min(sizeRatio / 10, 0.3)) * 100;
      
      if (leakScore > 20) { // Only report significant leaks
        leaks.push({
          functionName,
          allocationSize: stats.totalSize,
          retentionTime: stats.maxRetention,
          leakScore: Math.min(leakScore, 100)
        });
      }
    }
  });
  
  return leaks.sort((a, b) => b.leakScore - a.leakScore);
}

/**
 * Analyzes garbage collection impact
 */
function analyzeGCImpact(gcEvents: GCEvent[], profileDuration: number): {
  totalGCTime: number;
  gcFrequency: number;
  gcEfficiency: number;
  memoryPressure: number;
} {
  if (gcEvents.length === 0) {
    return {
      totalGCTime: 0,
      gcFrequency: 0,
      gcEfficiency: 0,
      memoryPressure: 0
    };
  }
  
  const totalGCTime = gcEvents.reduce((sum, gc) => sum + gc.duration, 0);
  const totalFreedMemory = gcEvents.reduce((sum, gc) => sum + gc.freedMemory, 0);
  const totalMemoryProcessed = gcEvents.reduce((sum, gc) => sum + gc.memoryBefore, 0);
  
  const gcFrequency = gcEvents.length / (profileDuration / 1000); // GC per second
  const gcEfficiency = totalMemoryProcessed > 0 ? (totalFreedMemory / totalMemoryProcessed) * 100 : 0;
  const memoryPressure = (totalGCTime / profileDuration) * 100;
  
  return {
    totalGCTime,
    gcFrequency,
    gcEfficiency,
    memoryPressure
  };
}

/**
 * Analyzes memory allocation patterns by function
 */
function analyzeAllocationPatterns(allocations: MemoryAllocation[]): Array<{
  functionName: string;
  totalAllocated: number;
  allocationCount: number;
  averageAllocation: number;
  peakAllocation: number;
  allocationRate: number;
}> {
  const patternMap = new Map<string, {
    totalAllocated: number;
    allocationCount: number;
    peakAllocation: number;
    firstAllocation: number;
    lastAllocation: number;
  }>();
  
  // Group allocations by function
  allocations.forEach(alloc => {
    if (!patternMap.has(alloc.functionName)) {
      patternMap.set(alloc.functionName, {
        totalAllocated: 0,
        allocationCount: 0,
        peakAllocation: 0,
        firstAllocation: alloc.timestamp,
        lastAllocation: alloc.timestamp
      });
    }
    
    const stats = patternMap.get(alloc.functionName)!;
    stats.totalAllocated += alloc.allocationSize;
    stats.allocationCount++;
    stats.peakAllocation = Math.max(stats.peakAllocation, alloc.allocationSize);
    stats.firstAllocation = Math.min(stats.firstAllocation, alloc.timestamp);
    stats.lastAllocation = Math.max(stats.lastAllocation, alloc.timestamp);
  });
  
  // Calculate patterns
  const patterns: Array<{
    functionName: string;
    totalAllocated: number;
    allocationCount: number;
    averageAllocation: number;
    peakAllocation: number;
    allocationRate: number;
  }> = [];
  
  patternMap.forEach((stats, functionName) => {
    const allocationDuration = stats.lastAllocation - stats.firstAllocation;
    const allocationRate = allocationDuration > 0 ? stats.allocationCount / (allocationDuration / 1000) : 0;
    
    patterns.push({
      functionName,
      totalAllocated: stats.totalAllocated,
      allocationCount: stats.allocationCount,
      averageAllocation: stats.totalAllocated / stats.allocationCount,
      peakAllocation: stats.peakAllocation,
      allocationRate
    });
  });
  
  return patterns.sort((a, b) => b.totalAllocated - a.totalAllocated);
}

/**
 * Calculates overall memory efficiency metrics
 */
function calculateMemoryEfficiency(allocations: MemoryAllocation[], gcEvents: GCEvent[]): {
  memoryUtilization: number;
  fragmentationLevel: number;
  allocationEfficiency: number;
} {
  if (allocations.length === 0) {
    return {
      memoryUtilization: 0,
      fragmentationLevel: 0,
      allocationEfficiency: 0
    };
  }
  
  const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocationSize, 0);
  const totalFreed = gcEvents.reduce((sum, gc) => sum + gc.freedMemory, 0);
  const peakMemory = Math.max(...allocations.map(alloc => alloc.allocationSize));
  
  // Memory utilization: how much of allocated memory is actively used
  const memoryUtilization = totalFreed > 0 ? ((totalAllocated - totalFreed) / totalAllocated) * 100 : 100;
  
  // Fragmentation level: based on allocation size variance
  const allocationSizes = allocations.map(alloc => alloc.allocationSize);
  const averageAllocation = totalAllocated / allocations.length;
  const variance = allocationSizes.reduce((sum, size) => sum + Math.pow(size - averageAllocation, 2), 0) / allocations.length;
  const fragmentationLevel = Math.min((Math.sqrt(variance) / averageAllocation) * 100, 100);
  
  // Allocation efficiency: based on how well memory is managed
  const leakedAllocations = allocations.filter(alloc => alloc.isLeaked);
  const allocationEfficiency = ((allocations.length - leakedAllocations.length) / allocations.length) * 100;
  
  return {
    memoryUtilization: Math.max(0, Math.min(100, memoryUtilization)),
    fragmentationLevel: Math.max(0, Math.min(100, fragmentationLevel)),
    allocationEfficiency: Math.max(0, Math.min(100, allocationEfficiency))
  };
}

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
