---
"@wide-events/collector": minor
"@wide-events/internal": minor
"@wide-events/client": minor
"@wide-events/sdk": minor
---

dynamic span attributes now land in overflow first, the collector can promote stable keys into typed columns (with optional SDK annotate(..., { promote }) hints), structured queries stay on baseline plus promoted fields while overflow-only keys stay reachable via /sql, and the HTTP client returns clearer errors on failed responses
