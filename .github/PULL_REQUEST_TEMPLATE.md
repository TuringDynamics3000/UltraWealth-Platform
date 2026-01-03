# Pull Request

## Scope Declaration

**Select exactly ONE scope for this PR:**

- [ ] **platform/tenancy** — Tenant isolation, context, registry
- [ ] **platform/governance** — Governance rules, enforcement hooks
- [ ] **platform/evidence** — Event store, evidence linking, replay
- [ ] **platform/security** — RBAC, audit log, export guards
- [ ] **api** — API routes, middleware, server
- [ ] **tenants/family-office** — FO tenant domain, views, reports, UI
- [ ] **tenants/retail** — Retail tenant implementation
- [ ] **tenants/advisor** — Advisor tenant implementation
- [ ] **docs** — Documentation only
- [ ] **ci** — CI/CD workflows only
- [ ] **deps** — Dependency updates only

## Description

<!-- Describe what this PR does -->

## Governance Checklist

**I confirm that this PR:**

- [ ] Contains NO advisory language (recommend, suggest, optimise, etc.)
- [ ] Contains NO execution capability (placeOrder, submitTrade, etc.)
- [ ] Contains NO system-of-record semantics (updateBalance, journalEntry, etc.)
- [ ] Maintains tenant isolation (all queries include partition key)
- [ ] Does not bypass governance enforcement hooks

## Evidence

**For material changes, attach or link evidence:**

- [ ] Not applicable (docs/ci/deps only)
- [ ] Evidence attached/linked below

<!-- Link to evidence if applicable -->

## Testing

**How was this tested?**

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] Not applicable

## Reviewer Notes

<!-- Any specific areas to focus review on -->
