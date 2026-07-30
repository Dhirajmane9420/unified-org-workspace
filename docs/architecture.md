# System Architecture Diagram

This document defines the high-level system architecture of the Unified Organization Workspace, showing the connection between the identity layer, PostgreSQL/Prisma database, Redis session manager, and the two dashboard application contexts.

```mermaid
graph TD
    %% User/Client Interactions
    User[Client Browser / Desktop] -->|Auth Token & Org Header| Frontend[Frontend Hub / workspace-frontend]
    
    %% Dashboard Router Views
    subgraph Frontend [React Application Hub]
        Dash1[Dashboard 1: Support Hub]
        Dash2[Dashboard 2: Review Console]
        Flags[Feature Flags Panel]
        Sync[Workspace Switcher Context]
    end

    %% Backend Router API Handlers
    Frontend -->|API Requests| Gateway[Backend Gateway / workspace-backend]
    
    subgraph Gateway [Node.js / Express Backend]
        AuthGate[verifyToken Middleware]
        TenantGate[tenantGuard Middleware]
        RBAC[rbacGuard Middleware]
        
        AuthGate --> TenantGate
        TenantGate --> RBAC
        
        RBAC --> TicketsCtrl[Tickets Controller]
        RBAC --> PRsCtrl[PR & Webhook Controller]
        RBAC --> AuditCtrl[Audit timeline Controller]
        RBAC --> ConnCtrl[Connections Controller]
    end
    
    %% Shared Resources and Cache Databases
    subgraph Databases [Shared Data Tier]
        DB[(PostgreSQL Database via Prisma)]
        Redis[(Redis Cache / In-Memory Session Storage)]
    end

    %% Cache and Session Scopes
    Gateway -->|Verify Blacklist / Active Switch context| Redis
    TicketsCtrl -->|Isolated Queries / BOLA checks| DB
    PRsCtrl -->|Write versions / N-Approval gates| DB
    AuditCtrl -->|Fetch logs / Timeline filters| DB
    ConnCtrl -->|Validate partner mappings| DB
    
    %% Webhook streams
    Github[GitHub API Webhook] -->|PR Events / opened, synchronize, closed| PRsCtrl
    
    %% Background schedule workers
    subgraph Background [Background Processing Tier]
        Cron[node-cron Scheduler] -->|runDigestGenerationCycle| DigestWorker[Digest Generator]
        DigestWorker -->|Scoped queries| DB
        DigestWorker -->|Push in-app notification bell logs| DB
    end
```

---

## Architecture Components Description

1. **Frontend Hub (`workspace-frontend`)**:
   - Single-page application rendering both dashboards inside a unified layout.
   - Shares a central `WorkspaceContext` to orchestrate token checks and organization contexts.
   
2. **Backend Gateway (`workspace-backend`)**:
   - Handles the token validation and role context parameters (`ORG_ADMIN`, `SUPPORT_AGENT`, `REVIEWER`, `SUPER_ADMIN`).
   - Implements **BOLA (Broken Object Level Authorization)** protections directly in the controller queries.

3. **Shared PostgreSQL Database**:
   - Acts as the single source of truth for user credentials, memberships, tickets, pull requests, versions, connections, and audit trails.

4. **Redis Session Storage**:
   - Provides global session revocation checks (token blacklisting on logout) and live context switching state caches across instances.
