# @wide-events/sdk

## 0.2.0

### Minor Changes

- c517b83: dynamic span attributes now land in overflow first, the collector can promote stable keys into typed columns (with optional SDK annotate(..., { promote }) hints), structured queries stay on baseline plus promoted fields while overflow-only keys stay reachable via /sql, and the HTTP client returns clearer errors on failed responses

### Patch Changes

- Updated dependencies [c517b83]
  - @wide-events/internal@0.2.0

## 0.1.1

### Patch Changes

- f2ebc5e: General optimizations/cleanup
- Updated dependencies [f2ebc5e]
  - @wide-events/internal@0.1.1
