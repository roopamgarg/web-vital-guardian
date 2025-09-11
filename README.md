# Web Vitals Guardian

A Node.js library that automatically runs user interaction scenarios and measures Web Vitals performance metrics using Playwright.

## Features

- 🔍 **Automatic Scenario Discovery**: Finds and runs all `*.scenario.json` files in a directory
- 🎭 **Playwright Integration**: Uses Playwright for reliable browser automation
- 📊 **Web Vitals Measurement**: Measures FCP, LCP, CLS, INP, TTFB, and other performance metrics
- 🎯 **Budget Enforcement**: Fails builds when performance budgets are exceeded
- 📝 **Detailed Reporting**: Generates comprehensive performance reports
- 🏗️ **Modular Architecture**: Clean, maintainable code structure with separated concerns

## Installation

```bash
npm install @roopamgarg/web-vitals-guardian
```

## Quick Start

1. **Check out the examples** in the `examples/` folder for complete working examples:
   ```bash
   # Run a basic example
   node examples/example-usage.js
   
   # Run with modular imports
   node examples/example-modular-usage.js
   
   # Run with custom budgets
   node examples/custom-budgets.js
   
   # Run CI integration example
   node examples/ci-integration.js
   ```

2. **Create scenario files** with the `.scenario.json` extension (see `examples/` for templates):

```json
{
  "name": "Homepage Performance Test",
  "description": "Test the homepage loading and basic interactions",
  "url": "https://example.com",
  "timeout": 30000,
  "steps": [
    {
      "type": "wait",
      "waitFor": "body",
      "timeout": 10000
    },
    {
      "type": "click",
      "selector": "a[href='/about']",
      "timeout": 5000
    },
    {
      "type": "wait",
      "timeout": 2000
    },
    {
      "type": "scroll"
    }
  ],
  "webVitals": {
    "budgets": {
      "FCP": 1800,
      "LCP": 2500,
      "CLS": 0.1,
      "INP": 200,
      "TTFB": 600
    }
  }
}
```

3. **Run the guardian**:

```javascript
import { runWebVitalsGuardian } from '@your-scope/inp-guardian';

const config = {
  scenariosPath: './scenarios',
  headless: true,
  budgets: {
    FCP: 1800,  // First Contentful Paint
    LCP: 2500,  // Largest Contentful Paint
    CLS: 0.1,   // Cumulative Layout Shift
    INP: 200,   // Interaction to Next Paint
    TTFB: 600   // Time to First Byte
  }
};

const result = await runWebVitalsGuardian(config);

console.log(`Passed: ${result.summary.passed}/${result.summary.totalScenarios}`);
if (result.summary.budgetViolations.length > 0) {
  console.log('Budget violations:', result.summary.budgetViolations);
}
```

## Scenario File Format

### Required Fields

- `name`: Unique identifier for the scenario
- `url`: Initial URL to navigate to
- `steps`: Array of interaction steps

### Optional Fields

- `description`: Human-readable description
- `timeout`: Global timeout for the scenario (default: 30000ms)
- `webVitals.budgets`: Performance budgets specific to this scenario

### Supported Step Types

#### `navigate`
Navigate to a different URL:
```json
{
  "type": "navigate",
  "url": "https://example.com/page",
  "timeout": 10000
}
```

#### `click`
Click on an element:
```json
{
  "type": "click",
  "selector": "button[data-testid='submit']",
  "timeout": 5000
}
```

#### `type`
Type text into an input field:
```json
{
  "type": "type",
  "selector": "input[name='email']",
  "text": "user@example.com",
  "timeout": 5000
}
```

#### `wait`
Wait for an element or timeout:
```json
{
  "type": "wait",
  "waitFor": ".loading-complete",
  "timeout": 10000
}
```

Or wait for a specific duration:
```json
{
  "type": "wait",
  "timeout": 2000
}
```

#### `scroll`
Scroll to the bottom of the page:
```json
{
  "type": "scroll"
}
```

#### `hover`
Hover over an element:
```json
{
  "type": "hover",
  "selector": ".dropdown-trigger",
  "timeout": 5000
}
```

## Configuration Options

### `GuardianConfig`

