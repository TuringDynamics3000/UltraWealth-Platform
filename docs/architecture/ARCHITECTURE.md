# UltraWealth Platform Architecture

This document provides a comprehensive overview of the UltraWealth Platform architecture, including system design, data flow, and integration patterns.

## System Context

The UltraWealth Platform operates as a visibility consolidation layer between users and their externally-held assets. It does not hold assets, execute transactions, or provide financial guidance.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           External Systems                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Banks   │  │ Brokers  │  │Registries│  │Custodians│  │ Platforms│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │             │             │             │             │        │
│       └─────────────┴─────────────┴─────────────┴─────────────┘        │
│                               │                                         │
│                               ▼                                         │
│                    ┌─────────────────────┐                             │
│                    │   Data Ingestion    │                             │
│                    │   (Read-Only)       │                             │
│                    └──────────┬──────────┘                             │
│                               │                                         │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       UltraWealth Platform                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                         API Layer                               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │    │
│  │  │   Tenant    │  │ Governance  │  │   Route     │            │    │
│  │  │ Middleware  │  │ Middleware  │  │  Handlers   │            │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                │                                         │
│                                ▼                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                      Platform Core                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ Tenancy  │  │Governance│  │ Evidence │  │ Security │      │    │
│  │  │  Module  │  │  Module  │  │  Module  │  │  Module  │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                │                                         │
│                                ▼                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                         Tenants                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │    │
│  │  │ Family Office│  │    Retail    │  │   Advisor    │         │    │
│  │  │   (fo)       │  │   (retail)   │  │  (advisor)   │         │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Users                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Family Office│  │   Retail     │  │  Licensed    │                  │
│  │  Principals  │  │  Investors   │  │  Advisors    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Layered Architecture

The platform follows a strict layered architecture with clear boundaries between layers.

### API Layer

The API layer handles HTTP requests and establishes the tenant context for each request. It consists of middleware components that validate and enrich requests before they reach the route handlers.

**Tenant Middleware**: Extracts the tenant ID from the request header, validates the tenant exists and is active, and establishes the tenant context in AsyncLocalStorage.

**Governance Middleware**: Loads the tenant's governance profile and attaches enforcement hooks to the request. Validates that the request does not violate governance rules.

**Route Handlers**: Process the request using the established tenant context. All data operations are automatically scoped to the current tenant.

### Platform Core

The platform core provides shared infrastructure services used by all tenants.

**Tenancy Module**: Manages tenant lifecycle, context propagation, and isolation enforcement. The isolation guards ensure that no data operation can cross tenant boundaries.

**Governance Module**: Loads governance profiles and provides enforcement hooks. The adapter pattern allows different tenants to have different governance rules while sharing the same enforcement infrastructure.

**Evidence Module**: Implements event sourcing with evidence linking. All material changes are recorded as events, and evidence artefacts can be linked to events for auditability.

**Security Module**: Provides RBAC, audit logging, and export guards. All operations are logged to an immutable audit trail.

### Tenant Layer

Each tenant implements its own domain model, views, reports, and UI components. Tenants share the platform infrastructure but have isolated data and configuration.

**Domain**: Entity and asset models specific to the tenant's use case.

**Views**: Read-only views that consolidate visibility across the tenant's data.

**Reports**: Report generators for governance and compliance.

**UI Shell**: React components for presenting data to users.

## Data Flow

### Read Path

```
User Request
    │
    ▼
API Gateway
    │
    ▼
Tenant Middleware ──► Validate tenant, establish context
    │
    ▼
Governance Middleware ──► Load profile, attach hooks
    │
    ▼
Route Handler
    │
    ▼
View Builder ──► Query with partition key filter
    │
    ▼
Database ──► Return tenant-scoped data
    │
    ▼
Response ──► Validate against governance rules
    │
    ▼
User
```

### Write Path

```
User Request
    │
    ▼
API Gateway
    │
    ▼
Tenant Middleware ──► Validate tenant, establish context
    │
    ▼
Governance Middleware ──► Load profile, attach hooks
    │
    ▼
Route Handler
    │
    ▼
Isolation Guard ──► Validate write target belongs to tenant
    │
    ▼
Event Store ──► Append event (immutable)
    │
    ▼
Evidence Linker ──► Link evidence if provided
    │
    ▼
Audit Log ──► Record operation
    │
    ▼
Database ──► Persist changes
    │
    ▼
Response
    │
    ▼
User
```

## Integration Patterns

### External Data Ingestion

The platform ingests data from external systems using a read-only integration pattern. It never writes back to external systems.

| Pattern | Description |
|---------|-------------|
| API Pull | Scheduled polling of custodian APIs |
| File Import | Processing of statement files (CSV, PDF) |
| Webhook | Real-time updates from integrated platforms |
| Manual Entry | User-entered data with evidence attachment |

All ingested data is tagged with its source and timestamp. The platform maintains a clear distinction between externally-sourced data and user-entered data.

### Evidence Attachment

Evidence artefacts (statements, valuations, documents) are stored in object storage and linked to events in the event store.

```
Event Store                    Object Storage
┌─────────────┐               ┌─────────────┐
│   Event     │               │  Evidence   │
│  ─────────  │               │  ─────────  │
│  event_id   │◄──────────────│  event_id   │
│  tenant_id  │               │  file_hash  │
│  type       │               │  file_path  │
│  payload    │               │  metadata   │
│  timestamp  │               │  uploaded   │
└─────────────┘               └─────────────┘
```

## Deployment Architecture

### Single-Region Deployment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AWS Region                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Public Subnet                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │     ALB     │  │     WAF     │  │  CloudFront │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                         │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       Private Subnet                             │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │                    EKS Cluster                           │    │   │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │   │
│  │  │  │ API Pod │  │ API Pod │  │ API Pod │  │ API Pod │    │    │   │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │     RDS     │  │ ElastiCache │  │     S3      │             │   │
│  │  │ (PostgreSQL)│  │   (Redis)   │  │  (Evidence) │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication Flow

```
User ──► Identity Provider (Auth0/Cognito)
              │
              ▼
         Access Token (JWT)
              │
              ▼
         API Gateway
              │
              ▼
         Token Validation
              │
              ▼
         Tenant Context Binding
              │
              ▼
         Authorised Request
```

### Encryption

| Layer | Encryption |
|-------|------------|
| Transit | TLS 1.3 |
| At Rest (Database) | AES-256 (RDS encryption) |
| At Rest (S3) | AES-256 (SSE-S3 or SSE-KMS) |
| Sensitive Fields | Tenant-specific KMS keys |

## Scalability

The platform is designed for horizontal scalability at each layer.

**API Layer**: Stateless pods that can be scaled horizontally. Tenant context is established per-request, not stored in pod memory.

**Database**: Read replicas for read-heavy workloads. Connection pooling via PgBouncer.

**Cache**: Redis cluster for session data and frequently-accessed tenant configuration.

**Object Storage**: S3 with CloudFront for evidence artefact delivery.

## Monitoring and Observability

| Component | Tool |
|-----------|------|
| Metrics | Prometheus + Grafana |
| Logging | CloudWatch Logs + OpenSearch |
| Tracing | AWS X-Ray |
| Alerting | PagerDuty |

All logs include tenant ID and correlation ID for cross-request tracing.
