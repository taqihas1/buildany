
# Appendix: Cloud Migration Specific Requirements

**Attach this as an addendum to the Master RFP Template when the project involves cloud migration.**

---

## CM-1. Cloud Migration Overview

### CM-1.1 Migration Scope
- **Source Environment:** [e.g., On-premises data centers, private cloud, existing public cloud]
- **Target Environment:** [e.g., Microsoft Azure / AWS / Google Cloud / Multi-cloud / Hybrid]
- **Migration Type:** [Rehost (lift-and-shift) / Replatform / Refactor / Rebuild / Retire / Retain]
- **Migration Strategy:** [Big bang / Phased by workload / Phased by business unit / Rolling / Blue-green]

### CM-1.2 Workload Inventory
[Require vendor to confirm they have received and reviewed the workload inventory — attach as Appendix A]

| Workload | Current Platform | Target Platform | Criticality | Complexity | Migration Type | Priority |
|---|---|---|---|---|---|---|
| [e.g., SAP ERP] | [e.g., On-prem VM, Windows Server 2019] | [e.g., Azure VMs / SAP on Azure] | [Critical] | [High] | [Replatform] | [1] |
| [e.g., Data Warehouse] | [e.g., On-prem Oracle] | [e.g., Azure Synapse / Snowflake] | [High] | [High] | [Refactor] | [2] |
| [e.g., Web Applications] | [e.g., On-prem IIS] | [e.g., Azure App Service / AKS] | [Medium] | [Medium] | [Replatform] | [3] |
| [e.g., File Shares] | [e.g., On-prem NAS] | [e.g., Azure Files / OneDrive] | [Low] | [Low] | [Rehost] | [4] |

---

## CM-2. Technical Architecture Requirements

### CM-2.1 Target Architecture Standards
- **Cloud Landing Zone:** [e.g., "Must deploy within our existing Azure landing zone using our defined subscription structure"]
- **Networking:** [e.g., "Hub-and-spoke topology, ExpressRoute connectivity, NSG/ASG policies"]
- **Identity:** [e.g., "Azure AD integration, SSO via existing identity provider, MFA enforced"]
- **Security Baseline:** [e.g., "Must comply with Azure Security Benchmark / AWS Foundational Security Best Practices / CIS Benchmarks"]
- **Monitoring:** [e.g., "Azure Monitor / CloudWatch / Cloud Logging integration with existing SOC"]
- **Backup & DR:** [e.g., "Azure Backup, Site Recovery, geo-redundant storage, RPO/RTO requirements"]

### CM-2.2 Infrastructure as Code (IaC)
- **IaC Requirement:** [e.g., "All infrastructure must be deployed via Terraform / Bicep / CloudFormation / Pulumi"]
- **Version Control:** [e.g., "All IaC stored in client's Git repository"]
- **State Management:** [e.g., "Terraform state in Azure Blob Storage with locking"]
- **Pipeline Integration:** [e.g., "CI/CD pipeline for infrastructure deployment using Azure DevOps / GitHub Actions / GitLab CI"]

### CM-2.3 Container & Orchestration (if applicable)
- **Container Platform:** [e.g., "Azure Kubernetes Service (AKS) / Amazon EKS / Google GKE"]
- **Container Standards:** [e.g., "Docker images stored in Azure Container Registry, scanned for vulnerabilities"]
- **Orchestration Requirements:** [e.g., "Helm charts for deployment, service mesh (Istio/Linkerd) if required"]

### CM-2.4 Serverless Requirements (if applicable)
- **Serverless Platform:** [e.g., "Azure Functions / AWS Lambda / Google Cloud Functions"]
- **Trigger Types:** [e.g., "HTTP, Timer, Queue, Event Grid"]
- **Cold Start Tolerance:** [e.g., "Maximum 5 second cold start for user-facing functions"]

---

## CM-3. Data Migration Requirements

### CM-3.1 Data Volume & Classification
| Data Category | Volume | Sensitivity | Current Location | Target Location | Migration Method |
|---|---|---|---|---|---|
| [Transactional DB] | [e.g., 2TB] | [Highly Sensitive] | [On-prem SQL Server] | [Azure SQL Managed Instance] | [Azure DMS] |
| [Data Warehouse] | [e.g., 10TB] | [Sensitive] | [On-prem Oracle] | [Azure Synapse] | [Custom ETL] |
| [Unstructured Data] | [e.g., 50TB] | [Internal] | [On-prem NAS] | [Azure Blob Storage] | [AzCopy / Data Box] |
| [Archived Data] | [e.g., 100TB] | [Internal] | [Tape Archive] | [Azure Cool Blob] | [Azure Data Box] |

