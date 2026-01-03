# UltraWealth Platform Threat Model

This document describes the threat model for the UltraWealth Platform, including identified threats, mitigations, and residual risks.

## Scope

This threat model covers the UltraWealth Platform multi-tenant architecture, focusing on threats to data confidentiality, integrity, and availability across tenant boundaries.

## Assets

The following assets are protected by this threat model.

| Asset | Classification | Description |
|-------|----------------|-------------|
| Entity data | Confidential | Legal entity information (trusts, companies, individuals) |
| External asset data | Confidential | Asset holdings, valuations, custodian details |
| Financial reports | Confidential | Board packs, tax reports, auditor reports |
| User credentials | Secret | Authentication tokens, API keys |
| Encryption keys | Secret | Tenant-specific data encryption keys |
| Audit logs | Integrity-critical | Immutable record of all operations |
| Evidence artefacts | Integrity-critical | Supporting documents, statements, valuations |

## Threat Actors

The following threat actors are considered in this model.

| Actor | Capability | Motivation |
|-------|------------|------------|
| External attacker | High | Financial gain, data theft |
| Malicious tenant | Medium | Access competitor data |
| Malicious insider | High | Financial gain, sabotage |
| Compromised admin | High | Varies |
| Nation-state | Very high | Espionage, disruption |

## Threats and Mitigations

### T1: Cross-Tenant Data Access

**Threat**: A malicious tenant attempts to access another tenant's data through API manipulation, SQL injection, or application vulnerabilities.

**Impact**: High - Confidential data exposure, regulatory breach, reputational damage.

**Mitigations**:
- Partition key enforcement at application layer (isolation guards)
- Row-level security at database layer
- Input validation and parameterised queries
- No cross-tenant API endpoints
- Automated testing for isolation breaches

**Residual Risk**: Low - Multiple layers of defence make exploitation difficult.

### T2: Tenant Impersonation

**Threat**: An attacker obtains or forges tenant credentials to impersonate a legitimate tenant.

**Impact**: High - Unauthorised access to tenant data and operations.

**Mitigations**:
- Strong authentication (OAuth 2.0, MFA)
- Tenant ID validation against authenticated session
- Short-lived access tokens
- Token binding to tenant context
- Anomaly detection on authentication patterns

**Residual Risk**: Medium - Credential theft remains a risk despite mitigations.

### T3: Privilege Escalation

**Threat**: A user with limited permissions escalates to higher privileges within their tenant or to platform admin.

**Impact**: High - Unauthorised operations, data modification.

**Mitigations**:
- Role-based access control (RBAC) with principle of least privilege
- Permission checks at every operation
- Separation of platform admin and tenant admin roles
- Audit logging of all privileged operations
- Regular access reviews

**Residual Risk**: Low - RBAC enforcement is comprehensive.

### T4: Data Exfiltration

**Threat**: An attacker or malicious insider exports large amounts of tenant data.

**Impact**: High - Data breach, regulatory penalties.

**Mitigations**:
- Export guards validate data belongs to current tenant
- Rate limiting on bulk operations
- Audit logging of all exports
- Alerting on unusual export patterns
- Data loss prevention (DLP) integration

**Residual Risk**: Medium - Authorised users can still export their own data.

### T5: Evidence Tampering

**Threat**: An attacker modifies evidence artefacts or audit logs to hide malicious activity or alter records.

**Impact**: High - Loss of audit trail, compliance failure.

**Mitigations**:
- Immutable event store with append-only writes
- Cryptographic chaining of audit entries
- Evidence hash verification
- Write-once storage for evidence artefacts
- Regular integrity verification

**Residual Risk**: Low - Cryptographic integrity makes tampering detectable.

### T6: Denial of Service

**Threat**: An attacker overwhelms the platform with requests, causing service degradation for all tenants.

**Impact**: Medium - Service unavailability, SLA breach.

**Mitigations**:
- Rate limiting per tenant
- Request throttling
- Auto-scaling infrastructure
- DDoS protection (CloudFlare, AWS Shield)
- Tenant isolation prevents noisy neighbour

**Residual Risk**: Medium - Sophisticated DDoS attacks may still impact availability.

### T7: Supply Chain Attack

**Threat**: A malicious dependency is introduced into the platform codebase.

**Impact**: High - Arbitrary code execution, data theft.

**Mitigations**:
- Dependency scanning (Snyk, Dependabot)
- Lock files for reproducible builds
- Code review for all changes
- Minimal dependency policy
- CI/CD pipeline security

**Residual Risk**: Medium - Zero-day vulnerabilities in dependencies remain a risk.

### T8: Governance Bypass

**Threat**: Code is introduced that bypasses governance rules (advisory language, execution capability).

**Impact**: Medium - Regulatory non-compliance, tenant trust breach.

**Mitigations**:
- CI enforcement of governance rules
- Automated scanning for forbidden patterns
- PR template requiring scope declaration
- CODEOWNERS requiring governance team approval
- Runtime enforcement hooks

**Residual Risk**: Low - Multiple enforcement points make bypass difficult.

### T9: Encryption Key Compromise

**Threat**: Tenant encryption keys are exposed or stolen.

**Impact**: High - All tenant data can be decrypted.

**Mitigations**:
- Keys stored in HSM-backed key management (AWS KMS, Azure Key Vault)
- Key rotation policy
- Separate keys per tenant
- Key access audit logging
- No keys in application code or configuration

**Residual Risk**: Low - HSM protection makes key extraction extremely difficult.

### T10: Insider Threat (Platform Admin)

**Threat**: A platform administrator abuses their access to view or modify tenant data.

**Impact**: High - Data breach, trust violation.

**Mitigations**:
- Separation of duties (no single admin can access all systems)
- Just-in-time access provisioning
- All admin actions logged and monitored
- Background checks for admin personnel
- Regular access reviews
- Break-glass procedures for emergency access

**Residual Risk**: Medium - Determined insiders with sufficient access remain a risk.

## Risk Matrix

| Threat | Likelihood | Impact | Risk Level | Status |
|--------|------------|--------|------------|--------|
| T1: Cross-tenant access | Low | High | Medium | Mitigated |
| T2: Tenant impersonation | Medium | High | High | Mitigated |
| T3: Privilege escalation | Low | High | Medium | Mitigated |
| T4: Data exfiltration | Medium | High | High | Partially mitigated |
| T5: Evidence tampering | Low | High | Medium | Mitigated |
| T6: Denial of service | Medium | Medium | Medium | Partially mitigated |
| T7: Supply chain attack | Low | High | Medium | Partially mitigated |
| T8: Governance bypass | Low | Medium | Low | Mitigated |
| T9: Key compromise | Very low | High | Low | Mitigated |
| T10: Insider threat | Low | High | Medium | Partially mitigated |

## Security Controls Summary

| Control Category | Controls Implemented |
|------------------|---------------------|
| Authentication | OAuth 2.0, MFA, token binding |
| Authorisation | RBAC, tenant context, isolation guards |
| Encryption | TLS 1.3, AES-256 at rest, tenant-specific keys |
| Logging | Immutable audit log, cryptographic chaining |
| Monitoring | Anomaly detection, alerting, SIEM integration |
| Network | VPC isolation, private endpoints, WAF |
| Code security | SAST, DAST, dependency scanning, code review |
| Governance | CI enforcement, runtime hooks, PR gates |

## Review Schedule

This threat model is reviewed quarterly or when significant changes are made to the platform architecture. The next scheduled review is Q2 2026.
