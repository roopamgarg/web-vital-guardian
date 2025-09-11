# Examples

This folder contains various examples demonstrating how to use the Web Vitals Guardian library.

## Files

### Basic Usage
- **`example-usage.js`** - Basic usage example showing how to run the guardian
- **`example-modular-usage.js`** - Advanced example showing modular imports

### Scenario Files
- **`example.scenario.json`** - Sample scenario file demonstrating the format
- **`ecommerce-checkout.scenario.json`** - E-commerce checkout flow example
- **`blog-navigation.scenario.json`** - Blog navigation and reading example

### Advanced Examples
- **`performanceObserver.ts`** - Alternative Web Vitals measurement using PerformanceObserver
- **`custom-budgets.js`** - Example with custom performance budgets
- **`ci-integration.js`** - CI/CD integration example
- **`csp-safe-example.js`** - CSP-safe configuration for environments with Content Security Policy

## Quick Start

1. **Run a basic example:**
   ```bash
   node examples/example-usage.js
   ```

2. **Create your own scenario:**
   ```bash
   cp examples/example.scenario.json my-scenario.scenario.json
   # Edit my-scenario.scenario.json with your test case
   ```

3. **Use modular imports:**
   ```bash
   node examples/example-modular-usage.js
   ```

4. **Run CSP-safe example (for environments with Content Security Policy):**
   ```bash
   node examples/csp-safe-example.js
   ```

## Scenario File Format

See `example.scenario.json` for the basic format. Each scenario file should contain:

- `name`: Unique identifier
- `url`: Starting URL
- `steps`: Array of interaction steps
- `webVitals.budgets`: Optional performance budgets

## Performance Budgets

Set budgets to fail builds when metrics exceed thresholds:

```json
{
  "webVitals": {
    "budgets": {
      "FCP": 1800,  // 1.8 seconds
      "LCP": 2500,  // 2.5 seconds
      "CLS": 0.1,   // 0.1 layout shift score
      "INP": 200,   // 200ms interaction delay
      "TTFB": 600   // 600ms server response
    }
  }
}
```

## Supported Step Types

- `navigate` - Navigate to a URL
- `click` - Click an element
- `type` - Type text into an input
- `wait` - Wait for element or timeout
- `scroll` - Scroll the page
- `hover` - Hover over an element

See individual scenario files for examples of each step type.