### CM-3.2 Data Migration Strategy Requirements
- **Migration Method:** [e.g., "Online migration preferred where possible. Offline migration acceptable for non-critical workloads with defined downtime windows."]
- **Data Pipeline Tools:** [e.g., "Azure Data Factory, Azure DMS, AWS DMS, custom SSIS packages — vendor to justify choice"]
- **Data Validation:** [e.g., "Row count validation, checksum verification, sample data comparison for all migrated datasets"]
- **Rollback Capability:** [e.g., "Must maintain ability to rollback to on-premises within 4 hours during cutover window"]
- **Delta Migration:** [e.g., "For online migrations: demonstrate delta sync capability and cutover process"]

### CM-3.3 Data Quality & Cleansing
- **Data Profiling:** [e.g., "Vendor to perform data profiling as part of Discovery phase and report data quality issues"]
- **Data Cleansing Scope:** [e.g., "Client responsible for business rule cleansing; Vendor responsible for technical format/encoding issues"]
- **Master Data Management:** [e.g., "Address master data synchronization during migration to avoid duplication"]

---

## CM-4. Security & Compliance Requirements

### CM-4.1 Cloud Security Architecture
- **Zero Trust Architecture:** [e.g., "Must implement zero trust principles — verify explicitly, use least privilege, assume breach"]
- **Network Security:**
  - [e.g., "All traffic encrypted in transit (TLS 1.3)"]
  - [e.g., "Micro-segmentation between workloads"]
  - [e.g., "DDoS protection standard (Azure DDoS Protection / AWS Shield)"]
- **Data Security:**
  - [e.g., "All data encrypted at rest using platform-managed keys; customer-managed keys preferred for sensitive data"]
  - [e.g., "Data Loss Prevention (DLP) policies applied"]
  - [e.g., "Key vault for secrets management (Azure Key Vault / AWS Secrets Manager)"]

### CM-4.2 Identity & Access Management
- **Authentication:** [e.g., "Single Sign-On (SSO) via existing Azure AD / Okta / Ping Identity"]
- **Authorization:** [e.g., "Role-Based Access Control (RBAC) with principle of least privilege"]
- **Privileged Access:** [e.g., "Just-In-Time (JIT) access for administrative tasks, PIM/PAM where available"]
- **Service Accounts:** [e.g., "Managed identities preferred over service principal secrets"]

### CM-4.3 Compliance & Data Residency
- **Data Residency:** [e.g., "All data must remain within [Region] — no cross-border data transfer without explicit approval"]
- **Compliance Certifications:** [e.g., "Target cloud environment must maintain SOC 2 Type II, ISO 27001, PCI-DSS where applicable"]
- **Audit Logging:** [e.g., "All administrative actions logged, logs retained for 7 years, integrated with SIEM"]
- **Right to Audit:** [e.g., "Client retains right to audit cloud security posture via CSPM tools or third-party assessment"]

---

## CM-5. Performance & Scalability Requirements

### CM-5.1 Performance Benchmarks
| Metric | Current Baseline | Target in Cloud | Measurement Method |
|---|---|---|---|
| **Application Response Time** | [e.g., 3 sec avg] | [e.g., <2 sec avg] | [APM tool] |
| **Database Query Time** | [e.g., 500ms avg] | [e.g., <300ms avg] | [Query profiler] |
| **Report Generation** | [e.g., 5 min] | [e.g., <2 min] | [User timing] |
| **Concurrent Users** | [e.g., 200] | [e.g., 500+] | [Load test] |
| **Batch Job Duration** | [e.g., 4 hours] | [e.g., <2 hours] | [Job scheduler] |

### CM-5.2 Scalability Requirements
- **Auto-scaling:** [e.g., "Must auto-scale compute resources based on CPU/memory thresholds"]
- **Scale-out Limits:** [e.g., "Support 3x current peak load without performance degradation"]
- **Database Scaling:** [e.g., "Read replicas for reporting workloads, auto-scaling for compute"]

