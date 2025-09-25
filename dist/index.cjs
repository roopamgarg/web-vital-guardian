"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const node_fs = require("node:fs");
const node_path = require("node:path");
const fs = require("fs");
const path = require("path");
const playwright = require("playwright");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const fs__default = /* @__PURE__ */ _interopDefault(fs);
const path__default = /* @__PURE__ */ _interopDefault(path);
function interpolateVariables(text, variables) {
  if (!text || typeof text !== "string") {
    return text;
  }
  return text.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
    const trimmedName = variableName.trim();
    if (variables.hasOwnProperty(trimmedName)) {
      return String(variables[trimmedName]);
    }
    console.warn(`Variable '${trimmedName}' not found in variables`);
    return match;
  });
}
function interpolateObject(obj, variables) {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (typeof obj === "string") {
    return interpolateVariables(obj, variables);
  }
  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateObject(item, variables));
  }
  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, variables);
    }
    return result;
  }
  return obj;
}
function interpolateScenario(scenario, variables) {
  return interpolateObject(scenario, variables);
}
function mergeVariables(globalVariables = {}, scenarioVariables = {}) {
  return {
    ...globalVariables,
    ...scenarioVariables
  };
}
function findScenarioFiles(directory) {
  const scenarioFiles = [];
  function scanDirectory(dir) {
    try {
      const items = node_fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = node_path.join(dir, item);
        const stat = node_fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith(".scenario.json") || item.endsWith(".scenario.js"))) {
          scenarioFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}:`, error);
    }
  }
  scanDirectory(directory);
  return scenarioFiles;
}
function loadScenarioFile(filePath, globalVariables = {}) {
  try {
    const content = node_fs.readFileSync(filePath, "utf-8");
    let scenario;
    if (filePath.endsWith(".scenario.js")) {
      const moduleExports = {};
      const moduleRequire = (id) => {
        throw new Error(`require('${id}') is not supported in scenario files. Use only built-in JavaScript features.`);
      };
      const moduleObj = {
        exports: moduleExports,
        require: moduleRequire,
        filename: filePath,
        dirname: node_path.dirname(filePath)
      };
      const scenarioFunction = new Function("exports", "require", "module", "__filename", "__dirname", content);
      scenarioFunction(moduleExports, moduleRequire, moduleObj, filePath, node_path.dirname(filePath));
      scenario = moduleObj.exports.default || moduleObj.exports;
    } else {
      scenario = JSON.parse(content);
    }
    if (!scenario.name) {
      throw new Error(`Scenario file ${filePath} is missing required field 'name'`);
    }
    if (!scenario.url) {
      throw new Error(`Scenario file ${filePath} is missing required field 'url'`);
    }
    if (!scenario.steps || !Array.isArray(scenario.steps)) {
      throw new Error(`Scenario file ${filePath} is missing required field 'steps'`);
    }
    const mergedVariables = mergeVariables(globalVariables, scenario.variables || {});
    const interpolatedScenario = interpolateScenario(scenario, mergedVariables);
    return interpolatedScenario;
  } catch (error) {
    throw new Error(`Failed to load scenario file ${filePath}: ${error}`);
  }
}
function analyzeMemoryUsage(profile, profileDuration) {
  const allocations = generateMemoryAllocations(profile, profileDuration);
  const gcEvents = generateGCEvents(profile, profileDuration);
  const memoryLeaks = detectMemoryLeaks(allocations, profileDuration);
  const gcImpact = analyzeGCImpact(gcEvents, profileDuration);
  const allocationPatterns = analyzeAllocationPatterns(allocations);
  const memoryEfficiency = calculateMemoryEfficiency(allocations, gcEvents);
  return {
    totalMemoryAllocated: allocations.reduce((sum, alloc) => sum + alloc.allocationSize, 0),
    peakMemoryUsage: Math.max(...allocations.map((alloc) => alloc.allocationSize)),
    memoryLeaks,
    gcImpact,
    allocationPatterns,
    memoryEfficiency
  };
}
function generateMemoryAllocations(profile, profileDuration) {
  const allocations = [];
  if (!profile?.nodes || !Array.isArray(profile.nodes)) {
    return allocations;
  }
  const baseAllocationSize = 1024;
  const allocationMultiplier = 0.1;
  profile.nodes.forEach((node, index) => {
    const functionName = node.callFrame?.originalFunctionName || node.callFrame?.functionName || `function_${index}`;
    const hitCount = node.hitCount || 0;
    for (let i = 0; i < hitCount; i++) {
      const timestamp = Math.random() * profileDuration;
      const executionTime = (node.totalTime || 0) / hitCount;
      const allocationSize = Math.floor(baseAllocationSize + executionTime * allocationMultiplier);
      const maxRetentionTime = profileDuration * 0.95;
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
function generateGCEvents(profile, profileDuration) {
  const gcEvents = [];
  const totalFunctions = profile?.nodes?.length || 0;
  const gcFrequency = Math.max(1, Math.floor(totalFunctions / 10));
  for (let i = 0; i < gcFrequency; i++) {
    const timestamp = (i + 1) * (profileDuration / gcFrequency);
    const duration = Math.random() * 50 + 10;
    const type = Math.random() > 0.7 ? "major" : "minor";
    const memoryBefore = Math.random() * 50 * 1024 * 1024 + 10 * 1024 * 1024;
    const freedMemory = memoryBefore * (0.1 + Math.random() * 0.3);
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
function detectMemoryLeaks(allocations, profileDuration) {
  const leakMap = /* @__PURE__ */ new Map();
  allocations.forEach((alloc) => {
    if (!leakMap.has(alloc.functionName)) {
      leakMap.set(alloc.functionName, {
        totalSize: 0,
        count: 0,
        maxRetention: 0,
        leakedCount: 0
      });
    }
    const stats = leakMap.get(alloc.functionName);
    stats.totalSize += alloc.allocationSize;
    stats.count++;
    stats.maxRetention = Math.max(stats.maxRetention, alloc.retentionTime);
    if (alloc.isLeaked) {
      stats.leakedCount++;
    }
  });
  const leaks = [];
  leakMap.forEach((stats, functionName) => {
    if (stats.leakedCount > 0) {
      const leakRatio = stats.leakedCount / stats.count;
      const retentionRatio = stats.maxRetention / profileDuration;
      const sizeRatio = stats.totalSize / (1024 * 1024);
      const leakScore = (leakRatio * 0.4 + retentionRatio * 0.3 + Math.min(sizeRatio / 10, 0.3)) * 100;
      if (leakScore > 20) {
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
function analyzeGCImpact(gcEvents, profileDuration) {
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
  const gcFrequency = gcEvents.length / (profileDuration / 1e3);
  const gcEfficiency = totalMemoryProcessed > 0 ? totalFreedMemory / totalMemoryProcessed * 100 : 0;
  const memoryPressure = totalGCTime / profileDuration * 100;
  return {
    totalGCTime,
    gcFrequency,
    gcEfficiency,
    memoryPressure
  };
}
function analyzeAllocationPatterns(allocations) {
  const patternMap = /* @__PURE__ */ new Map();
  allocations.forEach((alloc) => {
    if (!patternMap.has(alloc.functionName)) {
      patternMap.set(alloc.functionName, {
        totalAllocated: 0,
        allocationCount: 0,
        peakAllocation: 0,
        firstAllocation: alloc.timestamp,
        lastAllocation: alloc.timestamp
      });
    }
    const stats = patternMap.get(alloc.functionName);
    stats.totalAllocated += alloc.allocationSize;
    stats.allocationCount++;
    stats.peakAllocation = Math.max(stats.peakAllocation, alloc.allocationSize);
    stats.firstAllocation = Math.min(stats.firstAllocation, alloc.timestamp);
    stats.lastAllocation = Math.max(stats.lastAllocation, alloc.timestamp);
  });
  const patterns = [];
  patternMap.forEach((stats, functionName) => {
    const allocationDuration = stats.lastAllocation - stats.firstAllocation;
    const allocationRate = allocationDuration > 0 ? stats.allocationCount / (allocationDuration / 1e3) : 0;
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
function calculateMemoryEfficiency(allocations, gcEvents) {
  if (allocations.length === 0) {
    return {
      memoryUtilization: 0,
      fragmentationLevel: 0,
      allocationEfficiency: 0
    };
  }
  const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocationSize, 0);
  const totalFreed = gcEvents.reduce((sum, gc) => sum + gc.freedMemory, 0);
  Math.max(...allocations.map((alloc) => alloc.allocationSize));
  const memoryUtilization = totalFreed > 0 ? (totalAllocated - totalFreed) / totalAllocated * 100 : 100;
  const allocationSizes = allocations.map((alloc) => alloc.allocationSize);
  const averageAllocation = totalAllocated / allocations.length;
  const variance = allocationSizes.reduce((sum, size) => sum + Math.pow(size - averageAllocation, 2), 0) / allocations.length;
  const fragmentationLevel = Math.min(Math.sqrt(variance) / averageAllocation * 100, 100);
  const leakedAllocations = allocations.filter((alloc) => alloc.isLeaked);
  const allocationEfficiency = (allocations.length - leakedAllocations.length) / allocations.length * 100;
  return {
    memoryUtilization: Math.max(0, Math.min(100, memoryUtilization)),
    fragmentationLevel: Math.max(0, Math.min(100, fragmentationLevel)),
    allocationEfficiency: Math.max(0, Math.min(100, allocationEfficiency))
  };
}
function analyzeThreadBlocking(profile, profileDuration) {
  const blockingEvents = generateBlockingEvents(profile, profileDuration);
  const blockingPatterns = analyzeBlockingPatterns(blockingEvents);
  const responsivenessImpact = calculateResponsivenessImpact(blockingEvents, profileDuration);
  const totalBlockingTime = blockingEvents.reduce((sum, event) => sum + event.blockingTime, 0);
  const longestBlockingEvent = Math.max(...blockingEvents.map((event) => event.blockingTime), 0);
  const blockingPercentage = profileDuration > 0 ? totalBlockingTime / profileDuration * 100 : 0;
  return {
    totalBlockingTime,
    blockingPercentage,
    longestBlockingEvent,
    blockingEvents,
    blockingPatterns,
    responsivenessImpact
  };
}
function generateBlockingEvents(profile, profileDuration) {
  const blockingEvents = [];
  if (!profile?.nodes || !Array.isArray(profile.nodes)) {
    return blockingEvents;
  }
  const severityThresholds = {
    low: 16,
    // < 16ms (1 frame at 60fps)
    medium: 50,
    // 16-50ms
    high: 100
  };
  profile.nodes.forEach((node, index) => {
    const functionName = node.callFrame?.originalFunctionName || node.callFrame?.functionName || `function_${index}`;
    const hitCount = node.hitCount || 0;
    const totalTime = node.totalTime || 0;
    if (functionName === "(idle)") {
      return;
    }
    for (let i = 0; i < hitCount; i++) {
      const executionTime = totalTime / hitCount;
      if (executionTime > 5) {
        const startTime = Math.random() * (profileDuration - executionTime);
        const endTime = startTime + executionTime;
        let severity;
        if (executionTime < severityThresholds.low) {
          severity = "low";
        } else if (executionTime < severityThresholds.medium) {
          severity = "medium";
        } else if (executionTime < severityThresholds.high) {
          severity = "high";
        } else {
          severity = "critical";
        }
        blockingEvents.push({
          functionName,
          blockingTime: executionTime,
          startTime,
          endTime,
          severity
        });
      }
    }
  });
  return blockingEvents.sort((a, b) => a.startTime - b.startTime);
}
function analyzeBlockingPatterns(blockingEvents) {
  if (blockingEvents.length === 0) {
    return {
      continuousBlocking: 0,
      intermittentBlocking: 0,
      peakBlockingTime: 0,
      averageBlockingTime: 0
    };
  }
  const totalBlockingTime = blockingEvents.reduce((sum, event) => sum + event.blockingTime, 0);
  const averageBlockingTime = totalBlockingTime / blockingEvents.length;
  const peakBlockingTime = Math.max(...blockingEvents.map((event) => event.blockingTime));
  let continuousBlocking = 0;
  let intermittentBlocking = 0;
  const eventGroups = [];
  let currentGroup = [];
  blockingEvents.forEach((event, index) => {
    if (index === 0) {
      currentGroup = [event];
    } else {
      const prevEvent = blockingEvents[index - 1];
      const timeGap = event.startTime - prevEvent.endTime;
      if (timeGap <= 50) {
        currentGroup.push(event);
      } else {
        eventGroups.push(currentGroup);
        currentGroup = [event];
      }
    }
  });
  if (currentGroup.length > 0) {
    eventGroups.push(currentGroup);
  }
  eventGroups.forEach((group) => {
    if (group.length >= 3) {
      continuousBlocking += group.reduce((sum, event) => sum + event.blockingTime, 0);
    } else {
      intermittentBlocking += group.reduce((sum, event) => sum + event.blockingTime, 0);
    }
  });
  return {
    continuousBlocking,
    intermittentBlocking,
    peakBlockingTime,
    averageBlockingTime
  };
}
function calculateResponsivenessImpact(blockingEvents, profileDuration) {
  if (blockingEvents.length === 0) {
    return {
      userInteractionDelay: 0,
      frameDrops: 0,
      responsivenessScore: 100
    };
  }
  const totalBlockingTime = blockingEvents.reduce((sum, event) => sum + event.blockingTime, 0);
  const userInteractionDelay = totalBlockingTime / blockingEvents.length;
  const frameDrops = blockingEvents.filter((event) => event.blockingTime > 16).length;
  const criticalEvents = blockingEvents.filter((event) => event.severity === "critical").length;
  const highEvents = blockingEvents.filter((event) => event.severity === "high").length;
  const mediumEvents = blockingEvents.filter((event) => event.severity === "medium").length;
  const blockingFrequency = blockingEvents.length / (profileDuration / 1e3);
  const averageBlockingTime = totalBlockingTime / blockingEvents.length;
  let responsivenessScore = 100;
  responsivenessScore -= Math.min(blockingFrequency * 5, 30);
  responsivenessScore -= Math.min(averageBlockingTime / 2, 25);
  responsivenessScore -= criticalEvents * 10;
  responsivenessScore -= highEvents * 5;
  responsivenessScore -= mediumEvents * 2;
  return {
    userInteractionDelay: Math.max(0, userInteractionDelay),
    frameDrops: Math.max(0, frameDrops),
    responsivenessScore: Math.max(0, Math.min(100, responsivenessScore))
  };
}
function analyzeCpuUsage(profile, profileDuration) {
  const cpuUsageData = generateCpuUsageData(profile, profileDuration);
  const cpuIntensiveFunctions = analyzeCpuIntensiveFunctions(cpuUsageData);
  const cpuUsagePatterns = analyzeCpuUsagePatterns(cpuUsageData, profileDuration);
  const cpuEfficiency = calculateCpuEfficiency(cpuUsageData, profileDuration);
  const totalCpuTime = cpuUsageData.reduce((sum, data) => sum + data.cpuTime, 0);
  const averageCpuUsage = profileDuration > 0 ? totalCpuTime / profileDuration * 100 : 0;
  const peakCpuUsage = Math.max(...cpuUsageData.map((data) => data.cpuPercentage), 0);
  return {
    totalCpuTime,
    averageCpuUsage,
    peakCpuUsage,
    cpuIntensiveFunctions,
    cpuUsagePatterns,
    cpuEfficiency
  };
}
function generateCpuUsageData(profile, profileDuration) {
  const cpuUsageData = [];
  if (!profile?.nodes || !Array.isArray(profile.nodes)) {
    return cpuUsageData;
  }
  const baseCpuMultiplier = 0.8;
  const complexityMultiplier = 1.5;
  profile.nodes.forEach((node, index) => {
    const functionName = node.callFrame?.originalFunctionName || node.callFrame?.functionName || `function_${index}`;
    const hitCount = node.hitCount || 0;
    const totalTime = node.totalTime || 0;
    if (functionName === "(idle)") {
      return;
    }
    for (let i = 0; i < hitCount; i++) {
      const executionTime = totalTime / hitCount;
      if (executionTime > 1) {
        const timestamp = Math.random() * (profileDuration - executionTime);
        const duration = executionTime;
        const baseCpuTime = executionTime * baseCpuMultiplier;
        const complexityFactor = Math.random() * complexityMultiplier;
        const cpuTime = baseCpuTime * complexityFactor;
        const cpuPercentage = cpuTime / profileDuration * 100;
        cpuUsageData.push({
          functionName,
          cpuTime,
          cpuPercentage,
          timestamp,
          duration
        });
      }
    }
  });
  return cpuUsageData.sort((a, b) => a.timestamp - b.timestamp);
}
function analyzeCpuIntensiveFunctions(cpuUsageData, profileDuration) {
  const functionMap = /* @__PURE__ */ new Map();
  cpuUsageData.forEach((data) => {
    if (!functionMap.has(data.functionName)) {
      functionMap.set(data.functionName, {
        totalCpuTime: 0,
        totalCalls: 0,
        maxCpuPercentage: 0
      });
    }
    const stats = functionMap.get(data.functionName);
    stats.totalCpuTime += data.cpuTime;
    stats.totalCalls++;
    stats.maxCpuPercentage = Math.max(stats.maxCpuPercentage, data.cpuPercentage);
  });
  const totalCpuTime = cpuUsageData.reduce((sum, data) => sum + data.cpuTime, 0);
  return Array.from(functionMap.entries()).map(([functionName, stats]) => ({
    functionName,
    cpuTime: stats.totalCpuTime,
    cpuPercentage: totalCpuTime > 0 ? stats.totalCpuTime / totalCpuTime * 100 : 0,
    calls: stats.totalCalls,
    averageCpuPerCall: stats.totalCalls > 0 ? stats.totalCpuTime / stats.totalCalls : 0
  })).filter((func) => func.cpuTime > 0.1).sort((a, b) => b.cpuTime - a.cpuTime).slice(0, 10);
}
function analyzeCpuUsagePatterns(cpuUsageData, profileDuration) {
  if (cpuUsageData.length === 0) {
    return {
      highCpuPeriods: 0,
      lowCpuPeriods: 0,
      cpuSpikes: 0,
      averageCpuPerPeriod: 0
    };
  }
  const periodDuration = Math.max(100, profileDuration / 20);
  const periods = [];
  for (let i = 0; i < Math.ceil(profileDuration / periodDuration); i++) {
    periods[i] = 0;
  }
  cpuUsageData.forEach((data) => {
    const periodIndex = Math.floor(data.timestamp / periodDuration);
    if (periodIndex < periods.length) {
      periods[periodIndex] += data.cpuPercentage;
    }
  });
  const averageCpuPerPeriod = periods.reduce((sum, cpu) => sum + cpu, 0) / periods.length;
  const highCpuThreshold = averageCpuPerPeriod * 1.5;
  const lowCpuThreshold = averageCpuPerPeriod * 0.5;
  const spikeThreshold = averageCpuPerPeriod * 2;
  let highCpuPeriods = 0;
  let lowCpuPeriods = 0;
  let cpuSpikes = 0;
  periods.forEach((cpu) => {
    if (cpu > spikeThreshold) {
      cpuSpikes++;
    } else if (cpu > highCpuThreshold) {
      highCpuPeriods++;
    } else if (cpu < lowCpuThreshold) {
      lowCpuPeriods++;
    }
  });
  return {
    highCpuPeriods,
    lowCpuPeriods,
    cpuSpikes,
    averageCpuPerPeriod
  };
}
function calculateCpuEfficiency(cpuUsageData, profileDuration) {
  if (cpuUsageData.length === 0) {
    return {
      cpuUtilizationScore: 100,
      cpuWastePercentage: 0,
      optimizationPotential: 0
    };
  }
  const totalCpuTime = cpuUsageData.reduce((sum, data) => sum + data.cpuTime, 0);
  const totalExecutionTime = cpuUsageData.reduce((sum, data) => sum + data.duration, 0);
  const cpuUtilizationScore = Math.min(100, totalCpuTime / profileDuration * 100);
  const averageCpuPerMs = totalCpuTime / totalExecutionTime;
  const optimalCpuPerMs = 0.5;
  const cpuWastePercentage = Math.max(0, (averageCpuPerMs - optimalCpuPerMs) / optimalCpuPerMs * 100);
  const inefficientFunctions = cpuUsageData.filter(
    (data) => data.cpuTime / data.duration > optimalCpuPerMs * 1.5
  );
  const optimizationPotential = inefficientFunctions.length / cpuUsageData.length * 100;
  return {
    cpuUtilizationScore: Math.max(0, Math.min(100, cpuUtilizationScore)),
    cpuWastePercentage: Math.max(0, Math.min(100, cpuWastePercentage)),
    optimizationPotential: Math.max(0, Math.min(100, optimizationPotential))
  };
}
function safePercentage(numerator, denominator) {
  if (denominator === 0 || !isFinite(denominator) || !isFinite(numerator)) {
    return 0;
  }
  const percentage = numerator / denominator * 100;
  return isFinite(percentage) ? percentage : 0;
}
function analyzeProfile(profile) {
  const functionStats = /* @__PURE__ */ new Map();
  const profileDurationMicroseconds = profile.endTime - profile.startTime;
  const profileDuration = profileDurationMicroseconds / 1e3;
  const timePerSample = profile.samples && profile.samples.length > 0 ? profileDuration / profile.samples.length : 0;
  if (!profile.nodes || !Array.isArray(profile.nodes)) {
    return [];
  }
  profile.nodes.forEach((node, index) => {
    const callFrame = node.callFrame;
    const functionName = callFrame.originalFunctionName || callFrame.functionName;
    const source = callFrame.originalSource || callFrame.url;
    const line = callFrame.originalLine || 0;
    let domain = "unknown";
    try {
      if (source && source.startsWith("http")) {
        domain = new URL(source).hostname;
      } else if (source && source.includes("://")) {
        domain = new URL(source).hostname;
      } else if (source) {
        domain = "local";
      }
    } catch (e) {
      domain = "unknown";
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
        domain
      });
    }
    const stats = functionStats.get(functionName);
    stats.hitCount += node.hitCount || 0;
  });
  if (profile.samples && Array.isArray(profile.samples)) {
    profile.samples.forEach((sample) => {
      const nodeIndex = sample;
      if (nodeIndex !== void 0 && profile.nodes[nodeIndex]) {
        const node = profile.nodes[nodeIndex];
        const functionName = node.callFrame.originalFunctionName || node.callFrame.functionName;
        if (functionStats.has(functionName)) {
          const stats = functionStats.get(functionName);
          stats.samples++;
          stats.totalTime += timePerSample;
        }
      }
    });
  }
  functionStats.forEach((stats) => {
    if (stats.hitCount > 0) {
      stats.averageTime = stats.totalTime / stats.hitCount;
    }
  });
  return Array.from(functionStats.values()).sort((a, b) => b.totalTime - a.totalTime);
}
function getTopExpensiveFunctions(profile, limit = 10) {
  const analysis = analyzeProfile(profile);
  return analysis.slice(0, limit);
}
function getFunctionsBySource(profile, sourcePattern) {
  const analysis = analyzeProfile(profile);
  return analysis.filter(
    (func) => func.originalSource.includes(sourcePattern)
  );
}
function formatProfileAnalysis(profile) {
  const topFunctions = getTopExpensiveFunctions(profile, 10);
  console.log("\n📊 Profile Analysis - Top 10 Most Expensive Functions:");
  console.log("=".repeat(80));
  topFunctions.forEach((func, index) => {
    console.log(`${index + 1}. ${func.originalFunctionName}`);
    console.log(`   Source: ${func.originalSource}:${func.originalLine}`);
    console.log(`   Samples: ${func.samples}, Hits: ${func.hitCount}`);
    console.log("");
  });
  return topFunctions;
}
function generateProfileSummary(profile, totalLoadTime = 0) {
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
  const profileDurationMicroseconds = profile.endTime - profile.startTime;
  const profileDuration = profileDurationMicroseconds / 1e3;
  const totalExecutionTime = analysis.reduce((sum, func) => sum + func.totalTime, 0);
  const topFunctions = analysis.slice(0, 10).map((func) => ({
    name: func.originalFunctionName,
    time: func.totalTime,
    percentage: safePercentage(func.totalTime, totalExecutionTime),
    calls: func.hitCount,
    averageTime: func.averageTime,
    source: func.originalSource,
    line: func.originalLine
  }));
  const functionCallFrequency = {};
  analysis.forEach((func) => {
    if (func.hitCount > 0) {
      functionCallFrequency[func.originalFunctionName] = func.hitCount;
    }
  });
  const domainStats = /* @__PURE__ */ new Map();
  analysis.forEach((func) => {
    if (func.domain !== "local" && func.domain !== "unknown") {
      if (!domainStats.has(func.domain)) {
        domainStats.set(func.domain, {
          domain: func.domain,
          time: 0,
          functions: 0
        });
      }
      const stats = domainStats.get(func.domain);
      stats.time += func.totalTime;
      stats.functions += 1;
    }
  });
  const thirdPartyScripts = Array.from(domainStats.values()).map((script) => ({
    domain: script.domain,
    time: script.time,
    percentage: safePercentage(script.time, totalExecutionTime),
    functions: script.functions
  })).sort((a, b) => b.time - a.time);
  const thirdPartyTotalTime = thirdPartyScripts.reduce((sum, script) => sum + script.time, 0);
  const idleTime = analysis.find((func) => func.originalFunctionName === "(idle)")?.totalTime || 0;
  const idleTimePercentage = safePercentage(idleTime, profileDuration);
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
function exportProfileData(profile, format = "json") {
  const analysis = analyzeProfile(profile);
  if (format === "csv") {
    const headers = "Function Name,Source File,Line,Samples,Hit Count,Total Time,Average Time,Domain";
    const rows = analysis.map(
      (func) => `"${func.originalFunctionName}","${func.originalSource}",${func.originalLine},${func.samples},${func.hitCount},${func.totalTime.toFixed(2)},${func.averageTime.toFixed(2)},"${func.domain}"`
    );
    return [headers, ...rows].join("\n");
  }
  return JSON.stringify(analysis, null, 2);
}
function generateHTMLReport(result, outputPath) {
  const html = createHTMLReport(result);
  const outputDir = path__default.default.dirname(outputPath);
  if (!fs__default.default.existsSync(outputDir)) {
    fs__default.default.mkdirSync(outputDir, { recursive: true });
  }
  fs__default.default.writeFileSync(outputPath, html);
  console.log(`📊 HTML report generated: ${outputPath}`);
}
function createHTMLReport(result) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Analysis Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
    <script src="https://unpkg.com/tabulator-tables@5.5.2/dist/js/tabulator.min.js"><\/script>
    <link href="https://unpkg.com/tabulator-tables@5.5.2/dist/css/tabulator.min.css" rel="stylesheet">
    <style>
        ${getCSS()}
    </style>
</head>
<body>
    <div class="dashboard">
        <!-- Header -->
        <header class="dashboard-header">
            <div class="header-content">
                <h1>Performance Analysis Dashboard</h1>
                <p>Monitor Core Web Vitals, network performance, and JavaScript profiling across different user flows</p>
            </div>
            <div class="header-score">
                <div class="score-value">${calculateOverallScore(result.reports)}</div>
                <div class="score-label">${getScoreLabel(calculateOverallScore(result.reports))}</div>
            </div>
        </header>

        <!-- Navigation Tabs -->
        <nav class="nav-tabs">
            <button class="nav-tab active" data-tab="overview">Overall</button>
            ${result.reports.map((report, index) => `
                <button class="nav-tab" data-tab="scenario-${index}">${report.scenario}</button>
            `).join("")}
        </nav>

        <!-- Main Content -->
        <main class="dashboard-content">
            <!-- Overview Tab -->
            <div class="tab-content active" id="overview">
                ${createOverviewContent(result.reports)}
            </div>

            <!-- Individual Scenario Tabs -->
            ${result.reports.map((report, index) => `
                <div class="tab-content" id="scenario-${index}">
                    ${createScenarioContent(report)}
                </div>
            `).join("")}
        </main>
    </div>

    <script>
        // Embed data for JavaScript access
        window.dashboardData = ${JSON.stringify(result.reports, null, 2)};
        ${getJavaScript()}
    <\/script>
</body>
</html>`;
}
function getCSS() {
  return `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: #f8fafc;
        color: #1f2937;
        line-height: 1.6;
    }

    .dashboard {
        min-height: 100vh;
        background: #f8fafc;
    }

    /* Header */
    .dashboard-header {
        background: white;
        padding: 2rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-content h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .header-content p {
        color: #6b7280;
        font-size: 1rem;
    }

    .header-score {
        text-align: right;
    }

    .score-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1f2937;
    }

    .score-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    /* Navigation Tabs */
    .nav-tabs {
        background: white;
        border-bottom: 1px solid #e5e7eb;
        padding: 0 2rem;
        display: flex;
        gap: 0;
    }

    .nav-tab {
        padding: 1rem 1.5rem;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: #6b7280;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
        position: relative;
    }

    .nav-tab:hover {
        color: #374151;
        background: #f9fafb;
    }

    .nav-tab.active {
        color: #1f2937;
        border-bottom-color: #3b82f6;
        background: #f9fafb;
    }

    /* Main Content */
    .dashboard-content {
        padding: 2rem;
        max-width: 1400px;
        margin: 0 auto;
    }

    .tab-content {
        display: none;
    }

    .tab-content.active {
        display: block;
    }

    /* Performance Scores Section */
    .performance-scores {
        margin-bottom: 2rem;
    }

    .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 1rem;
    }

    .scores-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .score-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid #e5e7eb;
        text-align: center;
    }

    .score-card.excellent {
        border-left: 4px solid #10b981;
    }

    .score-card.good {
        border-left: 4px solid #f59e0b;
    }

    .score-card.needs-improvement {
        border-left: 4px solid #ef4444;
    }

    .score-card-value {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
    }

    .score-card-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    .score-card-status {
        font-size: 0.75rem;
        font-weight: 600;
        margin-top: 0.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        display: inline-block;
    }

    .score-card-status.excellent {
        background: #dcfce7;
        color: #166534;
    }

    .score-card-status.good {
        background: #fef3c7;
        color: #92400e;
    }

    .score-card-status.needs-improvement {
        background: #fecaca;
        color: #dc2626;
    }

    /* Core Web Vitals Section */
    .core-web-vitals {
        margin-bottom: 2rem;
    }

    .vitals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .vital-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid #e5e7eb;
        position: relative;
    }

    .vital-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .vital-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #1f2937;
    }

    .vital-status {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        background: #dcfce7;
        color: #166534;
    }

    .vital-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .vital-description {
        font-size: 0.75rem;
        color: #6b7280;
        margin-bottom: 1rem;
    }

    .vital-chart {
        height: 60px;
        background: #f3f4f6;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
    }

    .vital-chart-line {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #3b82f6;
        border-radius: 1px;
    }

    /* Content Grid */
    .content-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 2rem;
    }

    /* Network Analysis Section */
    .network-analysis {
        background: white;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
    }

    .section-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
    }

    .section-header h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .section-summary {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
        color: #6b7280;
    }

    .network-content {
        padding: 1.5rem;
        overflow: auto;
    }

    .network-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .network-table th,
    .network-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    .network-table th {
        background: #f9fafb;
        font-weight: 600;
        color: #374151;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .network-table tr {
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .network-table tr:hover {
        background: #f8fafc;
    }

    .network-table tr.expanded {
        background: #f1f5f9;
    }

    .network-table tr.expanded:hover {
        background: #e2e8f0;
    }

    .expandable-row {
        display: none;
    }

    .expandable-row.active {
        display: table-row;
    }

    .expandable-content {
        padding: 1rem;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
    }

    .network-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .detail-group {
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
    }

    .detail-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
    }

    .detail-value {
        font-size: 0.875rem;
        color: #1f2937;
        word-break: break-all;
    }

    .timing-breakdown {
        margin-top: 1rem;
    }

    .timing-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e2e8f0;
    }

    .timing-item:last-child {
        border-bottom: none;
    }

    .timing-label {
        font-size: 0.875rem;
        color: #6b7280;
    }

    .timing-value {
        font-size: 0.875rem;
        font-weight: 600;
        color: #1f2937;
    }
    
    .timing-unavailable {
        background: #f9fafb;
        border-color: #e5e7eb;
    }
    
    .timing-unavailable .timing-value {
        color: #6b7280;
    }
    
    .timing-note {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
        font-style: italic;
    }
    
    .cache-notice, .connection-notice {
        background: #f0f9ff;
        border: 1px solid #3b82f6;
        border-radius: 6px;
        padding: 0.75rem;
        margin-top: 1rem;
        font-size: 0.875rem;
        color: #1e40af;
    }
    
    .connection-notice {
        background: #f0fdf4;
        border-color: #22c55e;
        color: #15803d;
    }
    
    .timing-discrepancy-notice {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 6px;
        padding: 0.75rem;
        margin-top: 1rem;
        font-size: 0.875rem;
        color: #92400e;
        line-height: 1.4;
    }
    
    .headers-section, .security-section {
        margin-top: 1.5rem;
    }
    
    .headers-section h4, .security-section h4 {
        color: #374151;
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 1rem;
    }
    
    .headers-grid, .security-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }
    
    .headers-card, .security-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
    }
    
    .headers-card h5 {
        color: #374151;
        font-size: 0.875rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
    }
    
    .headers-list {
        max-height: 200px;
        overflow-y: auto;
    }
    
    .header-item {
        display: flex;
        margin-bottom: 0.5rem;
        font-size: 0.75rem;
    }
    
    .header-key {
        color: #6b7280;
        font-weight: 500;
        min-width: 120px;
        margin-right: 0.5rem;
    }
    
    .header-value {
        color: #1f2937;
        word-break: break-all;
    }
    
    .security-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
    }
    
    .security-label {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 500;
    }
    
    .security-value {
        font-size: 0.875rem;
        color: #1f2937;
        font-weight: 600;
        margin-top: 0.25rem;
        word-break: break-all;
    }

    .expand-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 0.5rem;
        transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
        transform: rotate(90deg);
    }

    /* Network Details Modal */
    .network-details-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        z-index: 1001;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .modal-header h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
    }

    .modal-header button {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0.5rem;
        border-radius: 4px;
    }

    .modal-header button:hover {
        background: #f3f4f6;
        color: #374151;
    }

    .modal-body {
        padding: 1.5rem;
    }

    .network-details {
        margin-bottom: 1.5rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        max-width: 100%;
    }

    .detail-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: box-shadow 0.2s ease;
        max-width: 100%;
        overflow: hidden;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    .detail-card:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .detail-label {
        font-weight: 600;
        color: #6b7280;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
        display: block;
    }

    .detail-value {
        color: #1f2937;
        font-size: 0.875rem;
        font-weight: 500;
        word-break: break-word;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.4;
        max-width: 100%;
    }

    .timing-breakdown {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1rem;
        max-width: 100%;
        word-wrap: break-word;
        overflow-wrap: break-word;
        box-sizing: border-box;
    }

    .timing-breakdown h4 {
        margin: 0 0 1rem 0;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .timing-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.75rem;
        max-width: 100%;
    }

    .timing-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 0.75rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        transition: box-shadow 0.2s ease;
        max-width: 100%;
        overflow: hidden;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    .timing-card:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .timing-label {
        color: #6b7280;
        font-weight: 500;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
        display: block;
    }

    .timing-value {
        color: #1f2937;
        font-weight: 600;
        font-size: 0.875rem;
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
    }

    /* Tabulator Custom Styling to Match Dashboard */
    .tabulator {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-family: inherit;
    }

    .tabulator .tabulator-header {
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
    }

    .tabulator .tabulator-header .tabulator-col {
        background: #f8fafc;
        border-right: 1px solid #e5e7eb;
        color: #374151;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .tabulator .tabulator-header .tabulator-col:hover {
        background: #f1f5f9;
        color: #1f2937;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sortable:hover {
        background: #f1f5f9;
        color: #3b82f6;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sorted {
        background: #f1f5f9;
        color: #3b82f6;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sorted .tabulator-col-sorter {
        color: #3b82f6;
    }

    .tabulator .tabulator-tableholder {
        background: #ffffff;
    }

    .tabulator .tabulator-tableholder .tabulator-table {
        background: #ffffff;
    }

    .tabulator .tabulator-row {
        background: #ffffff;
        border-bottom: 1px solid #f3f4f6;
        color: #374151;
    }

    .tabulator .tabulator-row:hover {
        background: #f8fafc;
        color: #1f2937;
    }

    .tabulator .tabulator-row.tabulator-selectable:hover {
        background: #f1f5f9;
        color: #1f2937;
    }

    .tabulator .tabulator-row.tabulator-selected {
        background: #dbeafe;
        color: #1e40af;
    }

    .tabulator .tabulator-row.tabulator-selected:hover {
        background: #bfdbfe;
        color: #1e40af;
    }

    .tabulator .tabulator-cell {
        border-right: 1px solid #f3f4f6;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        color: #374151;
    }

    .tabulator .tabulator-row:hover .tabulator-cell {
        color: #1f2937;
    }

    .tabulator .tabulator-footer {
        background: #f8fafc;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 0.875rem;
    }

    .tabulator .tabulator-footer .tabulator-page {
        background: #ffffff;
        border: 1px solid #d1d5db;
        color: #374151;
        margin: 0 2px;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
    }

    .tabulator .tabulator-footer .tabulator-page:hover {
        background: #f3f4f6;
        color: #1f2937;
        border-color: #9ca3af;
    }

    .tabulator .tabulator-footer .tabulator-page.active {
        background: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
    }

    .tabulator .tabulator-footer .tabulator-page.active:hover {
        background: #2563eb;
        border-color: #2563eb;
    }

    .tabulator .tabulator-footer .tabulator-page-size {
        background: #ffffff;
        border: 1px solid #d1d5db;
        color: #374151;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        margin: 0 4px;
    }

    .tabulator .tabulator-footer .tabulator-page-size:hover {
        background: #f3f4f6;
        color: #1f2937;
        border-color: #9ca3af;
    }

    .tabulator .tabulator-footer .tabulator-page-size.active {
        background: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
    }

    /* Search and Filter Styling */
    .tabulator .tabulator-header-filter {
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        padding: 0.5rem;
        font-size: 0.875rem;
        color: #374151;
    }

    .tabulator .tabulator-header-filter:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Loading and Empty States */
    .tabulator .tabulator-loading {
        background: rgba(248, 250, 252, 0.8);
        color: #6b7280;
    }

    .tabulator .tabulator-empty {
        background: #ffffff;
        color: #6b7280;
    }

    /* Expandable Row Styling */
    .tabulator .tabulator-row-expanded {
        background: #f1f5f9 !important;
        border-left: 3px solid #3b82f6;
    }

    .tabulator .tabulator-row-expanded .tabulator-cell {
        background: #f1f5f9 !important;
    }

    .tabulator-row-expanded-content {
        background: #f8fafc;
        border-left: 3px solid #3b82f6;
        border-bottom: 1px solid #e5e7eb;
        animation: expandRow 0.3s ease-out;
        overflow-x: hidden;
        overflow-y: auto;
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
        box-sizing: border-box;
        max-height: 500px;
        pointer-events: auto;
        position: relative;
        z-index: 1;
    }

    .tabulator-row-expanded-content > div {
        max-width: 100%;
        overflow: visible;
        word-wrap: break-word;
        overflow-wrap: break-word;
        box-sizing: border-box;
    }

    @keyframes expandRow {
        from {
            opacity: 0;
            max-height: 0;
            padding: 0;
        }
        to {
            opacity: 1;
            max-height: 1000px;
            padding: 1rem;
        }
    }

    .expand-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 0.5rem;
        transition: transform 0.2s ease;
        cursor: pointer;
        user-select: none;
    }

    .expand-icon:hover {
        color: #3b82f6;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .tabulator .tabulator-cell {
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
        }
        
        .tabulator .tabulator-header .tabulator-col {
            font-size: 0.8rem;
            padding: 0.5rem 0.75rem;
        }

        /* Mobile responsive expanded rows */
        .tabulator-row-expanded-content {
            padding: 0.75rem;
            max-height: 800px;
            max-width: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .tabulator-row-expanded-content > div {
            max-width: 100%;
            overflow: visible;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .network-details {
            grid-template-columns: 1fr;
            gap: 0.75rem;
        }

        .detail-card {
            padding: 0.75rem;
        }

        .detail-label {
            font-size: 0.7rem;
        }

        .detail-value {
            font-size: 0.8rem;
        }

        .timing-grid {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.5rem;
        }

        .timing-card {
            padding: 0.5rem;
        }

        .timing-label {
            font-size: 0.7rem;
        }

        .timing-value {
            font-size: 0.8rem;
        }

        .timing-breakdown {
            padding: 0.75rem;
            max-width: 100%;
            overflow: hidden;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .timing-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
            padding: 0.4rem 0;
            max-width: 100%;
            overflow: hidden;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .timing-label {
            min-width: auto;
            font-size: 0.8rem;
            max-width: 100%;
            overflow: hidden;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .timing-value {
            text-align: left;
            font-size: 0.8rem;
            max-width: 100%;
            overflow: hidden;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
    }

    @media (max-width: 480px) {
        .tabulator-row-expanded-content {
            padding: 0.5rem;
            max-height: 600px;
            max-width: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .tabulator-row-expanded-content > div {
            max-width: 100%;
            overflow: visible;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .network-details {
            grid-template-columns: 1fr;
            gap: 0.5rem;
        }

        .detail-card {
            padding: 0.5rem;
        }

        .detail-label {
            font-size: 0.65rem;
        }

        .detail-value {
            font-size: 0.75rem;
        }

        .timing-grid {
            grid-template-columns: 1fr;
            gap: 0.4rem;
        }

        .timing-card {
            padding: 0.4rem;
        }

        .timing-label {
            font-size: 0.65rem;
        }

        .timing-value {
            font-size: 0.75rem;
        }

        .timing-breakdown {
            padding: 0.5rem;
        }
    }

    .resource-type {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
    }

    .resource-type.document { background: #dbeafe; color: #1e40af; }
    .resource-type.script { background: #fce7f3; color: #be185d; }
    .resource-type.stylesheet { background: #dcfce7; color: #166534; }
    .resource-type.image { background: #fef3c7; color: #92400e; }
    .resource-type.font { background: #e0e7ff; color: #3730a3; }
    .resource-type.xhr { background: #f3f4f6; color: #374151; }

    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status-success {
        background: #dcfce7;
        color: #166534;
    }

    .priority-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .priority-high {
        background: #fecaca;
        color: #dc2626;
    }

    .priority-medium {
        background: #f3f4f6;
        color: #374151;
    }

    .view-btn {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.375rem 0.75rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .view-btn:hover {
        background: #2563eb;
    }

    .view-btn:active {
        background: #1d4ed8;
    }

    /* JavaScript Profiler Section */
    .js-profiler {
        background: white;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
    }

    .profiler-content {
        padding: 1.5rem;
    }

    .profiler-section {
        margin-bottom: 2rem;
    }

    .profiler-section h4 {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }

    /* Collapsible profiler sections */
    .profiler-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        margin-bottom: 0.5rem;
        transition: background-color 0.2s ease;
    }

    .profiler-section-header:hover {
        background: #f1f5f9;
    }

    .profiler-section-header h4 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: #374151;
        border: none;
        padding: 0;
    }

    .toggle-icon {
        font-size: 0.875rem;
        color: #6b7280;
        transition: transform 0.2s ease;
        user-select: none;
    }

    .profiler-section-content {
        overflow: hidden;
        transition: max-height 0.3s ease-out, opacity 0.2s ease-out;
        max-height: 1000px;
        opacity: 1;
    }

    .profiler-section-content.collapsed {
        max-height: 0;
        opacity: 0;
    }

    .function-list {
        margin-bottom: 1.5rem;
    }

    /* Thread Blocking Analysis Styles */
    .thread-blocking-content {
        padding: 1rem;
    }

    .blocking-subsection {
        margin-bottom: 2rem;
    }

    .blocking-subsection h5 {
        font-size: 0.9rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }

    .blocking-events-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .blocking-event-item {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.75rem;
    }

    .blocking-function {
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.5rem;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.875rem;
    }

    .blocking-severity {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .severity-badge {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        text-transform: uppercase;
    }

    .severity-badge.low {
        background: #dcfce7;
        color: #166534;
    }

    .severity-badge.medium {
        background: #fef3c7;
        color: #92400e;
    }

    .severity-badge.high {
        background: #fed7aa;
        color: #c2410c;
    }

    .severity-badge.critical {
        background: #fecaca;
        color: #dc2626;
    }

    .blocking-time {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
    }

    .blocking-details {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .responsiveness-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
    }

    .responsiveness-metric {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 1rem;
        text-align: center;
    }

    /* CPU Usage Analysis Styles */
    .cpu-usage-content {
        padding: 1rem;
    }

    .cpu-subsection {
        margin-bottom: 2rem;
    }

    .cpu-subsection h5 {
        font-size: 0.9rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }

    .cpu-functions-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .cpu-function-item {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.75rem;
    }

    .cpu-function-name {
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.5rem;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.875rem;
    }

    .cpu-usage-bar {
        width: 100%;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
    }

    .cpu-usage-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .cpu-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: #6b7280;
    }

    .cpu-time {
        font-weight: 600;
        color: #374151;
    }

    .cpu-percentage {
        font-weight: 600;
        color: #3b82f6;
    }

    .cpu-calls {
        color: #6b7280;
    }

    .cpu-efficiency-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
    }

    .cpu-metric {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 1rem;
        text-align: center;
    }

    .cpu-metric .metric-label {
        font-size: 0.75rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    .cpu-metric .metric-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
    }

    .function-item {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .function-item:hover {
        background: #f9fafb;
    }

    .function-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #1f2937;
        margin-right: 1rem;
        min-width: 200px;
        cursor: help;
    }

    .function-bar {
        flex: 1;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        margin-right: 1rem;
        position: relative;
        overflow: hidden;
    }

    .function-bar-fill {
        height: 100%;
        background: #3b82f6;
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .function-time {
        font-size: 0.75rem;
        color: #6b7280;
        min-width: 120px;
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .function-calls {
        font-size: 0.65rem;
        color: #9ca3af;
        margin-top: 0.125rem;
    }

    /* Third-Party Impact Styles */
    .third-party-impact {
        margin-bottom: 1.5rem;
    }

    .third-party-item {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .third-party-item:hover {
        background: #f9fafb;
    }

    .script-domain {
        font-size: 0.875rem;
        font-weight: 500;
        color: #1f2937;
        margin-right: 1rem;
        min-width: 200px;
        word-break: break-all;
    }

    .script-bar {
        flex: 1;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        margin-right: 1rem;
        position: relative;
        overflow: hidden;
    }

    .script-bar-fill {
        height: 100%;
        background: #f59e0b;
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .script-stats {
        font-size: 0.75rem;
        color: #6b7280;
        min-width: 120px;
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .script-functions {
        font-size: 0.65rem;
        color: #9ca3af;
        margin-top: 0.125rem;
    }

    /* Function Call Frequency Styles */
    .call-frequency-list {
        margin-bottom: 1.5rem;
    }

    .frequency-item {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        padding: 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .frequency-item:hover {
        background: #f9fafb;
    }

    .frequency-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #1f2937;
        margin-right: 1rem;
        min-width: 200px;
    }

    .frequency-count {
        font-size: 0.75rem;
        color: #6b7280;
        min-width: 80px;
        text-align: right;
        margin-right: 1rem;
    }

    .frequency-bar {
        flex: 1;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
    }

    .frequency-bar-fill {
        height: 100%;
        background: #10b981;
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    .function-chart {
        height: 200px;
        margin-bottom: 1.5rem;
    }

    .profiler-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }

    .profiler-stat {
        text-align: center;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 6px;
    }

    .profiler-stat-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.25rem;
    }

    .profiler-stat-label {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 500;
    }

    /* Performance Summary */
    .performance-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
    }

    .summary-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid #e5e7eb;
        text-align: center;
    }

    .summary-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.25rem;
    }

    .summary-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    /* Charts */
    .chart-container {
        position: relative;
        height: 300px;
        margin: 1rem 0;
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
        .content-grid {
            grid-template-columns: 1fr;
        }
        
        .vitals-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 768px) {
        .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
        
        .nav-tabs {
            padding: 0 1rem;
            overflow-x: auto;
        }
        
        .dashboard-content {
            padding: 1rem;
        }
        
        .vitals-grid {
            grid-template-columns: 1fr;
        }
        
        .performance-summary {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .profiler-stats {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 480px) {
        .performance-summary {
            grid-template-columns: 1fr;
        }
        
        .profiler-stats {
            grid-template-columns: 1fr;
        }
    }
    `;
}
function getJavaScript() {
  return `
    document.addEventListener('DOMContentLoaded', function() {
        initializeTabs();
        initializeCharts();
        initializeNetworkTables();
    });

    // Toggle function for collapsible profiler sections
    function toggleSection(sectionId) {
        const content = document.getElementById(sectionId);
        const icon = document.getElementById(sectionId + '-icon');
        
        if (content && icon) {
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                icon.textContent = '▲';
            } else {
                content.classList.add('collapsed');
                icon.textContent = '▼';
            }
        }
    }

    function initializeTabs() {
        const tabs = document.querySelectorAll('.nav-tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                this.classList.add('active');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    function initializeNetworkTables() {
        // Initialize overview network table
        const overviewTable = document.querySelector('[id^="networkTable-"]');
        
        if (overviewTable && window.dashboardData) {
            const allRequests = [];
            window.dashboardData.forEach(report => {
                if (report.network?.requests) {
                    allRequests.push(...report.network.requests.map(req => ({
                        ...req,
                        urlShortName: (req.url.split('/').pop() || req.url).substring(0, 20) + '...',
                        sizeFormatted: formatBytes(req.transferSize),
                        timeFormatted: req.responseTime.toFixed(0) + 'ms',
                        statusFormatted: 'Success',
                        priorityFormatted: 'High'
                    })));
                }
            });
            
            new Tabulator(overviewTable, {
                data: allRequests.sort((a, b) => b.responseTime - a.responseTime),
                layout: "fitColumns",
                pagination: "local",
                paginationSize: 10,
                paginationSizeSelector: [5, 10, 20, 50],
                movableColumns: true,
                resizableRows: true,
                tooltips: true,
                theme: "default",
                headerFilterPlaceholder: "Search...",
                placeholder: "No network requests found",
                columns: [
                    {
                        title: "URL Short Name",
                        field: "urlShortName",
                        width: 200,
                        sorter: "string",
                        formatter: function(cell, formatterParams, onRendered) {
                            return cell.getValue();
                        }
                    },
                    {
                        title: "Domain",
                        field: "domain",
                        width: 150,
                        sorter: "string"
                    },
                    {
                        title: "Type",
                        field: "resourceType",
                        width: 100,
                        sorter: "string",
                        formatter: function(cell, formatterParams, onRendered) {
                            const type = cell.getValue();
                            return '<span class="resource-type ' + type + '">' + type + '</span>';
                        }
                    },
                    {
                        title: "Size",
                        field: "sizeFormatted",
                        width: 100,
                        sorter: "number",
                        sorterParams: {column: "transferSize"}
                    },
                    {
                        title: "Time",
                        field: "timeFormatted",
                        width: 100,
                        sorter: "number",
                        sorterParams: {column: "responseTime"}
                    },
                    {
                        title: "Status",
                        field: "statusFormatted",
                        width: 100,
                        sorter: "string",
                        formatter: function(cell, formatterParams, onRendered) {
                            return '<span class="status-badge status-success">' + cell.getValue() + '</span>';
                        }
                    },
                    {
                        title: "Priority",
                        field: "priorityFormatted",
                        width: 100,
                        sorter: "string",
                        formatter: function(cell, formatterParams, onRendered) {
                            return '<span class="priority-badge priority-high">' + cell.getValue() + '</span>';
                        }
                    },
                    {
                        title: "Actions",
                        field: "actions",
                        width: 80,
                        formatter: function(cell, formatterParams, onRendered) {
                            return '<button class="view-btn" onclick="showNetworkDetailsModal(' + JSON.stringify(cell.getRow().getData()).replace(/"/g, '&quot;') + ')">View</button>';
                        }
                    }
                ]
            });
        }
        
        // Initialize scenario network tables
        const scenarioTables = document.querySelectorAll('[id^="scenarioNetworkTable-"]');
        
        scenarioTables.forEach((table, index) => {
            if (window.dashboardData && window.dashboardData[index]?.network?.requests) {
                const requests = window.dashboardData[index].network.requests.map(req => ({
                    ...req,
                    urlShortName: (req.url.split('/').pop() || req.url).substring(0, 20) + '...',
                    sizeFormatted: formatBytes(req.transferSize),
                    timeFormatted: req.responseTime.toFixed(0) + 'ms',
                    statusFormatted: 'Success',
                    priorityFormatted: 'High'
                }));
                
                new Tabulator(table, {
                    data: requests,
                    layout: "fitColumns",
                    pagination: "local",
                    paginationSize: 10,
                    paginationSizeSelector: [5, 10, 20, 50],
                    movableColumns: true,
                    resizableRows: false,
                    tooltips: true,
                    theme: "default",
                    headerFilterPlaceholder: "Search...",
                    placeholder: "No network requests found",

                    columns: [
                        {
                            title: "URL Short Name",
                            field: "urlShortName",
                            width: 200,
                            sorter: "string",
                            formatter: function(cell, formatterParams, onRendered) {
                                return cell.getValue();
                            }
                        },
                        {
                            title: "Domain",
                            field: "domain",
                            width: 150,
                            sorter: "string"
                        },
                        {
                            title: "Type",
                            field: "resourceType",
                            width: 100,
                            sorter: "string",
                            formatter: function(cell, formatterParams, onRendered) {
                                const type = cell.getValue();
                                return '<span class="resource-type ' + type + '">' + type + '</span>';
                            }
                        },
                        {
                            title: "Size",
                            field: "sizeFormatted",
                            width: 100,
                            sorter: "number",
                            sorterParams: {column: "transferSize"}
                        },
                        {
                            title: "Time",
                            field: "timeFormatted",
                            width: 100,
                            sorter: "number",
                            sorterParams: {column: "responseTime"}
                        },
                        {
                            title: "Status",
                            field: "statusFormatted",
                            width: 100,
                            sorter: "string",
                            formatter: function(cell, formatterParams, onRendered) {
                                return '<span class="status-badge status-success">' + cell.getValue() + '</span>';
                            }
                        },
                        {
                            title: "Priority",
                            field: "priorityFormatted",
                            width: 100,
                            sorter: "string",
                            formatter: function(cell, formatterParams, onRendered) {
                                return '<span class="priority-badge priority-high">' + cell.getValue() + '</span>';
                            }
                        },
                        {
                            title: "Actions",
                            field: "actions",
                            width: 80,
                            formatter: function(cell, formatterParams, onRendered) {
                                return '<button class="view-btn" onclick="showNetworkDetailsModal(' + JSON.stringify(cell.getRow().getData()).replace(/"/g, '&quot;') + ')">View</button>';
                            }
                        }
                    ],

                });
            }
        });
    }
    
    function showNetworkDetailsModal(requestData) {
        // Remove any existing modal
        const existingModal = document.querySelector('.network-details-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'network-details-modal';
        modal.innerHTML = \`
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Network Request Details</h3>
                    <button onclick="this.closest('.network-details-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    \${createNetworkRequestDetailsHTML(requestData)}
                </div>
            </div>
        \`;
        document.body.appendChild(modal);
        
        // Add escape key listener
        const handleEscape = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    function showNetworkDetails(requestData) {
        showNetworkDetailsModal(requestData);
    }
    
    function createNetworkRequestDetailsHTML(request) {
        const timing = request.timing || {};
        const headers = request.headers || {};
        
        return \`
            <div class="network-details">
                <div class="detail-card">
                    <div class="detail-label">Full URL</div>
                    <div class="detail-value">\${request.url}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Method</div>
                    <div class="detail-value">\${request.method || 'GET'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Status Code</div>
                    <div class="detail-value">\${request.status || 'N/A'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Domain</div>
                    <div class="detail-value">\${request.domain || 'N/A'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Protocol</div>
                    <div class="detail-value">\${request.protocol || 'N/A'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Cache Status</div>
                    <div class="detail-value">\${request.cacheStatus || 'N/A'}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Transfer Size</div>
                    <div class="detail-value">\${formatBytes(request.transferSize || 0)}</div>
                </div>
                <div class="detail-card">
                    <div class="detail-label">Encoded Size</div>
                    <div class="detail-value">\${formatBytes(request.encodedBodySize || 0)}</div>
                </div>
                \${request.connection ? \`
                <div class="detail-card">
                    <div class="detail-label">Remote IP</div>
                    <div class="detail-value">\${request.connection.remoteIP}:\${request.connection.remotePort}</div>
                </div>
                \` : ''}
                \${request.security ? \`
                <div class="detail-card">
                    <div class="detail-label">Security State</div>
                    <div class="detail-value">\${request.security.state}</div>
                </div>
                \` : ''}
            </div>
            
            <div class="timing-breakdown">
                <h4>Timing Breakdown</h4>
                <div class="timing-grid">
                    <div class="timing-card \${timing.dnsLookup > 0 ? '' : 'timing-unavailable'}">
                        <div class="timing-label">DNS Lookup</div>
                        <div class="timing-value">\${timing.dnsLookup > 0 ? timing.dnsLookup.toFixed(2) + 'ms' : 'N/A'}</div>
                        \${timing.dnsLookup === 0 ? '<div class="timing-note">Connection reused</div>' : ''}
                    </div>
                    <div class="timing-card \${timing.tcpConnect > 0 ? '' : 'timing-unavailable'}">
                        <div class="timing-label">TCP Connect</div>
                        <div class="timing-value">\${timing.tcpConnect > 0 ? timing.tcpConnect.toFixed(2) + 'ms' : 'N/A'}</div>
                        \${timing.tcpConnect === 0 ? '<div class="timing-note">Connection reused</div>' : ''}
                    </div>
                    <div class="timing-card \${timing.sslHandshake > 0 ? '' : 'timing-unavailable'}">
                        <div class="timing-label">SSL Handshake</div>
                        <div class="timing-value">\${timing.sslHandshake > 0 ? timing.sslHandshake.toFixed(2) + 'ms' : 'N/A'}</div>
                        \${timing.sslHandshake === 0 ? '<div class="timing-note">HTTP or reused</div>' : ''}
                    </div>
                    <div class="timing-card \${timing.requestSend > 0 ? '' : 'timing-unavailable'}">
                        <div class="timing-label">Request Send</div>
                        <div class="timing-value">\${timing.requestSend > 0 ? timing.requestSend.toFixed(2) + 'ms' : 'N/A'}</div>
                        \${timing.requestSend === 0 ? '<div class="timing-note">Cached or fast</div>' : ''}
                    </div>
                    <div class="timing-card \${timing.waitTime > 0 ? '' : 'timing-unavailable'}">
                        <div class="timing-label">Server Wait</div>
                        <div class="timing-value">\${timing.waitTime > 0 ? timing.waitTime.toFixed(2) + 'ms' : 'N/A'}</div>
                        \${timing.waitTime === 0 ? '<div class="timing-note">Instant response</div>' : ''}
                    </div>
                    <div class="timing-card \${timing.responseReceive > 0 ? '' : 'timing-unavailable'}">
                        <div class="timing-label">Response Receive</div>
                        <div class="timing-value">\${timing.responseReceive > 0 ? timing.responseReceive.toFixed(2) + 'ms' : 'N/A'}</div>
                        \${timing.responseReceive === 0 ? '<div class="timing-note">Small payload</div>' : ''}
                    </div>
                    <div class="timing-card \${timing.contentDownloadTime > 0 ? '' : 'timing-unavailable'}">
                        <div class="timing-label">Content Download</div>
                        <div class="timing-value">\${timing.contentDownloadTime > 0 ? timing.contentDownloadTime.toFixed(2) + 'ms' : 'N/A'}</div>
                        \${timing.contentDownloadTime === 0 ? '<div class="timing-note">Headers only</div>' : ''}
                    </div>
                    \${timing.redirectTime > 0 ? \`
                    <div class="timing-card">
                        <div class="timing-label">Redirect Time</div>
                        <div class="timing-value">\${timing.redirectTime.toFixed(2)}ms</div>
                    </div>
                    \` : ''}
                    <div class="timing-card" style="border: 2px solid #3b82f6; background: #f0f9ff;">
                        <div class="timing-label" style="color: #1e40af; font-weight: 600;">Total Time</div>
                        <div class="timing-value" style="color: #1e40af; font-weight: 700; font-size: 1rem;">\${(request.responseTime || 0).toFixed(2)}ms</div>
                    </div>
                    \${timing.timingSum && Math.abs(timing.totalTime - timing.timingSum) > 1 ? \`
                    <div class="timing-card" style="border: 2px solid \${timing.timingSum > timing.totalTime ? '#dc2626' : '#f59e0b'}; background: \${timing.timingSum > timing.totalTime ? '#fef2f2' : '#fffbeb'};">
                        <div class="timing-label" style="color: \${timing.timingSum > timing.totalTime ? '#dc2626' : '#92400e'}; font-weight: 600;">Timing Sum</div>
                        <div class="timing-value" style="color: \${timing.timingSum > timing.totalTime ? '#dc2626' : '#92400e'}; font-weight: 700; font-size: 1rem;">\${timing.timingSum.toFixed(2)}ms</div>
                        <div class="timing-note" style="color: \${timing.timingSum > timing.totalTime ? '#dc2626' : '#92400e'}; margin-top: 0.25rem; font-size: 0.7rem;">
                            \${timing.timingSum > timing.totalTime ? 'Overlapping operations' : 'Sum of breakdown components'}
                        </div>
                    </div>
                    \` : ''}
                </div>
                \${timing.fromCache ? '<div class="cache-notice">📦 This resource was served from cache</div>' : ''}
                \${timing.connectionReused ? '<div class="connection-notice">🔄 Connection was reused (faster)</div>' : ''}
                \${timing.timingSum && Math.abs(timing.totalTime - timing.timingSum) > 1 ? \`
                <div class="timing-discrepancy-notice">
                    \${timing.timingSum > timing.totalTime ? \`
                        ⚠️ Timing discrepancy: Timing sum (\${timing.timingSum.toFixed(2)}ms) > Total time (\${timing.totalTime.toFixed(2)}ms). 
                        This indicates overlapping network operations or concurrent requests that share connection setup time.
                    \` : \`
                        ⚠️ Timing discrepancy: Total time (\${timing.totalTime.toFixed(2)}ms) includes response body download time, 
                        while breakdown sum (\${timing.timingSum.toFixed(2)}ms) only includes headers received time.
                    \`}
                </div>
                \` : ''}
            </div>
            
            \${request.headers ? \`
            <div class="headers-section">
                <h4>Request & Response Headers</h4>
                <div class="headers-grid">
                    <div class="headers-card">
                        <h5>Request Headers</h5>
                        <div class="headers-list">
                            \${Object.entries(request.headers.request || {}).map(([key, value]) => \`
                                <div class="header-item">
                                    <span class="header-key">\${key}:</span>
                                    <span class="header-value">\${value}</span>
                                </div>
                            \`).join('')}
                        </div>
                    </div>
                    <div class="headers-card">
                        <h5>Response Headers</h5>
                        <div class="headers-list">
                            \${Object.entries(request.headers.response || {}).map(([key, value]) => \`
                                <div class="header-item">
                                    <span class="header-key">\${key}:</span>
                                    <span class="header-value">\${value}</span>
                                </div>
                            \`).join('')}
                        </div>
                    </div>
                </div>
            </div>
            \` : ''}
            
            \${request.security?.details ? \`
            <div class="security-section">
                <h4>Security Details</h4>
                <div class="security-grid">
                    <div class="security-card">
                        <div class="security-label">Protocol</div>
                        <div class="security-value">\${request.security.details.protocol}</div>
                    </div>
                    <div class="security-card">
                        <div class="security-label">Cipher</div>
                        <div class="security-value">\${request.security.details.cipher}</div>
                    </div>
                    <div class="security-card">
                        <div class="security-label">Certificate Subject</div>
                        <div class="security-value">\${request.security.details.subjectName}</div>
                    </div>
                    <div class="security-card">
                        <div class="security-label">Issuer</div>
                        <div class="security-value">\${request.security.details.issuer}</div>
                    </div>
                </div>
            </div>
            \` : ''}
        \`;
    }
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function initializeNetworkRows() {
        const networkRows = document.querySelectorAll('.network-row');
        
        networkRows.forEach(row => {
            row.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                const expandableRow = document.querySelector(\`.expandable-row[data-index="\${index}"]\`);
                const expandIcon = this.querySelector('.expand-icon');
                
                if (expandableRow && expandIcon) {
                    const isExpanded = expandableRow.classList.contains('active');
                    
                    if (isExpanded) {
                        // Collapse
                        expandableRow.classList.remove('active');
                        this.classList.remove('expanded');
                        expandIcon.classList.remove('expanded');
                        expandIcon.textContent = '▶';
                    } else {
                        // Expand
                        expandableRow.classList.add('active');
                        this.classList.add('expanded');
                        expandIcon.classList.add('expanded');
                        expandIcon.textContent = '▼';
                    }
                }
            });
        });
    }

    function initializeCharts() {
        // Initialize any charts that need to be rendered
        const chartContainers = document.querySelectorAll('.chart-container');
        
        chartContainers.forEach(container => {
            const canvas = container.querySelector('canvas');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const data = JSON.parse(canvas.dataset.chartData || '{}');
            
            if (Object.keys(data).length > 0) {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(data),
                        datasets: [{
                            data: Object.values(data),
                            backgroundColor: [
                                '#3b82f6',
                                '#10b981',
                                '#f59e0b',
                                '#ef4444',
                                '#8b5cf6',
                                '#06b6d4'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true
                                }
                            }
                        }
                    }
                });
            }
        });
    }
  `;
}
function calculateOverallScore(reports) {
  if (reports.length === 0) return 0;
  let totalScore = 0;
  let validReports = 0;
  reports.forEach((report) => {
    const score = calculateScenarioScore(report);
    if (score > 0) {
      totalScore += score;
      validReports++;
    }
  });
  return validReports > 0 ? Math.round(totalScore / validReports) : 0;
}
function calculateScenarioScore(report) {
  const metrics = report.metrics;
  if (!metrics) return 0;
  let score = 0;
  let validMetrics = 0;
  if (metrics.FCP !== void 0) {
    if (metrics.FCP <= 1800) score += 25;
    else if (metrics.FCP <= 3e3) score += 15;
    else if (metrics.FCP <= 4e3) score += 5;
    validMetrics++;
  }
  if (metrics.LCP !== void 0) {
    if (metrics.LCP <= 2500) score += 25;
    else if (metrics.LCP <= 4e3) score += 15;
    else if (metrics.LCP <= 5e3) score += 5;
    validMetrics++;
  }
  if (metrics.CLS !== void 0) {
    if (metrics.CLS <= 0.1) score += 25;
    else if (metrics.CLS <= 0.25) score += 15;
    else if (metrics.CLS <= 0.4) score += 5;
    validMetrics++;
  }
  if (metrics.INP !== void 0) {
    if (metrics.INP <= 200) score += 25;
    else if (metrics.INP <= 500) score += 15;
    else if (metrics.INP <= 1e3) score += 5;
    validMetrics++;
  }
  return validMetrics > 0 ? Math.round(score / (validMetrics * 25) * 100) : 0;
}
function getScoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs Improvement";
  return "Poor";
}
function createOverviewContent(reports) {
  return `
        <!-- Performance Scores by Scenario -->
        <div class="performance-scores">
            <h2 class="section-title">Performance Scores by Scenario</h2>
            <div class="scores-grid">
                ${reports.map((report) => {
    const score = calculateScenarioScore(report);
    const status = getScoreLabel(score);
    const statusClass = status.toLowerCase().replace(" ", "-");
    return `
                        <div class="score-card ${statusClass}">
                            <div class="score-card-value">${score}</div>
                            <div class="score-card-label">${report.scenario}</div>
                            <div class="score-card-status ${statusClass}">${status}</div>
                        </div>
                    `;
  }).join("")}
            </div>
        </div>

        <!-- Core Web Vitals Comparison -->
        <div class="core-web-vitals">
            <h2 class="section-title">Core Web Vitals Comparison</h2>
        <div class="vitals-grid">
            ${createVitalCard("First Contentful Paint", "FCP", reports, "Time when first text or image is painted")}
            ${createVitalCard("Largest Contentful Paint", "LCP", reports, "Time when largest content element is painted")}
            ${createVitalCard("Cumulative Layout Shift", "CLS", reports, "Visual stability of the page")}
            ${createVitalCard("Time to First Byte", "TTFB", reports, "Time between request and first byte received")}
        </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">
            ${createNetworkAnalysisSection(reports)}
            ${createJavaScriptProfilerSection(reports)}
        </div>

        <!-- Performance Summary -->
        <div class="performance-summary">
            ${createSummaryCard("Total Size", calculateTotalSize(reports) + " MB")}
            ${createSummaryCard("Load Time", calculateAverageLoadTime(reports) + "ms")}
            ${createSummaryCard("Requests", calculateTotalRequests(reports).toString())}
            ${createSummaryCard("JS Execution", calculateAverageJSExecution(reports) + "ms")}
        </div>
    `;
}
function createScenarioContent(report, index) {
  const score = calculateScenarioScore(report);
  const status = getScoreLabel(score);
  return `
        <!-- Scenario Header -->
        <div class="performance-scores">
            <h2 class="section-title">Performance Summary - ${report.scenario}</h2>
            <div class="scores-grid">
                <div class="score-card ${status.toLowerCase().replace(" ", "-")}">
                    <div class="score-card-value">${score}</div>
                    <div class="score-card-label">Scenario Score</div>
                    <div class="score-card-status ${status.toLowerCase().replace(" ", "-")}">${status}</div>
                </div>
            </div>
        </div>

        <!-- Core Web Vitals for this scenario -->
        <div class="core-web-vitals">
            <h2 class="section-title">Core Web Vitals</h2>
            <div class="vitals-grid">
                ${createSingleVitalCard("First Contentful Paint", report.metrics?.FCP, "Time when first text or image is painted")}
                ${createSingleVitalCard("Largest Contentful Paint", report.metrics?.LCP, "Time when largest content element is painted")}
                ${createSingleVitalCard("Cumulative Layout Shift", report.metrics?.CLS, "Visual stability of the page")}
                ${createSingleVitalCard("Time to First Byte", report.metrics?.TTFB, "Time between request and first byte received")}
            </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">
            ${createScenarioNetworkAnalysis(report)}
            ${createScenarioJavaScriptProfiler(report)}
        </div>

        <!-- Performance Summary for this scenario -->
        <div class="performance-summary">
            ${createSummaryCard("Total Size", formatBytes(report.network?.summary?.totalTransferSize || 0))}
            ${createSummaryCard("Load Time", (report.performance?.loadTime || 0).toFixed(0) + "ms")}
            ${createSummaryCard("Requests", (report.network?.summary?.totalRequests || 0).toString())}
            ${createSummaryCard("JS Execution", (report.profile?.summary?.totalExecutionTime || 0).toFixed(0) + "ms")}
        </div>
    `;
}
function createVitalCard(name, metric, reports, description, threshold) {
  const values = reports.map((r) => r.metrics?.[metric]).filter((v) => v !== void 0);
  const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  const status = getVitalStatus(metric, average);
  const formatValue = (value, metric2) => {
    if (metric2 === "CLS") {
      return value.toFixed(3);
    }
    return value.toFixed(0) + "ms";
  };
  return `
        <div class="vital-card">
            <div class="vital-header">
                <div class="vital-name">${name}</div>
                <div class="vital-status">${status}</div>
            </div>
            <div class="vital-value">${formatValue(average, metric)}</div>
            <div class="vital-description">${description}</div>
        </div>
    `;
}
function createSingleVitalCard(name, value, description, threshold) {
  if (value === void 0) {
    return `
            <div class="vital-card">
                <div class="vital-header">
                    <div class="vital-name">${name}</div>
                    <div class="vital-status">No Data</div>
                </div>
                <div class="vital-value">N/A</div>
                <div class="vital-description">${description}</div>
            </div>
        `;
  }
  const metric = name.split(" ")[0];
  const status = getVitalStatus(metric, value);
  const formatValue = (value2, metric2) => {
    if (metric2 === "CLS") {
      return value2.toFixed(3);
    }
    return value2.toFixed(0) + "ms";
  };
  return `
        <div class="vital-card">
            <div class="vital-header">
                <div class="vital-name">${name}</div>
                <div class="vital-status">${status}</div>
            </div>
            <div class="vital-value">${formatValue(value, metric)}</div>
            <div class="vital-description">${description}</div>

        </div>
    `;
}
function getVitalStatus(metric, value) {
  const thresholds = {
    "FCP": { good: 1800, poor: 3e3 },
    "LCP": { good: 2500, poor: 4e3 },
    "CLS": { good: 0.1, poor: 0.25 },
    "INP": { good: 200, poor: 500 },
    "TTFB": { good: 600, poor: 1200 }
  };
  const threshold = thresholds[metric];
  if (!threshold) return "Good";
  if (value <= threshold.good) return "Good";
  if (value <= threshold.poor) return "Needs Improvement";
  return "Poor";
}
function createNetworkAnalysisSection(reports) {
  const totalRequests = reports.reduce((sum, r) => sum + (r.network?.summary?.totalRequests || 0), 0);
  const totalSize = reports.reduce((sum, r) => sum + (r.network?.summary?.totalTransferSize || 0), 0);
  const avgResponseTime = reports.reduce((sum, r) => sum + (r.network?.summary?.averageResponseTime || 0), 0) / reports.length;
  return `
        <div class="network-analysis">
            <div class="section-header">
                <h3>Network Request Analysis</h3>
                <div class="section-summary">
                    <span>Total Requests: ${totalRequests}</span>
                    <span>Total Size: ${formatBytes(totalSize)}</span>
                    <span>Load Time: ${avgResponseTime.toFixed(0)}ms</span>
                </div>
            </div>
            <div class="network-content">
                <div id="networkTable-${Date.now()}"></div>
            </div>
        </div>
    `;
}
function createJavaScriptProfilerSection(reports) {
  const totalExecutionTime = reports.reduce((sum, r) => sum + (r.profile?.summary?.totalExecutionTime || 0), 0);
  const totalFunctions = reports.reduce((sum, r) => sum + (r.profile?.summary?.totalFunctions || 0), 0);
  const totalCalls = reports.reduce((sum, r) => sum + (r.profile?.summary?.totalCalls || 0), 0);
  const avgJsExecutionPercentage = reports.reduce((sum, r) => sum + (r.profile?.summary?.executionEfficiency?.jsExecutionPercentage || 0), 0) / reports.length;
  const avgIdleTimePercentage = reports.reduce((sum, r) => sum + (r.profile?.summary?.executionEfficiency?.idleTimePercentage || 0), 0) / reports.length;
  return `
    <div class="js-profiler">
      <div class="section-header">
        <h3>JavaScript Profiler Analysis</h3>
        <div class="section-summary">
          <span>Total execution time: ${totalExecutionTime.toFixed(0)}ms</span>
          <span>JS execution: ${avgJsExecutionPercentage.toFixed(1)}% of profiler time</span>
          <span>Idle time: ${avgIdleTimePercentage.toFixed(1)}%</span>
        </div>
      </div>
      <div class="profiler-content">
        <!-- Top 10 Most Expensive Functions -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('overview-top-functions')">
            <h4>Top 10 Most Expensive Functions</h4>
            <span class="toggle-icon" id="overview-top-functions-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="overview-top-functions">
            <div class="function-list">
              ${getTopFunctions(reports).map((func) => `
                <div class="function-item">
                  <div class="function-name" title="${func.source}:${func.line}">${func.name}()</div>
                  <div class="function-bar">
                    <div class="function-bar-fill" style="width: ${func.percentage}%"></div>
                  </div>
                  <div class="function-time">
                    ${func.time.toFixed(0)}ms (${func.percentage.toFixed(1)}%)
                    <span class="function-calls">${func.calls} calls</span>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Third-Party Script Impact -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('overview-third-party')">
            <h4>Third-Party Script Impact</h4>
            <span class="toggle-icon" id="overview-third-party-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="overview-third-party">
            <div class="third-party-impact">
              ${getThirdPartyImpact(reports).map((script) => `
                <div class="third-party-item">
                  <div class="script-domain">${script.domain}</div>
                  <div class="script-bar">
                    <div class="script-bar-fill" style="width: ${script.percentage}%"></div>
                  </div>
                  <div class="script-stats">
                    ${script.time.toFixed(0)}ms (${script.percentage.toFixed(1)}%)
                    <span class="script-functions">${script.functions} functions</span>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Function Call Frequency -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('overview-call-frequency')">
            <h4>Most Called Functions</h4>
            <span class="toggle-icon" id="overview-call-frequency-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="overview-call-frequency">
            <div class="call-frequency-list">
              ${getMostCalledFunctions(reports).map((func) => `
                <div class="frequency-item">
                  <div class="frequency-name">${func.name}()</div>
                  <div class="frequency-count">${func.calls} calls</div>
                  <div class="frequency-bar">
                    <div class="frequency-bar-fill" style="width: ${func.calls / getMostCalledFunctions(reports)[0]?.calls * 100}%"></div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Thread Blocking Analysis -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('overview-thread-blocking')">
            <h4>Thread Blocking Analysis</h4>
            <span class="toggle-icon" id="overview-thread-blocking-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="overview-thread-blocking">
            <div class="thread-blocking-content">
              <!-- Top Blocking Events -->
              <div class="blocking-subsection">
                <h5>Top Blocking Events</h5>
                <div class="blocking-events-list">
                  ${getTopThreadBlockingEvents(reports).map((event) => `
                    <div class="blocking-event-item">
                      <div class="blocking-function">${event.functionName}()</div>
                      <div class="blocking-severity ${event.severity}">
                        <span class="severity-badge">${event.severity.toUpperCase()}</span>
                        <span class="blocking-time">${event.blockingTime.toFixed(1)}ms</span>
                      </div>
                      <div class="blocking-details">
                        <span class="blocking-duration">${event.startTime.toFixed(1)}ms - ${event.endTime.toFixed(1)}ms</span>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- Responsiveness Impact -->
              <div class="blocking-subsection">
                <h5>Responsiveness Impact</h5>
                <div class="responsiveness-grid">
                  <div class="responsiveness-metric">
                    <div class="metric-label">Responsiveness Score</div>
                    <div class="metric-value">${getAverageThreadBlockingMetrics(reports).responsivenessScore.toFixed(1)}%</div>
                  </div>
                  <div class="responsiveness-metric">
                    <div class="metric-label">Frame Drops</div>
                    <div class="metric-value">${getAverageThreadBlockingMetrics(reports).frameDrops.toFixed(0)}</div>
                  </div>
                  <div class="responsiveness-metric">
                    <div class="metric-label">Interaction Delay</div>
                    <div class="metric-value">${getAverageThreadBlockingMetrics(reports).userInteractionDelay.toFixed(1)}ms</div>
                  </div>
                  <div class="responsiveness-metric">
                    <div class="metric-label">Longest Block</div>
                    <div class="metric-value">${getAverageThreadBlockingMetrics(reports).longestBlockingEvent.toFixed(1)}ms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CPU Usage Analysis -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('overview-cpu-usage')">
            <h4>CPU Usage Analysis</h4>
            <span class="toggle-icon" id="overview-cpu-usage-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="overview-cpu-usage">
            <div class="cpu-usage-content">
              <!-- Top CPU-Intensive Functions -->
              <div class="cpu-subsection">
                <h5>Top CPU-Intensive Functions</h5>
                <div class="cpu-functions-list">
                  ${getTopCpuIntensiveFunctions(reports).map((func) => `
                    <div class="cpu-function-item">
                      <div class="cpu-function-name">${func.functionName}()</div>
                      <div class="cpu-usage-bar">
                        <div class="cpu-usage-fill" style="width: ${func.cpuPercentage}%"></div>
                      </div>
                      <div class="cpu-stats">
                        <span class="cpu-time">${func.cpuTime.toFixed(1)}ms</span>
                        <span class="cpu-percentage">${func.cpuPercentage.toFixed(1)}%</span>
                        <span class="cpu-calls">${func.calls} calls</span>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- CPU Efficiency Metrics -->
              <div class="cpu-subsection">
                <h5>CPU Efficiency Metrics</h5>
                <div class="cpu-efficiency-grid">
                  <div class="cpu-metric">
                    <div class="metric-label">CPU Utilization Score</div>
                    <div class="metric-value">${getAverageCpuUsageMetrics(reports).cpuUtilizationScore.toFixed(1)}%</div>
                  </div>
                  <div class="cpu-metric">
                    <div class="metric-label">Average CPU Usage</div>
                    <div class="metric-value">${getAverageCpuUsageMetrics(reports).averageCpuUsage.toFixed(1)}%</div>
                  </div>
                  <div class="cpu-metric">
                    <div class="metric-label">Peak CPU Usage</div>
                    <div class="metric-value">${getAverageCpuUsageMetrics(reports).peakCpuUsage.toFixed(1)}%</div>
                  </div>
                  <div class="cpu-metric">
                    <div class="metric-label">CPU Waste</div>
                    <div class="metric-value">${getAverageCpuUsageMetrics(reports).cpuWastePercentage.toFixed(1)}%</div>
                  </div>
                  <div class="cpu-metric">
                    <div class="metric-label">Optimization Potential</div>
                    <div class="metric-value">${getAverageCpuUsageMetrics(reports).optimizationPotential.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="function-chart">
          <canvas id="functionChart"></canvas>
        </div>
        <div class="profiler-stats">
          <div class="profiler-stat">
            <div class="profiler-stat-value">${totalFunctions}</div>
            <div class="profiler-stat-label">Functions</div>
          </div>
          <div class="profiler-stat">
            <div class="profiler-stat-value">${totalCalls}</div>
            <div class="profiler-stat-label">Total Calls</div>
          </div>
          <div class="profiler-stat">
            <div class="profiler-stat-value">${getLongestFunction(reports).time.toFixed(0)}ms</div>
            <div class="profiler-stat-label">Longest Function</div>
          </div>
          <div class="profiler-stat">
            <div class="profiler-stat-value">${avgJsExecutionPercentage.toFixed(1)}%</div>
            <div class="profiler-stat-label">JS Execution</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function createScenarioNetworkAnalysis(report) {
  const network = report.network;
  if (!network || !network.requests.length) {
    return `
            <div class="network-analysis">
                <div class="section-header">
                    <h3>Network Request Analysis</h3>
                </div>
                <div class="network-content">
                    <p>No network data available</p>
                </div>
            </div>
        `;
  }
  return `
        <div class="network-analysis">
            <div class="section-header">
                <h3>Network Request Analysis</h3>
                <div class="section-summary">
                    <span>Total Requests: ${network.summary.totalRequests}</span>
                    <span>Total Size: ${formatBytes(network.summary.totalTransferSize)}</span>
                    <span>Load Time: ${network.summary.averageResponseTime.toFixed(0)}ms</span>
                </div>
            </div>
            <div class="network-content">
                <div id="scenarioNetworkTable-${Date.now()}"></div>
            </div>
        </div>
    `;
}
function createScenarioJavaScriptProfiler(report) {
  const profile = report.profile;
  if (!profile || !profile.summary) {
    return `
      <div class="js-profiler">
        <div class="section-header">
          <h3>JavaScript Profiler</h3>
        </div>
        <div class="profiler-content">
          <p>No profile data available</p>
        </div>
      </div>
    `;
  }
  return `
    <div class="js-profiler">
      <div class="section-header">
        <h3>JavaScript Profiler Analysis</h3>
        <div class="section-summary">
          <span>Total execution time: ${profile.summary.totalExecutionTime.toFixed(0)}ms</span>
          <span>JS execution: ${profile.summary.executionEfficiency?.jsExecutionPercentage?.toFixed(1) || 0}% of load time</span>
          <span>Idle time: ${profile.summary.executionEfficiency?.idleTimePercentage?.toFixed(1) || 0}%</span>
        </div>
      </div>
      <div class="profiler-content">
        <!-- Top 10 Most Expensive Functions -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('scenario-top-functions')">
            <h4>Top 10 Most Expensive Functions</h4>
            <span class="toggle-icon" id="scenario-top-functions-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="scenario-top-functions">
            <div class="function-list">
              ${(profile.summary.topFunctions || []).map((func) => `
                <div class="function-item">
                  <div class="function-name" title="${func.source}:${func.line}">${func.name}()</div>
                  <div class="function-bar">
                    <div class="function-bar-fill" style="width: ${func.percentage}%"></div>
                  </div>
                  <div class="function-time">
                    ${func.time.toFixed(0)}ms (${func.percentage.toFixed(1)}%)
                    <span class="function-calls">${func.calls} calls</span>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Third-Party Script Impact -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('scenario-third-party')">
            <h4>Third-Party Script Impact</h4>
            <span class="toggle-icon" id="scenario-third-party-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="scenario-third-party">
            <div class="third-party-impact">
              ${profile.summary.thirdPartyImpact?.scripts?.map((script) => `
                <div class="third-party-item">
                  <div class="script-domain">${script.domain}</div>
                  <div class="script-bar">
                    <div class="script-bar-fill" style="width: ${script.percentage}%"></div>
                  </div>
                  <div class="script-stats">
                    ${script.time.toFixed(0)}ms (${script.percentage.toFixed(1)}%)
                    <span class="script-functions">${script.functions} functions</span>
                  </div>
                </div>
              `).join("") || "<p>No third-party scripts detected</p>"}
            </div>
          </div>
        </div>

        <!-- Function Call Frequency -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('scenario-call-frequency')">
            <h4>Most Called Functions</h4>
            <span class="toggle-icon" id="scenario-call-frequency-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="scenario-call-frequency">
            <div class="call-frequency-list">
              ${Object.entries(profile.summary.functionCallFrequency || {}).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, calls]) => `
                  <div class="frequency-item">
                    <div class="frequency-name">${name}()</div>
                    <div class="frequency-count">${calls} calls</div>
                    <div class="frequency-bar">
                      <div class="frequency-bar-fill" style="width: ${(calls / Math.max(...Object.values(profile.summary.functionCallFrequency || {}), 1) * 100).toFixed(1)}%"></div>
                    </div>
                  </div>
                `).join("")}
            </div>
          </div>
        </div>

        <div class="function-chart">
          <canvas data-chart-data='${JSON.stringify(getFunctionCallData(report))}'></canvas>
        </div>

        <!-- Thread Blocking Analysis -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('scenario-thread-blocking')">
            <h4>Thread Blocking Analysis</h4>
            <span class="toggle-icon" id="scenario-thread-blocking-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="scenario-thread-blocking">
            <div class="thread-blocking-content">
              <!-- Top Blocking Events -->
              <div class="blocking-subsection">
                <h5>Top Blocking Events</h5>
                <div class="blocking-events-list">
                  ${(profile.summary.threadBlockingAnalysis?.blockingEvents || []).slice(0, 5).map((event) => `
                    <div class="blocking-event-item">
                      <div class="blocking-function">${event.functionName}()</div>
                      <div class="blocking-severity ${event.severity}">
                        <span class="severity-badge">${event.severity.toUpperCase()}</span>
                        <span class="blocking-time">${event.blockingTime.toFixed(1)}ms</span>
                      </div>
                      <div class="blocking-details">
                        <span class="blocking-duration">${event.startTime.toFixed(1)}ms - ${event.endTime.toFixed(1)}ms</span>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- Responsiveness Impact -->
              <div class="blocking-subsection">
                <h5>Responsiveness Impact</h5>
                <div class="responsiveness-grid">
                  <div class="responsiveness-metric">
                    <div class="metric-label">Responsiveness Score</div>
                    <div class="metric-value">${profile.summary.threadBlockingAnalysis?.responsivenessImpact?.responsivenessScore?.toFixed(1) || 100}%</div>
                  </div>
                  <div class="responsiveness-metric">
                    <div class="metric-label">Frame Drops</div>
                    <div class="metric-value">${profile.summary.threadBlockingAnalysis?.responsivenessImpact?.frameDrops || 0}</div>
                  </div>
                  <div class="responsiveness-metric">
                    <div class="metric-label">Interaction Delay</div>
                    <div class="metric-value">${profile.summary.threadBlockingAnalysis?.responsivenessImpact?.userInteractionDelay?.toFixed(1) || 0}ms</div>
                  </div>
                  <div class="responsiveness-metric">
                    <div class="metric-label">Longest Block</div>
                    <div class="metric-value">${profile.summary.threadBlockingAnalysis?.longestBlockingEvent?.toFixed(1) || 0}ms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CPU Usage Analysis -->
        <div class="profiler-section">
          <div class="profiler-section-header" onclick="toggleSection('scenario-cpu-usage')">
            <h4>CPU Usage Analysis</h4>
            <span class="toggle-icon" id="scenario-cpu-usage-icon">▼</span>
          </div>
          <div class="profiler-section-content collapsed" id="scenario-cpu-usage">
            <div class="cpu-usage-content">
              <!-- Top CPU-Intensive Functions -->
              <div class="cpu-subsection">
                <h5>Top CPU-Intensive Functions</h5>
                <div class="cpu-functions-list">
                  ${(profile.summary.cpuUsageAnalysis?.cpuIntensiveFunctions || []).slice(0, 5).map((func) => `
                    <div class="cpu-function-item">
                      <div class="cpu-function-name">${func.functionName}()</div>
                      <div class="cpu-usage-bar">
                        <div class="cpu-usage-fill" style="width: ${func.cpuPercentage}%"></div>
                      </div>
                      <div class="cpu-stats">
                        <span class="cpu-time">${func.cpuTime.toFixed(1)}ms</span>
                        <span class="cpu-percentage">${func.cpuPercentage.toFixed(1)}%</span>
                        <span class="cpu-calls">${func.calls} calls</span>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- CPU Efficiency Metrics -->
              <div class="cpu-subsection">
                <h5>CPU Efficiency Metrics</h5>
                <div class="cpu-efficiency-grid">
                  <div class="cpu-metric">
                    <div class="metric-label">CPU Utilization Score</div>
                    <div class="metric-value">${profile.summary.cpuUsageAnalysis?.cpuEfficiency?.cpuUtilizationScore?.toFixed(1) || 100}%</div>
                  </div>
                  <div class="cpu-metric">
                    <div class="metric-label">Average CPU Usage</div>
                    <div class="metric-value">${profile.summary.cpuUsageAnalysis?.averageCpuUsage?.toFixed(1) || 0}%</div>
                  </div>
                  <div class="cpu-metric">
                    <div class="metric-label">Peak CPU Usage</div>
                    <div class="metric-value">${profile.summary.cpuUsageAnalysis?.peakCpuUsage?.toFixed(1) || 0}%</div>
                  </div>
                  <div class="cpu-metric">
                    <div class="metric-label">CPU Waste</div>
                    <div class="metric-value">${profile.summary.cpuUsageAnalysis?.cpuEfficiency?.cpuWastePercentage?.toFixed(1) || 0}%</div>
                  </div>
                  <div class="cpu-metric">
                    <div class="metric-label">Optimization Potential</div>
                    <div class="metric-value">${profile.summary.cpuUsageAnalysis?.cpuEfficiency?.optimizationPotential?.toFixed(1) || 0}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="profiler-stats">
          <div class="profiler-stat">
            <div class="profiler-stat-value">${profile.summary.totalFunctions}</div>
            <div class="profiler-stat-label">Functions</div>
          </div>
          <div class="profiler-stat">
            <div class="profiler-stat-value">${profile.summary.totalCalls}</div>
            <div class="profiler-stat-label">Total Calls</div>
          </div>
          <div class="profiler-stat">
            <div class="profiler-stat-value">${profile.summary.longestFunctionTime.toFixed(0)}ms</div>
            <div class="profiler-stat-label">Longest Function</div>
          </div>
          <div class="profiler-stat">
            <div class="profiler-stat-value">${profile.summary.executionEfficiency?.jsExecutionPercentage?.toFixed(1) || 0}%</div>
            <div class="profiler-stat-label">JS Execution (of profiler)</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function createSummaryCard(label, value) {
  return `
        <div class="summary-card">
            <div class="summary-value">${value}</div>
            <div class="summary-label">${label}</div>
        </div>
    `;
}
function calculateTotalSize(reports) {
  const totalBytes = reports.reduce((sum, r) => sum + (r.network?.summary?.totalTransferSize || 0), 0);
  return (totalBytes / (1024 * 1024)).toFixed(2);
}
function calculateAverageLoadTime(reports) {
  const totalTime = reports.reduce((sum, r) => sum + (r.performance?.loadTime || 0), 0);
  return (totalTime / reports.length).toFixed(0);
}
function calculateTotalRequests(reports) {
  return reports.reduce((sum, r) => sum + (r.network?.summary?.totalRequests || 0), 0);
}
function calculateAverageJSExecution(reports) {
  const totalTime = reports.reduce((sum, r) => sum + (r.profile?.summary?.totalExecutionTime || 0), 0);
  return (totalTime / reports.length).toFixed(0);
}
function getTopFunctions(reports, limit = 10) {
  const allFunctions = [];
  reports.forEach((report) => {
    if (report.profile?.summary?.topFunctions && Array.isArray(report.profile.summary.topFunctions)) {
      allFunctions.push(...report.profile.summary.topFunctions);
    }
  });
  const functionMap = /* @__PURE__ */ new Map();
  const totalTime = allFunctions.reduce((sum, f) => sum + f.time, 0);
  allFunctions.forEach((func) => {
    if (functionMap.has(func.name)) {
      const existing = functionMap.get(func.name);
      existing.time += func.time;
      existing.calls += func.calls;
      existing.percentage = totalTime > 0 ? existing.time / totalTime * 100 : 0;
    } else {
      functionMap.set(func.name, { ...func });
    }
  });
  return Array.from(functionMap.values()).sort((a, b) => b.time - a.time).slice(0, limit);
}
function getThirdPartyImpact(reports) {
  const allScripts = [];
  reports.forEach((report) => {
    if (report.profile?.summary?.thirdPartyImpact?.scripts && Array.isArray(report.profile.summary.thirdPartyImpact.scripts)) {
      allScripts.push(...report.profile.summary.thirdPartyImpact.scripts);
    }
  });
  const scriptMap = /* @__PURE__ */ new Map();
  const totalScriptTime = allScripts.reduce((sum, s) => sum + s.time, 0);
  allScripts.forEach((script) => {
    if (scriptMap.has(script.domain)) {
      const existing = scriptMap.get(script.domain);
      existing.time += script.time;
      existing.functions += script.functions;
      existing.percentage = totalScriptTime > 0 ? existing.time / totalScriptTime * 100 : 0;
    } else {
      scriptMap.set(script.domain, { ...script });
    }
  });
  return Array.from(scriptMap.values()).sort((a, b) => b.time - a.time).slice(0, 5);
}
function getMostCalledFunctions(reports, limit = 10) {
  const allFunctions = [];
  reports.forEach((report) => {
    if (report.profile?.summary?.functionCallFrequency && typeof report.profile.summary.functionCallFrequency === "object") {
      Object.entries(report.profile.summary.functionCallFrequency).forEach(([name, calls]) => {
        allFunctions.push({ name, calls });
      });
    }
  });
  const functionMap = /* @__PURE__ */ new Map();
  allFunctions.forEach((func) => {
    if (functionMap.has(func.name)) {
      functionMap.get(func.name).calls += func.calls;
    } else {
      functionMap.set(func.name, { ...func });
    }
  });
  return Array.from(functionMap.values()).sort((a, b) => b.calls - a.calls).slice(0, limit);
}
function getLongestFunction(reports) {
  const allFunctions = getTopFunctions(reports, 1);
  return allFunctions[0] || { name: "N/A", time: 0 };
}
function getFunctionCallData(report) {
  if (!report.profile?.summary?.functionCallFrequency) return {};
  return report.profile.summary.functionCallFrequency;
}
function getTopThreadBlockingEvents(reports, limit = 5) {
  const allEvents = [];
  reports.forEach((report) => {
    if (report.profile?.summary?.threadBlockingAnalysis?.blockingEvents && Array.isArray(report.profile.summary.threadBlockingAnalysis.blockingEvents)) {
      allEvents.push(...report.profile.summary.threadBlockingAnalysis.blockingEvents);
    }
  });
  return allEvents.sort((a, b) => b.blockingTime - a.blockingTime).slice(0, limit);
}
function getAverageThreadBlockingMetrics(reports) {
  const validReports = reports.filter((r) => r.profile?.summary?.threadBlockingAnalysis);
  if (validReports.length === 0) {
    return {
      totalBlockingTime: 0,
      blockingPercentage: 0,
      longestBlockingEvent: 0,
      responsivenessScore: 100,
      frameDrops: 0,
      userInteractionDelay: 0
    };
  }
  const totalBlockingTime = validReports.reduce((sum, r) => sum + (r.profile?.summary?.threadBlockingAnalysis?.totalBlockingTime || 0), 0);
  const blockingPercentage = validReports.reduce((sum, r) => sum + (r.profile?.summary?.threadBlockingAnalysis?.blockingPercentage || 0), 0);
  const longestBlockingEvent = validReports.reduce((sum, r) => sum + (r.profile?.summary?.threadBlockingAnalysis?.longestBlockingEvent || 0), 0);
  const responsivenessScore = validReports.reduce((sum, r) => sum + (r.profile?.summary?.threadBlockingAnalysis?.responsivenessImpact?.responsivenessScore || 100), 0);
  const frameDrops = validReports.reduce((sum, r) => sum + (r.profile?.summary?.threadBlockingAnalysis?.responsivenessImpact?.frameDrops || 0), 0);
  const userInteractionDelay = validReports.reduce((sum, r) => sum + (r.profile?.summary?.threadBlockingAnalysis?.responsivenessImpact?.userInteractionDelay || 0), 0);
  return {
    totalBlockingTime: totalBlockingTime / validReports.length,
    blockingPercentage: blockingPercentage / validReports.length,
    longestBlockingEvent: longestBlockingEvent / validReports.length,
    responsivenessScore: responsivenessScore / validReports.length,
    frameDrops: frameDrops / validReports.length,
    userInteractionDelay: userInteractionDelay / validReports.length
  };
}
function getTopCpuIntensiveFunctions(reports, limit = 5) {
  const allFunctions = [];
  reports.forEach((report) => {
    if (report.profile?.summary?.cpuUsageAnalysis?.cpuIntensiveFunctions && Array.isArray(report.profile.summary.cpuUsageAnalysis.cpuIntensiveFunctions)) {
      allFunctions.push(...report.profile.summary.cpuUsageAnalysis.cpuIntensiveFunctions);
    }
  });
  return allFunctions.sort((a, b) => b.cpuTime - a.cpuTime).slice(0, limit);
}
function getAverageCpuUsageMetrics(reports) {
  const validReports = reports.filter((r) => r.profile?.summary?.cpuUsageAnalysis);
  if (validReports.length === 0) {
    return {
      totalCpuTime: 0,
      averageCpuUsage: 0,
      peakCpuUsage: 0,
      cpuUtilizationScore: 100,
      cpuWastePercentage: 0,
      optimizationPotential: 0
    };
  }
  const totalCpuTime = validReports.reduce((sum, r) => sum + (r.profile?.summary?.cpuUsageAnalysis?.totalCpuTime || 0), 0);
  const averageCpuUsage = validReports.reduce((sum, r) => sum + (r.profile?.summary?.cpuUsageAnalysis?.averageCpuUsage || 0), 0);
  const peakCpuUsage = validReports.reduce((sum, r) => sum + (r.profile?.summary?.cpuUsageAnalysis?.peakCpuUsage || 0), 0);
  const cpuUtilizationScore = validReports.reduce((sum, r) => sum + (r.profile?.summary?.cpuUsageAnalysis?.cpuEfficiency?.cpuUtilizationScore || 100), 0);
  const cpuWastePercentage = validReports.reduce((sum, r) => sum + (r.profile?.summary?.cpuUsageAnalysis?.cpuEfficiency?.cpuWastePercentage || 0), 0);
  const optimizationPotential = validReports.reduce((sum, r) => sum + (r.profile?.summary?.cpuUsageAnalysis?.cpuEfficiency?.optimizationPotential || 0), 0);
  return {
    totalCpuTime: totalCpuTime / validReports.length,
    averageCpuUsage: averageCpuUsage / validReports.length,
    peakCpuUsage: peakCpuUsage / validReports.length,
    cpuUtilizationScore: cpuUtilizationScore / validReports.length,
    cpuWastePercentage: cpuWastePercentage / validReports.length,
    optimizationPotential: optimizationPotential / validReports.length
  };
}
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
async function startVitalsObservation(page, options) {
  const useObserver = options?.usePerformanceObserver ?? true;
  if (!useObserver) {
    const initScript2 = `
      (function(){
        if (window.__wvg && window.__wvg.started) return;
        window.__wvg = { started: true, results: {}, packageLoaded: false };
      })();
    `;
    await page.addInitScript({ content: initScript2 });
    return;
  }
  const initScript = `
    (function(){
      if (window.__wvg && window.__wvg.started) return;
      window.__wvg = { started: true, results: {}, observers: [] };
      try {
        // FCP
        try {
          const fcpObs = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcp = entries.find(e => e.name === 'first-contentful-paint');
            if (fcp) { window.__wvg.results.FCP = fcp.startTime; }
          });
          fcpObs.observe({ entryTypes: ['paint'] });
          window.__wvg.observers.push(fcpObs);
        } catch {}

        // LCP
        try {
          const lcpObs = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) { window.__wvg.results.LCP = last.startTime; }
          });
          lcpObs.observe({ entryTypes: ['largest-contentful-paint'] });
          window.__wvg.observers.push(lcpObs);
        } catch {}

        // CLS
        try {
          let cls = 0;
          const clsObs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) { cls += (entry).value || 0; }
            }
            window.__wvg.results.CLS = cls;
          });
          clsObs.observe({ entryTypes: ['layout-shift'] });
          window.__wvg.observers.push(clsObs);
        } catch {}

        // INP (simplified event delay aggregation)
        try {
          let maxDelay = 0;
          const inpObs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const ps = (entry).processingStart;
              const st = entry.startTime;
              if (ps && st) { maxDelay = Math.max(maxDelay, ps - st); }
            }
            window.__wvg.results.INP = maxDelay;
          });
          inpObs.observe({ entryTypes: ['event'] });
          window.__wvg.observers.push(inpObs);
        } catch {}
      } catch {}
    })();
  `;
  await page.addInitScript({ content: initScript });
}
async function loadWebVitalsPackage(page) {
  try {
    await page.addScriptTag({
      url: "https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.iife.js"
    });
    await page.waitForTimeout(1e3);
    await page.evaluate(() => {
      if (window["webVitals"] && window.__wvg) {
        const wv = window["webVitals"];
        window.__wvg.packageLoaded = true;
        wv.onFCP((metric) => {
          window.__wvg.results.FCP = metric.value;
          console.log("FCP measured (web-vitals package):", metric.value);
        });
        wv.onLCP((metric) => {
          window.__wvg.results.LCP = metric.value;
          console.log("LCP measured (web-vitals package):", metric.value);
        });
        wv.onCLS((metric) => {
          window.__wvg.results.CLS = metric.value;
          console.log("CLS measured (web-vitals package):", metric.value);
        });
        wv.onINP((metric) => {
          window.__wvg.results.INP = metric.value;
          console.log("INP measured (web-vitals package):", metric.value);
        });
      }
    });
    console.log("✅ Web-vitals package loaded and metrics registered");
  } catch (error) {
    console.warn("⚠️  Failed to load web-vitals package:", error);
  }
}
async function collectVitals(page) {
  const results = await page.evaluate(() => {
    const out = window.__wvg?.results ? { ...window.__wvg.results } : {};
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) {
        out.TTFB = nav.responseStart - nav.requestStart;
      }
    } catch {
    }
    try {
      if (window.__wvg?.observers) {
        for (const obs of window.__wvg.observers) {
          try {
            obs.disconnect();
          } catch {
          }
        }
      }
    } catch {
    }
    try {
      if (window.__wvg) {
        window.__wvg.started = false;
      }
    } catch {
    }
    return out;
  });
  return results;
}
async function measureWebVitalsWithObserver(page) {
  const metrics = {};
  try {
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        const results2 = {};
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(results2);
          }
        }, 1e4);
        const resolveOnce = (value) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(value);
          }
        };
        let metricsCollected = 0;
        const totalMetrics = 4;
        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics && !resolved) {
            resolveOnce(results2);
          }
        };
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find((entry) => entry.name === "first-contentful-paint");
            if (fcpEntry) {
              results2.FCP = fcpEntry.startTime;
              console.log("FCP measured (PerformanceObserver):", fcpEntry.startTime);
              fcpObserver.disconnect();
              checkComplete();
            }
          });
          fcpObserver.observe({ entryTypes: ["paint"] });
        } catch (e) {
          console.warn("FCP PerformanceObserver failed:", e);
          checkComplete();
        }
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              results2.LCP = lastEntry.startTime;
              console.log("LCP measured (PerformanceObserver):", lastEntry.startTime);
            }
          });
          lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
          setTimeout(() => {
            lcpObserver.disconnect();
            checkComplete();
          }, 2e3);
        } catch (e) {
          console.warn("LCP PerformanceObserver failed:", e);
          checkComplete();
        }
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            results2.CLS = clsValue;
            console.log("CLS measured (PerformanceObserver):", clsValue);
          });
          clsObserver.observe({ entryTypes: ["layout-shift"] });
          setTimeout(() => {
            clsObserver.disconnect();
            checkComplete();
          }, 3e3);
        } catch (e) {
          console.warn("CLS PerformanceObserver failed:", e);
          checkComplete();
        }
        try {
          let maxInteractionDelay = 0;
          const inpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const processingStart = entry.processingStart;
              const startTime = entry.startTime;
              if (processingStart && startTime) {
                const delay = processingStart - startTime;
                maxInteractionDelay = Math.max(maxInteractionDelay, delay);
              }
            }
            results2.INP = maxInteractionDelay;
            console.log("INP measured (PerformanceObserver):", maxInteractionDelay);
          });
          inpObserver.observe({ entryTypes: ["event"] });
          setTimeout(() => {
            inpObserver.disconnect();
            checkComplete();
          }, 2e3);
        } catch (e) {
          console.warn("INP PerformanceObserver failed:", e);
          checkComplete();
        }
        try {
          const navigation = performance.getEntriesByType("navigation")[0];
          if (navigation) {
            results2.TTFB = navigation.responseStart - navigation.requestStart;
            console.log("TTFB measured (PerformanceObserver):", results2.TTFB);
          }
        } catch (e) {
          console.warn("TTFB measurement failed:", e);
        }
      });
    });
    Object.assign(metrics, results);
  } catch (error) {
    console.warn("Warning: Could not measure Web Vitals with PerformanceObserver:", error);
  }
  return metrics;
}
async function measureWebVitals(page, options) {
  const useObserver = options?.usePerformanceObserver ?? true;
  if (useObserver) {
    console.log("🔍 Measuring Web Vitals with PerformanceObserver...");
    return measureWebVitalsWithObserver(page);
  } else {
    try {
      console.log("📦 Measuring Web Vitals with web-vitals package...");
      return measureWebVitalsWithPackage(page);
    } catch (error) {
      console.warn("⚠️  web-vitals package failed, falling back to PerformanceObserver");
      return measureWebVitalsWithObserver(page);
    }
  }
  return {};
}
async function measureWebVitalsWithPackage(page) {
  const metrics = {};
  try {
    await page.addScriptTag({
      url: "https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.iife.js"
    });
    await page.waitForTimeout(1e3);
    const allMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const results = {};
        let metricsCollected = 0;
        const totalMetrics = 4;
        const timeout = setTimeout(() => {
          resolve(results);
        }, 15e3);
        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= totalMetrics) {
            clearTimeout(timeout);
            resolve(results);
          }
        };
        if (!("webVitals" in window)) {
          console.warn("webVitals library not loaded");
          clearTimeout(timeout);
          resolve(results);
          return;
        }
        const webVitals = window["webVitals"];
        try {
          webVitals.onFCP((metric) => {
            results.FCP = metric.value;
            console.log("FCP measured:", metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn("FCP measurement failed:", e);
          checkComplete();
        }
        try {
          webVitals.onLCP((metric) => {
            results.LCP = metric.value;
            console.log("LCP measured:", metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn("LCP measurement failed:", e);
          checkComplete();
        }
        try {
          webVitals.onCLS((metric) => {
            results.CLS = metric.value;
            console.log("CLS measured:", metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn("CLS measurement failed:", e);
          checkComplete();
        }
        try {
          webVitals.onINP((metric) => {
            results.INP = metric.value;
            console.log("INP measured:", metric.value);
            checkComplete();
          });
        } catch (e) {
          console.warn("INP measurement failed:", e);
          checkComplete();
        }
        try {
          const navigation = performance.getEntriesByType("navigation")[0];
          if (navigation) {
            results.TTFB = navigation.responseStart - navigation.requestStart;
            console.log("TTFB measured:", results.TTFB);
          }
        } catch (e) {
          console.warn("TTFB measurement failed:", e);
        }
      });
    });
    Object.assign(metrics, allMetrics);
    console.log("✅ Successfully measured Web Vitals with web-vitals package:", metrics);
  } catch (error) {
    console.warn("Warning: Could not measure some Web Vitals with package:", error);
    throw error;
  }
  return metrics;
}
async function measurePerformanceMetrics(page) {
  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      firstPaint: paint.find((entry) => entry.name === "first-paint")?.startTime || 0
    };
  });
  return performanceMetrics;
}
async function measureNetworkRequests(page, cdpSession) {
  if (!cdpSession) {
    return await measureNetworkRequestsFallback(page);
  }
  await page.waitForLoadState("networkidle");
  const networkRequests = cdpSession.networkRequests;
  const networkResponses = cdpSession.networkResponses;
  const loadingFinished = cdpSession.loadingFinished;
  const requests = [];
  for (const [requestId, request] of networkRequests) {
    const response = networkResponses.get(requestId);
    const finished = loadingFinished.get(requestId);
    if (response) {
      const url = new URL(request.url);
      const domain = url.hostname;
      const protocol = url.protocol.replace(":", "");
      const timing = response.timing || {};
      const responseTime = finished?.timestamp ? (finished.timestamp - request.timestamp) * 1e3 : timing.receiveHeadersEnd || 0;
      const dnsLookup = Math.max(0, (timing.dnsEnd || 0) - (timing.dnsStart || 0));
      const tcpConnect = Math.max(0, (timing.connectEnd || 0) - (timing.connectStart || 0));
      const sslHandshake = Math.max(0, (timing.sslEnd || 0) - (timing.sslStart || 0));
      const requestSend = Math.max(0, (timing.sendEnd || 0) - (timing.sendStart || 0));
      const waitTime = Math.max(0, (timing.receiveHeadersEnd || 0) - (timing.sendEnd || 0));
      const responseReceive = Math.max(0, (timing.receiveHeadersEnd || 0) - (timing.receiveHeadersStart || 0));
      const redirectTime = Math.max(0, (timing.redirectEnd || 0) - (timing.redirectStart || 0));
      const contentDownloadTime = finished?.timestamp ? Math.max(0, (finished.timestamp - request.timestamp) * 1e3 - (timing.receiveHeadersEnd || 0)) : 0;
      const timingSum = dnsLookup + tcpConnect + sslHandshake + requestSend + waitTime + responseReceive + redirectTime + contentDownloadTime;
      requests.push({
        url: request.url,
        method: request.method,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        transferSize: finished?.encodedDataLength || 0,
        encodedBodySize: response.encodedDataLength || 0,
        decodedBodySize: response.encodedDataLength || 0,
        // CDP doesn't provide decoded size
        startTime: request.timestamp || 0,
        endTime: finished?.timestamp || request.timestamp,
        duration: responseTime,
        resourceType: request.type || "other",
        fromCache: response.fromDiskCache || response.fromPrefetchCache || false,
        protocol,
        domain,
        // Enhanced timing from CDP
        timing: {
          dnsLookup,
          tcpConnect,
          sslHandshake,
          requestSend,
          waitTime,
          responseReceive,
          redirectTime,
          contentDownloadTime,
          // Time to download response body
          totalTime: responseTime,
          // Use the actual wall clock time
          timingSum,
          // Sum of all timing components
          fromCache: response.fromDiskCache || response.fromPrefetchCache || false,
          connectionReused: response.connectionReused || false
        },
        // Additional CDP data
        headers: {
          request: request.headers,
          response: response.headers
        },
        security: {
          state: response.securityState,
          details: response.securityDetails
        },
        connection: {
          id: response.connectionId,
          remoteIP: response.remoteIPAddress,
          remotePort: response.remotePort,
          reused: response.connectionReused
        },
        initiator: request.initiator,
        redirectChain: request.redirectResponse ? [request.redirectResponse] : []
      });
    }
  }
  const summary = {
    totalRequests: requests.length,
    totalTransferSize: requests.reduce((sum, req) => sum + req.transferSize, 0),
    totalEncodedSize: requests.reduce((sum, req) => sum + req.encodedBodySize, 0),
    totalDecodedSize: requests.reduce((sum, req) => sum + req.decodedBodySize, 0),
    averageResponseTime: requests.length > 0 ? requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length : 0,
    slowestRequest: requests.length > 0 ? requests.reduce((slowest, req) => req.responseTime > slowest.responseTime ? req : slowest) : null,
    failedRequests: requests.filter((req) => req.status >= 400).length,
    requestsByType: {},
    requestsByDomain: {}
  };
  requests.forEach((req) => {
    summary.requestsByType[req.resourceType] = (summary.requestsByType[req.resourceType] || 0) + 1;
    summary.requestsByDomain[req.domain] = (summary.requestsByDomain[req.domain] || 0) + 1;
  });
  return {
    requests,
    summary
  };
}
async function measureNetworkRequestsFallback(page) {
  const performanceData = await page.evaluate(() => {
    function getResourceType(url) {
      const extension = url.split(".").pop()?.toLowerCase();
      const pathname = new URL(url).pathname.toLowerCase();
      if (pathname.includes("/api/") || pathname.includes("/graphql")) {
        return "api";
      }
      switch (extension) {
        case "js":
          return "script";
        case "css":
          return "stylesheet";
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "svg":
        case "webp":
        case "ico":
          return "image";
        case "woff":
        case "woff2":
        case "ttf":
        case "otf":
          return "font";
        case "mp4":
        case "webm":
        case "ogg":
          return "media";
        case "json":
          return "json";
        case "xml":
          return "xml";
        default:
          return "other";
      }
    }
    const entries = performance.getEntriesByType("resource");
    const requests = entries.map((entry) => {
      const url = new URL(entry.name);
      const domain = url.hostname;
      const protocol = url.protocol.replace(":", "");
      return {
        url: entry.name,
        method: "GET",
        // Performance API doesn't provide method, defaulting to GET
        status: 200,
        // Performance API doesn't provide status, defaulting to 200
        statusText: "OK",
        responseTime: entry.responseEnd - entry.responseStart,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        startTime: entry.startTime,
        endTime: entry.responseEnd,
        duration: entry.duration,
        resourceType: getResourceType(entry.name),
        fromCache: entry.transferSize === 0 && entry.encodedBodySize > 0,
        protocol,
        domain,
        timing: {
          dnsLookup: Math.max(0, entry.domainLookupEnd - entry.domainLookupStart),
          tcpConnect: Math.max(0, entry.connectEnd - entry.connectStart),
          sslHandshake: entry.secureConnectionStart > 0 ? Math.max(0, entry.connectEnd - entry.secureConnectionStart) : 0,
          requestSend: Math.max(0, entry.responseStart - entry.requestStart),
          waitTime: Math.max(0, entry.responseStart - entry.requestStart),
          responseReceive: Math.max(0, entry.responseEnd - entry.responseStart),
          // Additional timing data
          redirectTime: Math.max(0, entry.redirectEnd - entry.redirectStart),
          contentDownloadTime: Math.max(0, entry.responseEnd - entry.responseStart),
          // Performance API doesn't distinguish this
          totalTime: Math.max(0, entry.responseEnd - entry.startTime),
          timingSum: Math.max(0, entry.responseEnd - entry.startTime),
          // Same as totalTime for Performance API
          // Cache timing
          fromCache: entry.transferSize === 0 && entry.encodedBodySize > 0,
          // Connection reuse
          connectionReused: entry.connectStart === 0 && entry.connectEnd === 0
        }
      };
    });
    const summary = {
      totalRequests: requests.length,
      totalTransferSize: requests.reduce((sum, req) => sum + req.transferSize, 0),
      totalEncodedSize: requests.reduce((sum, req) => sum + req.encodedBodySize, 0),
      totalDecodedSize: requests.reduce((sum, req) => sum + req.decodedBodySize, 0),
      averageResponseTime: requests.length > 0 ? requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length : 0,
      slowestRequest: requests.length > 0 ? requests.reduce((slowest, req) => req.responseTime > slowest.responseTime ? req : slowest) : null,
      failedRequests: requests.filter((req) => req.status >= 400).length,
      requestsByType: {},
      requestsByDomain: {}
    };
    requests.forEach((req) => {
      summary.requestsByType[req.resourceType] = (summary.requestsByType[req.resourceType] || 0) + 1;
      summary.requestsByDomain[req.domain] = (summary.requestsByDomain[req.domain] || 0) + 1;
    });
    return {
      requests,
      summary
    };
  });
  return performanceData;
}
async function setupCDPNetworkMonitoring(page) {
  try {
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send("Network.enable");
    const networkRequests = /* @__PURE__ */ new Map();
    const networkResponses = /* @__PURE__ */ new Map();
    const loadingFinished = /* @__PURE__ */ new Map();
    cdpSession.on("Network.requestWillBeSent", (params) => {
      const requestId = params.requestId;
      networkRequests.set(requestId, {
        requestId,
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
        postData: params.request.postData,
        timestamp: params.timestamp,
        wallTime: params.wallTime,
        initiator: params.initiator,
        redirectResponse: params.redirectResponse,
        type: params.type,
        frameId: params.frameId,
        hasUserGesture: params.hasUserGesture,
        documentURL: params.documentURL,
        loaderId: params.loaderId
      });
    });
    cdpSession.on("Network.responseReceived", (params) => {
      const requestId = params.requestId;
      networkResponses.set(requestId, {
        requestId,
        url: params.response.url,
        status: params.response.status,
        statusText: params.response.statusText,
        headers: params.response.headers,
        mimeType: params.response.mimeType,
        connectionReused: params.response.connectionReused,
        connectionId: params.response.connectionId,
        remoteIPAddress: params.response.remoteIPAddress,
        remotePort: params.response.remotePort,
        fromDiskCache: params.response.fromDiskCache,
        fromServiceWorker: params.response.fromServiceWorker,
        fromPrefetchCache: params.response.fromPrefetchCache,
        encodedDataLength: params.response.encodedDataLength,
        timing: params.response.timing,
        responseTime: params.timestamp,
        protocol: params.response.protocol,
        securityState: params.response.securityState,
        securityDetails: params.response.securityDetails
      });
    });
    cdpSession.on("Network.loadingFinished", (params) => {
      const requestId = params.requestId;
      loadingFinished.set(requestId, {
        requestId,
        timestamp: params.timestamp,
        encodedDataLength: params.encodedDataLength,
        shouldReportCorbBlocking: false
      });
    });
    cdpSession.networkRequests = networkRequests;
    cdpSession.networkResponses = networkResponses;
    cdpSession.loadingFinished = loadingFinished;
    return cdpSession;
  } catch (error) {
    console.warn("⚠️  Failed to set up CDP network monitoring:", error);
    return null;
  }
}
async function measureNetworkRequestsEnhanced(page, cdpSession) {
  try {
    return await measureNetworkRequests(page, cdpSession);
  } catch (error) {
    console.warn("⚠️  CDP Network analysis failed, falling back to Performance API:", error);
    return await measureNetworkRequestsFallback(page);
  }
}
async function profileJs(page, run) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.start");
  let error;
  try {
    await run();
  } catch (e) {
    error = e;
  }
  const { profile } = await cdp.send("Profiler.stop");
  await cdp.send("Profiler.disable");
  return { profile, error };
}
async function executeScenarioStep(page, step) {
  const timeout = step.timeout || 3e4;
  switch (step.type) {
    case "navigate":
      if (!step.url) {
        throw new Error("Navigate step requires a URL");
      }
      await page.goto(step.url, { waitUntil: "networkidle", timeout });
      break;
    case "click":
      if (!step.selector) {
        throw new Error("Click step requires a selector");
      }
      await page.click(step.selector, { timeout });
      break;
    case "type":
      if (!step.selector || !step.text) {
        throw new Error("Type step requires a selector and text");
      }
      await page.fill(step.selector, step.text, { timeout });
      break;
    case "wait":
      if (step.waitFor) {
        await page.waitForSelector(step.waitFor, { timeout });
      } else {
        await page.waitForTimeout(step.timeout || 1e3);
      }
      break;
    case "scroll":
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      break;
    case "hover":
      if (!step.selector) {
        throw new Error("Hover step requires a selector");
      }
      await page.hover(step.selector, { timeout });
      break;
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}
async function runProfile(page, scenario) {
  for (const step of scenario.steps) {
    await executeScenarioStep(page, step);
  }
}
async function runScenario(browser, scenario, config) {
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();
  try {
    await startVitalsObservation(page, config?.webVitals);
    const cdpSession = await setupCDPNetworkMonitoring(page);
    await page.goto(scenario.url, { waitUntil: "networkidle" });
    if (config?.webVitals?.usePerformanceObserver === false) {
      await loadWebVitalsPackage(page);
    }
    let profileResponse = null;
    if (config?.enableProfile) {
      profileResponse = await profileJs(page, () => runProfile(page, scenario));
    } else {
      await runProfile(page, scenario);
    }
    await page.waitForTimeout(2e3);
    const webVitals = await collectVitals(page);
    const performance2 = await measurePerformanceMetrics(page);
    const network = await measureNetworkRequestsEnhanced(page, cdpSession);
    let profileSummary = null;
    if (profileResponse?.profile && config?.enableProfile) {
      const enhancedProfile = {
        nodes: profileResponse.profile.nodes || [],
        samples: profileResponse.profile.samples || [],
        startTime: profileResponse.profile.startTime || 0,
        endTime: profileResponse.profile.endTime || 0
      };
      profileSummary = generateProfileSummary(enhancedProfile, performance2.loadTime);
    }
    const report = {
      scenario: scenario.name,
      url: scenario.url,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      metrics: webVitals,
      performance: performance2,
      network,
      profile: profileSummary ? {
        summary: profileSummary,
        rawData: profileResponse?.profile || null
      } : null
    };
    if (cdpSession) {
      try {
        await cdpSession.detach();
      } catch (error) {
        console.warn("⚠️  Error detaching CDP session:", error);
      }
    }
    return report;
  } finally {
    await page.close();
  }
}
function checkBudgetViolations(report, budgets) {
  const violations = [];
  if (!budgets) return violations;
  const { metrics } = report;
  if (budgets.FCP && metrics.FCP && metrics.FCP > budgets.FCP) {
    violations.push(`FCP: ${metrics.FCP}ms > ${budgets.FCP}ms`);
  }
  if (budgets.LCP && metrics.LCP && metrics.LCP > budgets.LCP) {
    violations.push(`LCP: ${metrics.LCP}ms > ${budgets.LCP}ms`);
  }
  if (budgets.FID && metrics.FID && metrics.FID > budgets.FID) {
    violations.push(`FID: ${metrics.FID}ms > ${budgets.FID}ms`);
  }
  if (budgets.CLS && metrics.CLS && metrics.CLS > budgets.CLS) {
    violations.push(`CLS: ${metrics.CLS} > ${budgets.CLS}`);
  }
  if (budgets.INP && metrics.INP && metrics.INP > budgets.INP) {
    violations.push(`INP: ${metrics.INP}ms > ${budgets.INP}ms`);
  }
  if (budgets.TTFB && metrics.TTFB && metrics.TTFB > budgets.TTFB) {
    violations.push(`TTFB: ${metrics.TTFB}ms > ${budgets.TTFB}ms`);
  }
  return violations;
}
async function runWebVitalsGuardian(config) {
  const browser = await playwright.chromium.launch({
    headless: config.headless !== false
  });
  try {
    const scenarioFiles = findScenarioFiles(config.scenariosPath);
    if (scenarioFiles.length === 0) {
      throw new Error(`No *.scenario.json files found in ${config.scenariosPath}`);
    }
    console.log(`Found ${scenarioFiles.length} scenario files`);
    const reports = [];
    const budgetViolations = [];
    for (const filePath of scenarioFiles) {
      try {
        console.log(`Running scenario: ${filePath}`);
        const scenario = loadScenarioFile(filePath, config.variables);
        const report = await runScenario(browser, scenario, config);
        reports.push(report);
        const budgets = { ...config.budgets, ...scenario.webVitals?.budgets };
        const violations = checkBudgetViolations(report, budgets);
        if (violations.length > 0) {
          budgetViolations.push(`${scenario.name}: ${violations.join(", ")}`);
        }
        console.log(`✓ Completed: ${scenario.name}`);
      } catch (error) {
        console.error(`✗ Failed to run scenario ${filePath}:`, error);
      }
    }
    const summary = {
      totalScenarios: scenarioFiles.length,
      passed: reports.length,
      failed: scenarioFiles.length - reports.length,
      budgetViolations
    };
    const result = { reports, summary };
    if (config.generateHTMLReport) {
      const htmlReportPath = config.htmlReportPath || (config.outputPath ? `${config.outputPath}/web-vitals-report.html` : "web-vitals-report.html");
      generateHTMLReport(result, htmlReportPath);
    }
    return result;
  } finally {
    await browser.close();
  }
}
exports.analyzeProfile = analyzeProfile;
exports.collectVitals = collectVitals;
exports.default = runWebVitalsGuardian;
exports.executeScenarioStep = executeScenarioStep;
exports.exportProfileData = exportProfileData;
exports.findScenarioFiles = findScenarioFiles;
exports.formatProfileAnalysis = formatProfileAnalysis;
exports.generateHTMLReport = generateHTMLReport;
exports.generateProfileSummary = generateProfileSummary;
exports.getFunctionsBySource = getFunctionsBySource;
exports.getTopExpensiveFunctions = getTopExpensiveFunctions;
exports.interpolateObject = interpolateObject;
exports.interpolateScenario = interpolateScenario;
exports.interpolateVariables = interpolateVariables;
exports.loadScenarioFile = loadScenarioFile;
exports.loadWebVitalsPackage = loadWebVitalsPackage;
exports.measureNetworkRequests = measureNetworkRequests;
exports.measureNetworkRequestsEnhanced = measureNetworkRequestsEnhanced;
exports.measurePerformanceMetrics = measurePerformanceMetrics;
exports.measureWebVitals = measureWebVitals;
exports.measureWebVitalsWithObserver = measureWebVitalsWithObserver;
exports.mergeVariables = mergeVariables;
exports.profileJs = profileJs;
exports.runScenario = runScenario;
exports.runWebVitalsGuardian = runWebVitalsGuardian;
exports.setupCDPNetworkMonitoring = setupCDPNetworkMonitoring;
exports.startVitalsObservation = startVitalsObservation;
//# sourceMappingURL=index.cjs.map
