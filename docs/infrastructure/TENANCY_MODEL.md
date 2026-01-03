# UltraWealth Platform Tenancy Model

This document describes the multi-tenant architecture of the UltraWealth Platform, including isolation guarantees, data partitioning, and tenant lifecycle management.

## Overview

The UltraWealth Platform implements a **hard multi-tenant architecture** where each tenant operates in complete isolation from others. This isolation is enforced at multiple layers: application, data, and infrastructure.

## Tenant Definition

A tenant represents a single customer deployment with its own data, configuration, and governance rules. Each tenant is assigned a unique identifier and partition key that governs all data access.

| Property | Description |
|----------|-------------|
| Tenant ID | Unique identifier (UUID format) |
| Partition Key | Data isolation key derived from tenant ID |
| Profile | Governance profile (fo, retail, advisor) |
| Encryption Key ID | Tenant-specific encryption key reference |
| Status | Lifecycle status (provisioning, onboarding, active, suspended, terminated) |

## Isolation Guarantees

The platform provides the following isolation guarantees, enforced by code rather than policy.

### Data Isolation

All data operations are scoped to the current tenant context. The isolation guards prevent any cross-tenant data access.

**Query Guard**: Every database query is automatically filtered by partition key. Queries without a valid partition key are rejected at runtime.

**Write Guard**: All write operations validate that the target record belongs to the current tenant. Attempts to write to another tenant's data throw an IsolationBreachError.

**Export Guard**: Data exports are validated to ensure all records belong to the current tenant before export is permitted.

### Context Isolation

Tenant context is established at the beginning of each request and cannot be modified during the request lifecycle. The context includes tenant ID, partition key, correlation ID, and user ID.

The context is stored in AsyncLocalStorage, ensuring it is automatically propagated through async operations without explicit passing.

### Encryption Isolation

Each tenant has a dedicated encryption key for sensitive data. Keys are managed externally (AWS KMS, Azure Key Vault, or similar) and referenced by key ID. Tenant data encrypted with one key cannot be decrypted by another tenant's key.

## Data Partitioning Strategy

The platform uses logical partitioning with physical isolation capabilities.

### Logical Partitioning

All tenant data includes a partition_key column that is indexed and used in all queries. This provides logical isolation within shared database infrastructure.

### Physical Isolation (Enterprise Tier)

Enterprise tenants can be provisioned with dedicated database instances, providing physical isolation for regulatory or security requirements.

| Tier | Database | Isolation Level |
|------|----------|-----------------|
| Standard | Shared PostgreSQL | Logical (partition key) |
| Professional | Dedicated schema | Schema-level |
| Enterprise | Dedicated instance | Physical |

## Tenant Lifecycle

Tenants progress through a defined lifecycle with specific states and transitions.

### States

**Provisioning**: Initial state when tenant is created. Infrastructure is being allocated.

**Onboarding**: Tenant infrastructure is ready. Initial configuration and data import in progress.

**Active**: Tenant is fully operational. All features available.

**Suspended**: Tenant access is temporarily disabled. Data is preserved but inaccessible.

**Terminated**: Tenant is permanently disabled. Data retention policy applies.

### Transitions

Transitions between states are controlled and audited. The following transitions are permitted:

- provisioning → onboarding
- onboarding → active
- active → suspended
- suspended → active
- suspended → terminated
- active → terminated

## Governance Profiles

Each tenant is assigned a governance profile that determines the rules enforced on that tenant's data and operations.

| Profile | Advisory Language | Execution | SoR Leakage |
|---------|-------------------|-----------|-------------|
| fo | Forbidden | Forbidden | Forbidden |
| retail | Forbidden | Forbidden | Forbidden |
| advisor | Labeled only | Forbidden | Forbidden |

The governance adapter loads the appropriate profile for each tenant and enforces rules at both CI time (via GitHub Actions) and runtime (via enforcement hooks).

## Request Flow

Every API request follows this flow to establish and validate tenant context:

1. Request arrives at API gateway
2. Tenant middleware extracts X-Tenant-ID header
3. Tenant registry validates tenant exists and is active
4. Tenant context is established in AsyncLocalStorage
5. Governance middleware validates request against tenant profile
6. Request is processed with automatic partition key filtering
7. Response is validated against governance rules
8. Audit log records the operation

## Cross-Tenant Operations

Cross-tenant operations are explicitly forbidden in the platform. There is no mechanism to query or modify data across tenant boundaries.

Platform-level operations (tenant provisioning, billing, etc.) operate outside the tenant context and are restricted to platform administrators.

## Audit Trail

All tenant operations are recorded in an immutable audit log. The audit log includes tenant ID, user ID, operation type, outcome, and timestamp. Audit entries are chained using cryptographic hashes to detect tampering.

## Disaster Recovery

Each tenant's data can be independently backed up and restored. The partition key ensures that restoration of one tenant's data does not affect other tenants.

Backup frequency and retention are configurable per tenant tier.