### CM-5.3 Load Testing Requirements
- **Load Testing Scope:** [e.g., "Vendor to conduct load testing in pre-production environment mirroring production scale"]
- **Test Scenarios:** [e.g., "Normal load (100%), peak load (150%), stress test (200%)"]
- **Acceptance Criteria:** [e.g., "Response times within targets at 150% load, graceful degradation at 200%"]

---

## CM-6. Operational Readiness Requirements

### CM-6.1 Monitoring & Observability
- **Monitoring Stack:** [e.g., "Azure Monitor + Application Insights / CloudWatch + X-Ray / Cloud Monitoring + Trace"]
- **Dashboard Requirements:** [e.g., "Real-time dashboards for: system health, performance metrics, cost tracking, security alerts"]
- **Alerting:** [e.g., "Critical alerts within 1 minute, warnings within 5 minutes — integrated with existing ITSM (ServiceNow)"]
- **Log Aggregation:** [e.g., "All logs centralized in Log Analytics / CloudWatch Logs / Cloud Logging"]

### CM-6.2 Backup & Disaster Recovery
- **Backup Strategy:**
  - [e.g., "Daily automated backups with 30-day retention"]
  - [e.g., "Weekly backups retained for 12 months"]
  - [e.g., "Monthly backups retained for 7 years (compliance requirement)"]
- **Disaster Recovery:**
  - [e.g., "RTO: 4 hours, RPO: 1 hour for critical workloads"]
  - [e.g., "RTO: 24 hours, RPO: 4 hours for standard workloads"]
  - [e.g., "DR environment in secondary region, annual DR test required"]

### CM-6.3 Cost Management
- **Cost Visibility:** [e.g., "Resource tagging mandatory for cost allocation — vendor to implement tagging strategy"]
- **Budget Alerts:** [e.g., "Azure Budgets / AWS Budgets configured with 80% warning, 100% alert thresholds"]
- **Cost Optimization:** [e.g., "Vendor to propose reserved instances, savings plans, spot instances where appropriate"]
- **FinOps:** [e.g., "Monthly cost review meetings for first 6 months post go-live"]

### CM-6.4 Operational Runbooks
- **Standard Operating Procedures:** [e.g., "Vendor to deliver runbooks for: deployment, rollback, scaling, backup verification, incident response"]
- **On-call Rotation:** [e.g., "Vendor to define on-call rotation for hypercare period, transition to client or managed service provider"]

---

## CM-7. Migration Execution Requirements

### CM-7.1 Cutover Planning
- **Cutover Windows:** [e.g., "Primary cutover: Saturday 02:00-08:00; Fallback window: next Saturday"]
- **Cutover Checklist:** [e.g., "Vendor to provide detailed cutover runbook with: step-by-step procedures, rollback triggers, go/no-go decision points"]
- **Communication Plan:** [e.g., "Stakeholder notification schedule: 48hrs, 24hrs, 4hrs, go-live, completion, all-clear"]
- **Rollback Criteria:** [e.g., "Automatic rollback triggers: >5% data validation failures, >30 min performance degradation, any Critical security alert"]

### CM-7.2 Parallel Running (if applicable)
- **Parallel Period:** [e.g., "2-week parallel running for financial systems — old and new systems processing simultaneously"]
- **Reconciliation:** [e.g., "Daily reconciliation reports during parallel period, sign-off required before decommissioning old system"]

### CM-7.3 Decommissioning
- **Legacy Decommissioning Plan:** [e.g., "Vendor to provide plan for decommissioning on-premises infrastructure post go-live"]
- **Data Retention:** [e.g., "Archived data retained for 7 years per compliance requirements before secure destruction"]
- **Hardware Disposal:** [e.g., "Secure data destruction certificates required for all decommissioned storage devices"]

---

## CM-8. Cloud-Specific Vendor Requirements

### CM-8.1 Cloud Partner Status
- **Required:** [e.g., "Microsoft Gold Cloud Partner / AWS Advanced Consulting Partner / Google Cloud Premier Partner"]
- **Certifications:** [e.g., "Company must hold: Cloud Solution Provider status, Managed Partner status where applicable"]

