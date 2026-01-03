# UltraWealth Platform Deployment Tiers

This document describes the deployment tiers available for the UltraWealth Platform, including infrastructure specifications, isolation levels, and feature availability.

## Tier Overview

The platform offers three deployment tiers to accommodate different customer requirements for isolation, performance, and compliance.

| Tier | Target Customer | Isolation | SLA |
|------|-----------------|-----------|-----|
| Standard | Small family offices, retail | Logical | 99.5% |
| Professional | Mid-size family offices | Schema | 99.9% |
| Enterprise | Large family offices, institutions | Physical | 99.99% |

## Standard Tier

The Standard tier provides cost-effective multi-tenant deployment with logical isolation.

### Infrastructure

- **Compute**: Shared Kubernetes cluster
- **Database**: Shared PostgreSQL with row-level security
- **Storage**: Shared S3 bucket with prefix isolation
- **Cache**: Shared Redis cluster with key prefix isolation

### Isolation

Data isolation is enforced through partition keys at the application layer. All queries include partition key filters. Row-level security policies provide an additional layer of protection at the database level.

### Capacity

| Resource | Limit |
|----------|-------|
| Entities | 1,000 |
| External Assets | 5,000 |
| API Requests | 10,000/day |
| Storage | 10 GB |
| Users | 10 |

### Features

- Core platform functionality
- Standard governance enforcement
- Basic reporting
- Email support

## Professional Tier

The Professional tier provides enhanced isolation and capacity for growing family offices.

### Infrastructure

- **Compute**: Dedicated namespace in shared cluster
- **Database**: Dedicated PostgreSQL schema
- **Storage**: Dedicated S3 bucket
- **Cache**: Dedicated Redis namespace

### Isolation

Schema-level isolation provides stronger boundaries than row-level security. Each tenant has a dedicated database schema with its own tables, indexes, and constraints.

### Capacity

| Resource | Limit |
|----------|-------|
| Entities | 10,000 |
| External Assets | 50,000 |
| API Requests | 100,000/day |
| Storage | 100 GB |
| Users | 50 |

### Features

- All Standard features
- Custom governance rules
- Advanced reporting
- API access
- Priority support

## Enterprise Tier

The Enterprise tier provides complete physical isolation for institutions with strict regulatory requirements.

### Infrastructure

- **Compute**: Dedicated Kubernetes cluster
- **Database**: Dedicated PostgreSQL instance
- **Storage**: Dedicated S3 bucket with encryption
- **Cache**: Dedicated Redis instance
- **Network**: Dedicated VPC with private endpoints

### Isolation

Physical isolation ensures complete separation of infrastructure. The tenant's data never shares hardware with other tenants. Network isolation prevents any cross-tenant traffic.

### Capacity

| Resource | Limit |
|----------|-------|
| Entities | Unlimited |
| External Assets | Unlimited |
| API Requests | Unlimited |
| Storage | Unlimited |
| Users | Unlimited |

### Features

- All Professional features
- Dedicated infrastructure
- Custom SLA
- Dedicated support engineer
- On-premise deployment option
- Custom integrations
- Audit and compliance packages

## Deployment Architecture

### Standard Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Tenant A   │  │  Tenant B   │  │  Tenant C   │         │
│  │  (pk: A)    │  │  (pk: B)    │  │  (pk: C)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Shared PostgreSQL                        │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐                  │  │
│  │  │ Row A  │  │ Row B  │  │ Row C  │  (RLS enforced)  │  │
│  │  └────────┘  └────────┘  └────────┘                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Enterprise Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dedicated VPC                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Dedicated K8s Cluster                   │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │           Tenant Application                 │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Dedicated PostgreSQL Instance              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Dedicated S3 Bucket                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Tier Migration

Tenants can migrate between tiers with the following considerations.

### Standard → Professional

- Data migration to dedicated schema
- No downtime required
- Automatic capacity increase

### Professional → Enterprise

- Infrastructure provisioning (2-4 weeks)
- Scheduled migration window
- Data validation and verification
- Parallel running period available

### Downgrade

Downgrades are supported but require capacity validation. If the tenant's data exceeds the lower tier's limits, the downgrade will be blocked until data is reduced.

## Compliance Mapping

Different regulatory requirements map to specific tiers.

| Requirement | Minimum Tier |
|-------------|--------------|
| APRA CPS 234 | Professional |
| SOC 2 Type II | Professional |
| ISO 27001 | Professional |
| APRA CPS 231 | Enterprise |
| Data sovereignty | Enterprise |
| Air-gapped deployment | Enterprise |

## Pricing Model

Pricing is based on tier selection plus usage-based components.

| Component | Standard | Professional | Enterprise |
|-----------|----------|--------------|------------|
| Base fee | $X/month | $Y/month | Custom |
| Per entity | Included | Included | Included |
| Per asset | Included | Included | Included |
| API overage | $Z/1000 | $Z/1000 | Included |
| Storage overage | $W/GB | $W/GB | Included |