- `scenariosPath` (required): Directory path to scan for scenario files
- `outputPath` (optional): Directory to save reports
- `headless` (optional): Run browser in headless mode (default: true)
- `timeout` (optional): Global timeout for scenarios (default: 30000ms)
- `budgets` (optional): Global performance budgets
- `webVitals` (optional): Web Vitals measurement configuration
  - `usePerformanceObserver` (optional): Force using PerformanceObserver (CSP-safe, default: true)
  - `fallbackToPackage` (optional): Allow fallback to web-vitals package (default: false)

### CSP-Safe Configuration

For environments with Content Security Policy (CSP) that block external scripts:

```javascript
const config = {
  scenariosPath: './scenarios',
  headless: true,
  webVitals: {
    usePerformanceObserver: true,  // Use PerformanceObserver (CSP-safe)
    fallbackToPackage: false       // Disable external web-vitals package
  }
};
```

This configuration ensures no external scripts are loaded, making it compatible with strict CSP policies.

## Web Vitals Measured

- **FCP** (First Contentful Paint): Time until first content is painted
- **LCP** (Largest Contentful Paint): Time until largest content is painted
- **CLS** (Cumulative Layout Shift): Visual stability score
- **INP** (Interaction to Next Paint): Responsiveness to user interactions
- **TTFB** (Time to First Byte): Server response time

## Performance Budgets

Set performance budgets to fail builds when metrics exceed thresholds:

```javascript
const budgets = {
  FCP: 1800,  // 1.8 seconds
  LCP: 2500,  // 2.5 seconds
  CLS: 0.1,   // 0.1 layout shift score
  INP: 200,   // 200ms interaction delay
  TTFB: 600   // 600ms server response
};
```

## Examples

The `examples/` folder contains comprehensive examples:

- **`example-usage.js`** - Basic usage example
- **`example-modular-usage.js`** - Advanced modular imports
- **`example.scenario.json`** - Basic scenario template
- **`ecommerce-checkout.scenario.json`** - Complex e-commerce flow
- **`blog-navigation.scenario.json`** - Blog interaction example
- **`custom-budgets.js`** - Different budget configurations
- **`ci-integration.js`** - CI/CD pipeline integration
- **`csp-safe-example.js`** - CSP-safe configuration for Content Security Policy environments
- **`performanceObserver.ts`** - Alternative measurement approach

Run any example:
```bash
node examples/example-usage.js
```

## Integration with CI/CD

Add to your build pipeline to prevent performance regressions:

```json
{
  "scripts": {
    "test:performance": "node examples/ci-integration.js",
    "build": "npm run test:performance && npm run build:app"
  }
}
```

See `examples/ci-integration.js` for a complete CI/CD integration example with GitHub Actions.

## Architecture

The library is organized into a clean modular structure:

```
src/
├── types/           # TypeScript interfaces and type definitions
│   └── index.ts
├── utils/           # Utility functions
│   └── fileUtils.ts # File discovery and loading
├── measurements/    # Web Vitals measurement logic
│   └── webVitals.ts # Performance metrics collection
├── scenarios/       # Scenario execution
│   └── runner.ts    # Step execution and scenario running
├── guardian/        # Main guardian logic
│   ├── index.ts     # Main guardian function
│   └── budgetChecker.ts # Budget validation
└── index.ts         # Main exports
```

### Module Responsibilities

- **`types/`**: All TypeScript interfaces and type definitions
- **`utils/`**: File system operations and scenario file discovery
- **`measurements/`**: Web Vitals and performance metrics collection
- **`scenarios/`**: Scenario step execution and browser automation
- **`guardian/`**: Main orchestration logic and budget checking
- **`index.ts`**: Public API exports

## API Reference

### `runWebVitalsGuardian(config: GuardianConfig)`

Main function that runs all scenarios and returns performance reports.

**Returns:**
```typescript
{
  reports: WebVitalsReport[];
  summary: {
    totalScenarios: number;
    passed: number;
    failed: number;
    budgetViolations: string[];
  };
}
```

### `findScenarioFiles(directory: string): string[]`

Finds all `*.scenario.json` files in a directory recursively.

### `loadScenarioFile(filePath: string): ScenarioFile`

Loads and validates a scenario file.

### `measureWebVitals(page: Page): Promise<WebVitalsReport['metrics']>`

Measures Web Vitals metrics on a page.

### `executeScenarioStep(page: Page, step: ScenarioStep): Promise<void>`

Executes a single scenario step.

### `runScenario(browser: Browser, scenario: ScenarioFile): Promise<WebVitalsReport>`

Runs a complete scenario and measures Web Vitals.

## License

ISC