### CM-8.2 Cloud-Specific Personnel Certifications
| Role | Required Certification |
|---|---|
| Cloud Architect | [e.g., Azure Solutions Architect Expert / AWS Solutions Architect Professional / Google Cloud Professional Cloud Architect] |
| Cloud Security Engineer | [e.g., Azure Security Engineer Associate / AWS Security Specialty] |
| DevOps Engineer | [e.g., Azure DevOps Engineer Expert / AWS DevOps Engineer Professional] |
| Database Administrator | [e.g., Azure Database Administrator Associate / AWS Database Specialty] |
| Data Engineer | [e.g., Azure Data Engineer Associate / AWS Data Analytics Specialty] |

### CM-8.3 Migration Tooling & IP
- **Proprietary Tools:** [e.g., "Vendor to disclose any proprietary migration tools and licensing costs"]
- **Open Source Tools:** [e.g., "Preference for open-source or cloud-native tools over third-party commercial tools"]
- **Automation Scripts:** [e.g., "All automation scripts, templates, and playbooks become client IP upon project completion"]

---

## CM-9. Cloud Pricing Specifics

### CM-9.1 Cloud Infrastructure Costs
[Clarify who pays for cloud infrastructure]
- **Option A — Client Direct:** [e.g., "Client pays cloud provider directly; vendor quotes professional services only"]
- **Option B — Vendor Resale:** [e.g., "Vendor resells cloud services with markup; provide transparent cost breakdown"]
- **Option C — Hybrid:** [e.g., "Vendor manages cloud spend with client reimbursement; monthly reconciliation required"]

### CM-9.2 Reserved Capacity Requirements
- **Reserved Instances:** [e.g., "Vendor to propose 1-year or 3-year reserved instances for predictable workloads"]
- **Savings Plans:** [e.g., "Evaluate compute savings plans vs. reserved instances"]
- **Commitment Impact:** [e.g., "Any reserved capacity commitments require client approval; cancellation penalties borne by party requesting cancellation"]

### CM-9.3 Egress & Data Transfer Costs
- **Data Transfer:** [e.g., "Vendor to estimate and disclose all data transfer/egress costs"]
- **Optimization:** [e.g., "Vendor to propose architecture minimizing data transfer costs (e.g., CDN, edge caching)"]

---

## CM-10. Post-Migration Optimization

### CM-10.1 Right-Sizing Review
- **Initial Sizing:** [e.g., "Vendor to propose initial resource sizing based on current utilization + 20% growth buffer"]
- **Right-Sizing Schedule:** [e.g., "Formal right-sizing review at: 30 days, 60 days, 90 days post go-live"]
- **Optimization Responsibility:** [e.g., "Vendor responsible for right-sizing recommendations during warranty period"]

### CM-10.2 Cost Optimization Review
- **Monthly Cost Reviews:** [e.g., "Monthly cost review during hypercare; quarterly thereafter"]
- **Optimization Recommendations:** [e.g., "Vendor to provide ongoing cost optimization recommendations during warranty"]
- **Tagging Compliance:** [e.g., "All resources must be tagged per client's tagging policy; untagged resources flagged for remediation"]

### CM-10.3 Performance Tuning
- **Performance Baseline:** [e.g., "Establish performance baseline within 2 weeks of go-live"]
- **Tuning Schedule:** [e.g., "Performance tuning sprints at: week 2, week 4, week 8 post go-live"]
- **Benchmarking:** [e.g., "Compare post-migration performance against pre-migration baseline and target metrics"]

---

## CM-11. Cloud Migration Scoring Additions

[Add these as additional sub-criteria under Category 1 (Technical Approach) in the Scoring Rubric]

| Sub-Criteria | Weight within Cat 1 | Notes |
|---|---|---|
| Migration Strategy Appropriateness | 5% | Is the proposed migration approach (rehost/replatform/refactor) appropriate for each workload? |
| Cloud Architecture Quality | 5% | Is the target architecture cloud-native, well-structured, and following best practices? |
| Data Migration Robustness | 5% | Is the data migration plan comprehensive with validation, rollback, and delta sync? |
| Security Architecture in Cloud | 5% | Does the security design leverage cloud-native security capabilities effectively? |
| Cost Optimization Approach | 5% | Has the vendor proposed meaningful cost optimizations beyond basic lift-and-shift? |
| Operational Readiness | 5% | Are monitoring, backup, DR, and runbooks well-planned? |

---

**END OF CLOUD MIGRATION ADDENDUM**
