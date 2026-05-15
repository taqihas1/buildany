---
title: "Oracle Financial Cloud GL & AP Implementation — Healthcare Network"
industry: healthcare
project_type: erp_implementation
duration_weeks: 32
team_size: 10
contract_value: 720000
currency: USD
completion_date: "2025-11-20"
client_anonymized: "Regional healthcare network with 14 hospitals, 3,200 beds, $2.4B annual revenue"
technologies:
  - "Oracle Fusion Cloud ERP"
  - "Oracle Integration Cloud (OIC)"
  - "Oracle Analytics Cloud"
  - "Oracle Identity Cloud Service"
outcome_metrics:
  - "Financial close reduced from 15 days to 4 days"
  - "AP processing cost reduced by 38%"
  - "99.4% invoice accuracy rate achieved"
  - "Consolidated 14 GL instances into 1 unified chart of accounts"
status: completed
---

# Case Study: Oracle Financial Cloud Implementation

## Client Situation

A rapidly growing healthcare network had acquired 6 smaller hospital systems over 4 years, each with its own financial systems. The result was a patchwork of 14 different GL instances, inconsistent chart of accounts, and a financial close process that took 15 business days.

**Key Challenges:**
- 14 separate general ledgers with no standardization
- Manual consolidation process requiring 8 FTEs for 15 days each month
- AP processing distributed across 7 different systems
- Lack of real-time financial visibility for executive decision-making
- Compliance risk from inconsistent revenue recognition practices

## Our Approach

### Phase 1: Discover & Design (Weeks 1-8)
- Conducted 47 stakeholder interviews across finance, IT, and operations
- Mapped all 14 GL instances to identify commonalities and conflicts
- Designed unified chart of accounts with 8 segments (Entity, Department, Account, Project, Product, Intercompany, Future1, Future2)
- Built a business case showing $1.2M annual savings from consolidation

### Phase 2: Configure & Build (Weeks 9-20)
- Configured Oracle Fusion Cloud Financials (GL, AP, AR, Cash Management)
- Developed 23 custom reports using Oracle Analytics Cloud
- Built integration middleware using Oracle Integration Cloud to connect:
  - HRIS (Workday) for employee cost allocations
  - Supply chain system for PO-to-voucher matching
  - Patient billing system for revenue recognition
- Configured security roles for 340 users across 14 entities

### Phase 3: Test & Train (Weeks 21-28)
- Executed 3 mock closes (Month-1, Month-2, Month-3) with parallel running
- Trained 85 end users through a "super-user" cascade model
- Conducted security penetration testing and SOX control validation
- Performed data reconciliation with legacy systems

### Phase 4: Deploy & Stabilize (Weeks 29-32)
- Cutover executed over a weekend with go-live on Monday
- Deployed "war room" support for first 3 production closes
- Established runbooks and escalation procedures
- Transitioned to managed services for ongoing support

## Key Decisions

**Decision: Big Bang vs. Phased Rollout**
Recommended big-bang for GL (single source of truth required) but phased for AP (lower risk, easier rollback). This hybrid approach balanced urgency with prudence.

**Decision: Standardize vs. Accommodate Local Practices**
Compromise approach: 80% standardization with 20% local flexibility through configurable segments. This prevented "lowest common denominator" design while respecting operational realities.

## Outcomes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Financial Close Duration | 15 days | 4 days | **-73%** |
| AP Processing Cost | $12.50/invoice | $7.75/invoice | **-38%** |
| Invoice Accuracy | 87% | 99.4% | **+12.4%** |
| GL Instances | 14 | 1 unified | **-93%** |
| Real-time Reporting | None | Daily dashboards | **New capability** |
| SOX Compliance | Manual | Automated controls | **New capability** |

## Client Testimonial

> "For the first time in 6 years, I can see our entire network's financial position on Monday morning, not the 20th of the month. Apex delivered what our internal team had been promising for years."
> — CFO, Regional Healthcare Network

## Lessons Learned

1. **Chart of accounts design is political** — What seems like a technical decision ("how many segments?") becomes a power struggle between acquired entities. We facilitated 6 workshops to reach consensus.

2. **Data migration is never just ETL** — Historical data from 14 systems had different calendars, currencies, and conventions. We built a "data normalization layer" that added 3 weeks but prevented months of reconciliation.

3. **Change management is 40% of the work** — Technical implementation was the easy part. Getting 85 users to trust a new close process required 1:1 coaching for key personnel.
