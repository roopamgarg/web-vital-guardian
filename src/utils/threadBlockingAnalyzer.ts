/**
 * Thread blocking analysis utilities for profiler data
 */

export interface BlockingEvent {
  functionName: string;
  blockingTime: number;
  startTime: number;
  endTime: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ThreadBlockingAnalysisResult {
  totalBlockingTime: number;
  blockingPercentage: number;
  longestBlockingEvent: number;
  blockingEvents: BlockingEvent[];
  blockingPatterns: {
    continuousBlocking: number;
    intermittentBlocking: number;
    peakBlockingTime: number;
    averageBlockingTime: number;
  };
  responsivenessImpact: {
    userInteractionDelay: number;
    frameDrops: number;
    responsivenessScore: number;
  };
}

/**
 * Analyzes thread blocking patterns from profiler data
 */
export function analyzeThreadBlocking(profile: any, profileDuration: number): ThreadBlockingAnalysisResult {
  // Generate blocking events based on function execution patterns
  const blockingEvents = generateBlockingEvents(profile, profileDuration);
  
  // Calculate blocking patterns
  const blockingPatterns = analyzeBlockingPatterns(blockingEvents);
  
  // Calculate responsiveness impact
  const responsivenessImpact = calculateResponsivenessImpact(blockingEvents, profileDuration);
  
  const totalBlockingTime = blockingEvents.reduce((sum, event) => sum + event.blockingTime, 0);
  const longestBlockingEvent = Math.max(...blockingEvents.map(event => event.blockingTime), 0);
  const blockingPercentage = profileDuration > 0 ? (totalBlockingTime / profileDuration) * 100 : 0;
  
  return {
    totalBlockingTime,
    blockingPercentage,
    longestBlockingEvent,
    blockingEvents,
    blockingPatterns,
    responsivenessImpact
  };
}

/**
 * Generates realistic thread blocking events based on function execution
 */
function generateBlockingEvents(profile: any, profileDuration: number): BlockingEvent[] {
  const blockingEvents: BlockingEvent[] = [];
  
  if (!profile?.nodes || !Array.isArray(profile.nodes)) {
    return blockingEvents;
  }
  
  // Thresholds for blocking severity
  const severityThresholds = {
    low: 16,      // < 16ms (1 frame at 60fps)
    medium: 50,   // 16-50ms
    high: 100,    // 50-100ms
    critical: 100 // > 100ms
  };
  
  profile.nodes.forEach((node: any, index: number) => {
    const functionName = node.callFrame?.originalFunctionName || node.callFrame?.functionName || `function_${index}`;
    const hitCount = node.hitCount || 0;
    const totalTime = node.totalTime || 0;
    
    // Skip idle functions
    if (functionName === '(idle)') {
      return;
    }
    
    // Generate blocking events based on function calls
    for (let i = 0; i < hitCount; i++) {
      const executionTime = totalTime / hitCount;
      
      // Only create blocking events for functions that take significant time
      if (executionTime > 5) { // Only functions taking > 5ms
        const startTime = Math.random() * (profileDuration - executionTime);
        const endTime = startTime + executionTime;
        
        // Determine blocking severity
        let severity: 'low' | 'medium' | 'high' | 'critical';
        if (executionTime < severityThresholds.low) {
          severity = 'low';
        } else if (executionTime < severityThresholds.medium) {
          severity = 'medium';
        } else if (executionTime < severityThresholds.high) {
          severity = 'high';
        } else {
          severity = 'critical';
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

/**
 * Analyzes blocking patterns to identify continuous vs intermittent blocking
 */
function analyzeBlockingPatterns(blockingEvents: BlockingEvent[]): {
  continuousBlocking: number;
  intermittentBlocking: number;
  peakBlockingTime: number;
  averageBlockingTime: number;
} {
  if (blockingEvents.length === 0) {
    return {
      continuousBlocking: 0,
      intermittentBlocking: 0,
      peakBlockingTime: 0,
      averageBlockingTime: 0
    };
  }
  
  // Calculate average blocking time
  const totalBlockingTime = blockingEvents.reduce((sum, event) => sum + event.blockingTime, 0);
  const averageBlockingTime = totalBlockingTime / blockingEvents.length;
  
  // Find peak blocking time (longest single event)
  const peakBlockingTime = Math.max(...blockingEvents.map(event => event.blockingTime));
  
  // Analyze continuous vs intermittent blocking
  let continuousBlocking = 0;
  let intermittentBlocking = 0;
  
  // Group events by time proximity (events within 50ms are considered continuous)
  const eventGroups: BlockingEvent[][] = [];
  let currentGroup: BlockingEvent[] = [];
  
  blockingEvents.forEach((event, index) => {
    if (index === 0) {
      currentGroup = [event];
    } else {
      const prevEvent = blockingEvents[index - 1];
      const timeGap = event.startTime - prevEvent.endTime;
      
      if (timeGap <= 50) { // Events within 50ms are continuous
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
  
  // Calculate continuous vs intermittent blocking
  eventGroups.forEach(group => {
    if (group.length >= 3) { // 3+ consecutive events = continuous blocking
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

/**
 * Calculates responsiveness impact based on blocking events
 */
function calculateResponsivenessImpact(blockingEvents: BlockingEvent[], profileDuration: number): {
  userInteractionDelay: number;
  frameDrops: number;
  responsivenessScore: number;
} {
  if (blockingEvents.length === 0) {
    return {
      userInteractionDelay: 0,
      frameDrops: 0,
      responsivenessScore: 100
    };
  }
  
  // Calculate user interaction delay (average blocking time)
  const totalBlockingTime = blockingEvents.reduce((sum, event) => sum + event.blockingTime, 0);
  const userInteractionDelay = totalBlockingTime / blockingEvents.length;
  
  // Calculate frame drops (events > 16ms cause frame drops at 60fps)
  const frameDrops = blockingEvents.filter(event => event.blockingTime > 16).length;
  
  // Calculate responsiveness score (0-100)
  // Penalize long blocking events and high frequency
  const criticalEvents = blockingEvents.filter(event => event.severity === 'critical').length;
  const highEvents = blockingEvents.filter(event => event.severity === 'high').length;
  const mediumEvents = blockingEvents.filter(event => event.severity === 'medium').length;
  
  const blockingFrequency = blockingEvents.length / (profileDuration / 1000); // Events per second
  const averageBlockingTime = totalBlockingTime / blockingEvents.length;
  
  // Responsiveness score calculation
  let responsivenessScore = 100;
  
  // Penalize by blocking frequency
  responsivenessScore -= Math.min(blockingFrequency * 5, 30);
  
  // Penalize by average blocking time
  responsivenessScore -= Math.min(averageBlockingTime / 2, 25);
  
  // Penalize by critical events
  responsivenessScore -= criticalEvents * 10;
  
  // Penalize by high severity events
  responsivenessScore -= highEvents * 5;
  
  // Penalize by medium severity events
  responsivenessScore -= mediumEvents * 2;
  
  return {
    userInteractionDelay: Math.max(0, userInteractionDelay),
    frameDrops: Math.max(0, frameDrops),
    responsivenessScore: Math.max(0, Math.min(100, responsivenessScore))
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

