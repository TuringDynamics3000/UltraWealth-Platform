# UltraWealth Platform

Production-grade multi-tenant wealth visibility platform with hard tenant isolation, governance enforcement, and evidence-backed operations.

## Overview

The UltraWealth Platform consolidates visibility across externally-held assets for family offices, retail investors, and licensed advisors. The platform does not hold assets, execute transactions, or provide financial guidance. It presents a unified view of information sourced from external custodians and systems of record.

## Architectural Principles

The platform is built on four foundational principles that are enforced by code, not policy.

**External-Asset-First**: All assets are held at external custodians (banks, brokers, registries). The platform consolidates visibility across these external sources. It never becomes a system of record for balances or positions.

**Evidence-Backed**: Every material fact in the system has supporting evidence (statements, valuations, documents). Evidence is linked to events and can be verified at any time.

**No Execution Capability**: The platform records instructions and outcomes. It does not execute trades, place orders, or interact with markets. Execution capability is explicitly forbidden in the codebase.

**No Advisory Content**: The platform presents information. It does not recommend, suggest, or optimise. Advisory language is forbidden in all tenant code and is enforced by CI.

## Repository Structure

```
UltraWealth-Platform/
├── platform/                    # Core platform modules
│   ├── tenancy/                 # Multi-tenant isolation
│   ├── governance/              # Governance enforcement
│   ├── evidence/                # Event sourcing and evidence
│   └── security/                # RBAC, audit, export guards
├── api/                         # API layer
│   ├── middleware/              # Tenant and governance middleware
│   ├── routes/                  # API routes
│   └── server.ts                # Server setup
├── tenants/                     # Tenant implementations
│   ├── family-office/           # Family Office tenant (complete)
│   ├── retail/                  # Retail tenant (stub)
│   └── advisor/                 # Advisor tenant (stub)
├── docs/                        # Documentation
│   └── infrastructure/          # Infrastructure docs
└── .github/                     # CI/CD workflows
```

## Platform Modules

### Tenancy Module

The tenancy module provides hard multi-tenant isolation. Every request operates within a tenant context that is established at the API boundary and cannot be modified during the request lifecycle.

| Component | Purpose |
|-----------|---------|
| Tenant Registry | Manages tenant lifecycle and configuration |
| Tenant Context | Request-scoped tenant isolation via AsyncLocalStorage |
| Isolation Guards | Enforces partition key filtering on all data operations |

### Governance Module

The governance module enforces tenant-specific rules at both CI time and runtime.

| Component | Purpose |
|-----------|---------|
| Governance Adapter | Loads and applies tenant governance profiles |
| Enforcement Hooks | Runtime validation of operations against governance rules |

### Evidence Module

The evidence module implements event sourcing with evidence linking.

| Component | Purpose |
|-----------|---------|
| Event Store | Immutable, append-only event storage |
| Evidence Linker | Links evidence artefacts to events |
| Replay Engine | Reconstructs state from event history |

### Security Module

The security module provides access control, audit logging, and export protection.

| Component | Purpose |
|-----------|---------|
| RBAC | Role-based access control |
| Audit Log | Immutable, chained audit entries |
| Export Guards | Validates exports contain only current tenant data |

## Tenant Profiles

Each tenant is assigned a governance profile that determines the rules enforced on that tenant.

| Profile | Advisory Language | Execution | SoR Leakage |
|---------|-------------------|-----------|-------------|
| fo | Forbidden | Forbidden | Forbidden |
| retail | Forbidden | Forbidden | Forbidden |
| advisor | Labeled only | Forbidden | Forbidden |

## Family Office Tenant

The Family Office tenant is fully implemented and includes:

**Domain Model**: Entities (trusts, companies, individuals, partnerships, SMSFs) and external assets (listed securities, managed funds, real property, bank accounts).

**Views**: Consolidated net worth view with breakdowns by asset class, entity, and currency.

**Reports**: Board pack generator for quarterly governance reporting.

**UI Shell**: React components for dashboard presentation.

## Getting Started

### Prerequisites

- Node.js 20+
- TypeScript 5+
- PostgreSQL 15+ (for data persistence)

### Installation

```bash
# Clone the repository
git clone https://github.com/TuringDynamics3000/UltraWealth-Platform.git
cd UltraWealth-Platform

# Install dependencies
npm install

# Build
npm run build
```

### Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run governance checks locally
npm run governance:check
```

## Governance Enforcement

Governance is enforced at multiple levels.

**CI Enforcement**: The `platform-governance.yml` workflow scans all PRs for forbidden patterns (advisory language, execution capability, SoR leakage).

**PR Gates**: The PR template requires scope declaration and governance checklist completion.

**CODEOWNERS**: Changes to governance-critical paths require approval from designated teams.

**Runtime Enforcement**: Enforcement hooks validate operations at runtime against the tenant's governance profile.

## Documentation

| Document | Description |
|----------|-------------|
| [Tenancy Model](docs/infrastructure/TENANCY_MODEL.md) | Multi-tenant architecture and isolation |
| [Deployment Tiers](docs/infrastructure/DEPLOYMENT_TIERS.md) | Standard, Professional, Enterprise tiers |
| [Threat Model](docs/infrastructure/THREAT_MODEL.md) | Security threats and mitigations |

## Contributing

All contributions must comply with the governance rules. PRs that contain advisory language, execution capability, or SoR leakage will be automatically rejected by CI.

1. Create a feature branch from `main`
2. Make changes following the architectural principles
3. Submit a PR with the scope declaration completed
4. Ensure all CI checks pass
5. Obtain required approvals from CODEOWNERS

## License

Proprietary. All rights reserved.

---

*UltraWealth Platform consolidates visibility, not authority.*
