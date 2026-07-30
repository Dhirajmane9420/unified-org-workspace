# Known Limitations and Future Improvements

This document lists the limitations of the current design and details future expansion vectors.

---

## 1. Known Limitations

### Application-Level Multi-Tenancy (BOLA Defense)
- **Constraint**: Multi-tenant isolation is enforced at the backend query logic layer (checking active organization header match and shared item metrics). It is not enforced natively at the database layer (e.g., PostgreSQL Row-Level Security (RLS)).
- **Impact**: If a query bypasses this check in backend controllers, isolation could break. Rigorous automated testing is required to protect the API surface.

### In-Memory/Redis revocation sync
- **Constraint**: Revoking token signatures on logout pushes the tokens to a blacklist cache with a TTL matching the token lifespan.
- **Impact**: If the Redis container goes offline, the system falls back to a node-local in-memory Set. In scaled, multi-instance production environments, this would result in out-of-sync session blacklists across instances unless Redis is kept highly available.

### Cross-Org Mappings
- **Constraint**: The collaborative sharing implementation is presently structured around Ticket resource mappings (`SharedItem` schema). Cross-org sharing of Pull Request entities is not wired to the UI.
- **Impact**: Guests can only view and participate in shared ticket queues; they cannot review partner PRs.

### LLM Quotas & API Dependency
- **Constraint**: Background AI digests are run on a scheduled cron cadence. If the Gemini API hits a rate limit or service outage, the system degrades to a static mock status string.
- **Impact**: Users receive generic text reports until the API quotas clear.

---

## 2. Future Improvements

### PostgreSQL Row-Level Security (RLS)
- Implement database-native RLS using postgres policies. Associate database connections with organization IDs dynamically, moving multi-tenant isolation rules from Express controller checks directly down to the database query engine.

### Decoupled OAuth2/OIDC Identity Provider
- Decouple the authentication layer entirely. Implement a federated identity solution (using hydra, Keycloak, or Auth0) with single sign-on (SSO) support, allowing the Support Hub and Review Console to exist as independent domains while referencing a central token validation service.

### Direct File Upload Integrations
- Integrate the attachment upload handlers with a cloud storage provider (like Amazon S3 or Google Cloud Storage) to store binary assets securely with expiring signed access URLs, rather than relying on URL string references.

### Real-Time Pipeline Synchronizations
- Mount a WebSocket server (e.g., Socket.io) to push instant notifications and real-time diff revisions onto the Review Control Pipeline when webhook synchronizations or reviewer updates trigger on the backend, removing client pooling.
