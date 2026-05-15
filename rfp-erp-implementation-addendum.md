
# Appendix: ERP Implementation Specific Requirements

**Attach this as an addendum to the Master RFP Template when the project involves ERP implementation, upgrade, or support.**

---

## ERP-1. ERP Implementation Overview

### ERP-1.1 Project Type
- [ ] **New Implementation** — Greenfield deployment of new ERP system
- [ ] **Migration** — Replace existing ERP with new platform
- [ ] **Upgrade** — Major version upgrade (e.g., ECC to S/4HANA, Dynamics NAV to Business Central)
- [ ] **Expansion** — Add modules/users/geographies to existing ERP
- [ ] **Consolidation** — Merge multiple ERP instances into single platform
- [ ] **Support & Optimization** — Post-implementation support, tuning, and enhancement

### ERP-1.2 ERP Platform
- **Target ERP System:** [e.g., SAP S/4HANA / Oracle NetSuite / Microsoft Dynamics 365 / Sage Intacct / Workday / Custom]
- **Version/Release:** [e.g., "SAP S/4HANA 2023, cloud edition"]
- **Deployment Model:** [Cloud SaaS / Cloud hosted (IaaS) / On-premises / Hybrid]
- **Licensing Model:** [Subscription / Perpetual / User-based / Module-based]

### ERP-1.3 Module Scope
[Define which modules are IN SCOPE for this project]

| Module | In Scope? | Phase | Notes |
|---|---|---|---|
| **Financial Management** | [Yes/No] | [Phase 1/2/3] | [e.g., GL, AP, AR, Fixed Assets, Consolidation] |
| **Supply Chain Management** | [Yes/No] | [Phase 1/2/3] | [e.g., Procurement, Inventory, Warehousing] |
| **Manufacturing / Production** | [Yes/No] | [Phase 1/2/3] | [e.g., MRP, Shop floor, Quality, BOM] |
| **Sales & Distribution** | [Yes/No] | [Phase 1/2/3] | [e.g., Order-to-cash, Pricing, Shipping] |
| **Human Capital Management** | [Yes/No] | [Phase 1/2/3] | [e.g., HR, Payroll, Talent, Time] |
| **Customer Relationship Mgmt** | [Yes/No] | [Phase 1/2/3] | [e.g., May integrate with existing CRM rather than native] |
| **Business Intelligence / Reporting** | [Yes/No] | [Phase 1/2/3] | [e.g., Embedded analytics, custom reports, dashboards] |
| **Project Management** | [Yes/No] | [Phase 1/2/3] | [e.g., Project accounting, resource planning] |
| **Asset Management** | [Yes/No] | [Phase 1/2/3] | [e.g., EAM integration or native module] |
| **E-Commerce / B2B Portal** | [Yes/No] | [Phase 1/2/3] | [e.g., Customer portal, vendor portal] |

### ERP-1.4 Geographical Scope
- **Countries/Regions:** [e.g., "US, UK, Germany, Singapore"]
- **Localization Requirements:** [e.g., "Local GAAP compliance, statutory reporting, multi-currency, multi-language"]
- **Data Residency:** [e.g., "EU data in EU data centers, APAC data in APAC data centers"]
- **Language Requirements:** [e.g., "English (primary), German, Mandarin — UI and documentation"]

---

## ERP-2. Business Process Requirements

### ERP-2.1 Current State Process Assessment
[Vendor required to document current state during Discovery]
- **Process Areas to Map:** [e.g., "Order-to-Cash, Procure-to-Pay, Record-to-Report, Hire-to-Retire"]
- **As-Is Documentation:** [e.g., "Vendor to document current state process flows with pain points and inefficiencies"]
- **Stakeholder Workshops:** [e.g., "Minimum 20 workshops across business units during Discovery phase"]

### ERP-2.2 Future State Process Design
- **To-Be Process Ownership:** [e.g., "Vendor leads design with client business process owners"]
- **Standardization vs. Localization:** [e.g., "Global template with local variations where legally/operationally required"]
- **Process Approval:** [e.g., "All to-be process designs require sign-off from process owner and steering committee"]

### ERP-2.3 Process Maturity & KPIs
- **Process KPIs:** [e.g., "Define KPIs for each core process: O2C cycle time, P2P automation rate, month-end close duration"]
- **Baseline Metrics:** [e.g., "Capture current baseline for all KPIs to measure improvement"]
- **Target Metrics:** [e.g., "Set targets: reduce month-end close from 10 days to 5 days, increase P2P touchless rate to 80%"]

---

## ERP-3. Configuration vs. Customization Policy

### ERP-3.1 Configuration-First Philosophy
- **Preferred Approach:** [e.g., "Maximum use of standard functionality and configuration; customization only where justified"]
- **Customization Threshold:** [e.g., "Any customization requiring code development requires steering committee approval"]
- **Customization Governance:** [e.g., "All customizations documented with: business justification, maintenance impact, upgrade risk"]

### ERP-3.2 Customization Requirements (if any)
| Customization | Business Justification | Effort Estimate | Maintenance Impact | Upgrade Risk |
|---|---|---|---|---|
| [e.g., Custom workflow for approval] | [e.g., "Unique regulatory requirement"] | [e.g., 80 hours] | [Low] | [Low] |
| [e.g., Custom report] | [e.g., "Board reporting requirement not met by standard"] | [e.g., 40 hours] | [Medium] | [Medium] |

### ERP-3.3 Integration vs. Customization
- **Integration Preference:** [e.g., "Prefer integration with best-of-breed tools over ERP customization"]
- **Integration Standards:** [e.g., "Use ERP's standard APIs and integration frameworks where available"]

---

## ERP-4. Data Migration Requirements

### ERP-4.1 Data Migration Scope
| Data Type | Source System | Volume | Historical Period | Migration Method | Validation |
|---|---|---|---|---|---|
| **Master Data** | [e.g., Legacy ERP] | [e.g., 50K customers, 100K products] | [N/A — current state] | [ETL + validation] | [Match 100%] |
| **Open Transactions** | [e.g., Legacy ERP] | [e.g., 10K open orders] | [Current open items] | [Cutover load] | [Match 100%] |
| **Historical Transactions** | [e.g., Legacy ERP] | [e.g., 5M transactions] | [7 years] | [Batch ETL] | [Sample validation] |
| **Balances** | [e.g., Legacy ERP] | [e.g., All GL accounts] | [N/A] | [Cutover load] | [Match 100%] |

### ERP-4.2 Data Migration Phases
- **Phase 1 — Master Data:** [e.g., "Migrate all master data (customers, vendors, products, chart of accounts) 4 weeks before go-live"]
- **Phase 2 — Historical Data:** [e.g., "Migrate historical transactions in background during UAT"]
- **Phase 3 — Open Transactions:** [e.g., "Migrate open transactions during cutover weekend"]
- **Phase 4 — Balances:** [e.g., "Load opening balances at go-live; reconcile to the penny"]

### ERP-4.3 Data Quality & Cleansing
- **Data Quality Responsibility:** [e.g., "Client owns business data quality rules; Vendor owns technical data migration and format validation"]
- **Cleansing Requirements:** [e.g., "Duplicate customer/vendor consolidation, product master standardization, chart of accounts harmonization"]
- **Data Validation:** [e.g., "Automated validation scripts for: referential integrity, business rule compliance, reconciliation"]

### ERP-4.4 Parallel Ledger / Dual Reporting (if applicable)
- **Dual Reporting Period:** [e.g., "Run parallel reporting for 1 month post go-live to validate new ERP output against legacy"]
- **Reconciliation:** [e.g., "Daily reconciliation during parallel period; variance investigation for any discrepancy >0.1%"]

---

## ERP-5. Integration Requirements

### ERP-5.1 Integration Landscape
[Attach integration diagram in Appendix B]

| System | Integration Type | Direction | Frequency | Method | ERP Module |
|---|---|---|---|---|---|
| [e.g., Salesforce CRM] | [Real-time API] | [Bi-directional] | [Real-time] | [REST API] | [Sales] |
| [e.g., Concur Expense] | [Batch] | [Inbound] | [Daily] | [Flat file / API] | [AP / HCM] |
| [e.g., Workday HCM] | [Real-time API] | [Bi-directional] | [Event-driven] | [REST API] | [HCM / Payroll] |
| [e.g., Banks] | [File-based] | [Outbound] | [Daily] | [SFTP / SWIFT] | [Treasury / AP] |
| [e.g., EDI Partners] | [Message-based] | [Bi-directional] | [Event-driven] | [EDI / AS2] | [SD / MM] |
| [e.g., BI/Data Warehouse] | [Batch / CDC] | [Outbound] | [Hourly] | [ETL / CDC] | [All modules] |
| [e.g., Custom Apps] | [API] | [Bi-directional] | [Varies] | [REST / OData] | [Varies] |

### ERP-5.2 Integration Standards
- **API Standards:** [e.g., "RESTful APIs with OpenAPI documentation, OData where supported by ERP"]
- **Middleware:** [e.g., "Prefer ERP-native integration tools (SAP Integration Suite / Dynamics Dataverse / NetSuite SuiteTalk)"]
- **Third-Party Middleware:** [e.g., "Boomi, MuleSoft, or Azure Integration Services acceptable with justification"]
- **Error Handling:** [e.g., "All integrations must have: retry logic, dead letter queues, alerting, reconciliation reports"]

### ERP-5.3 EDI Requirements (if applicable)
- **EDI Standards:** [e.g., "X12, EDIFACT, ODETTE — specify which"]
- **EDI Partners:** [e.g., "List of EDI trading partners and volume"]
- **Mapping:** [e.g., "Vendor responsible for EDI mapping to ERP standard documents"]

---

## ERP-6. Reporting & Analytics Requirements

### ERP-6.1 Operational Reporting
- **Standard Reports:** [e.g., "All standard ERP reports must be available and validated"]
- **Custom Reports:** [e.g., "Vendor to reproduce critical legacy custom reports in new ERP; estimate effort per report"]
- **Report Distribution:** [e.g., "Scheduled report distribution via email, portal, or integration to BI platform"]

### ERP-6.2 Management / Board Reporting
- **Financial Reporting:** [e.g., "Monthly management accounts, quarterly board packs, annual statutory accounts"]
- **Consolidation:** [e.g., "Multi-entity consolidation with intercompany eliminations"]
- **Currency Translation:** [e.g., "Multi-currency reporting with automated translation and revaluation"]

### ERP-6.3 Business Intelligence Integration
- **BI Platform:** [e.g., "Integration with existing [Power BI / Tableau / Looker] OR implementation of embedded ERP analytics"]
- **Data Warehouse:** [e.g., "ERP as source system for corporate data warehouse; CDC or scheduled extraction"]
- **Self-Service Analytics:** [e.g., "Enable business users to create ad-hoc reports without IT dependency"]

### ERP-6.4 Real-Time Analytics
- **Real-Time Dashboards:** [e.g., "Executive dashboards showing: cash position, order backlog, production status, inventory levels"]
- **Alerting:** [e.g., "Exception-based alerts: overdue orders, stock-outs, budget variances"]

---

## ERP-7. Testing Requirements

### ERP-7.1 Testing Phases
- **Unit Testing:** [e.g., "Vendor responsibility — each configuration and customization unit tested"]
- **Integration Testing:** [e.g., "Joint responsibility — all integrations tested end-to-end"]
- **System Testing:** [e.g., "Vendor-led — full system test covering all modules and processes"]
- **User Acceptance Testing (UAT):** [e.g., "Client-led with vendor support — business users execute real scenarios"]
- **Regression Testing:** [e.g., "Automated regression test suite for all customizations"]

### ERP-7.2 UAT Requirements
- **UAT Scenarios:** [e.g., "Minimum 200 test scenarios covering all core business processes"]
- **UAT Data:** [e.g., "Use masked production data for realistic testing; data must represent all business scenarios"]
- **UAT Sign-off:** [e.g., "Business process owners must sign off on their respective module UAT before go-live"]
- **UAT Defect Tolerance:** [e.g., "Zero Critical, maximum 5 High defects per module at UAT sign-off"]

### ERP-7.3 Performance Testing
- **Concurrent User Load:** [e.g., "Test with 150% of expected peak concurrent users"]
- **Batch Job Performance:** [e.g., "Month-end batch jobs must complete within 4 hours"]
- **Report Performance:** [e.g., "Standard reports must generate in <30 seconds; complex reports in <5 minutes"]

---

## ERP-8. Training & Change Management

### ERP-8.1 Training Strategy
- **Training Phases:**
  - **Phase 1 — Project Team:** [e.g., "Core team trained during build — super users and process owners"]
  - **Phase 2 — End Users:** [e.g., "Role-based training 2-4 weeks before go-live"]
  - **Phase 3 — Ongoing:** [e.g., "Refresher training and new hire onboarding post go-live"]

### ERP-8.2 Training Delivery
| Audience | Training Format | Duration | Timing | Count |
|---|---|---|---|---|
| **Executive Sponsors** | [Executive briefing] | [4 hours] | [Pre-go-live] | [5] |
| **Process Owners / Super Users** | [Hands-on workshop] | [40 hours] | [During build] | [20] |
| **End Users (by role)** | [Role-based e-learning + lab] | [8-16 hours] | [Pre go-live] | [500] |
| **IT Support Staff** | [Technical training] | [40 hours] | [Pre go-live] | [10] |
| **Report Developers** | [Report writing workshop] | [16 hours] | [Pre go-live] | [5] |

### ERP-8.3 Training Materials
- **Required Deliverables:**
  - [ ] Training manuals (digital and printable)
  - [ ] Quick reference guides
  - [ ] Video tutorials for common tasks
  - [ ] Sandbox environment for self-paced practice
  - [ ] FAQ and troubleshooting guide

### ERP-8.4 Change Management
- **Change Impact Assessment:** [e.g., "Vendor to conduct change impact assessment and report on organizational readiness"]
- **Communication Plan:** [e.g., "Vendor to support development of communication plan: town halls, email campaigns, intranet updates"]
- **Resistance Management:** [e.g., "Identify potential resistance points and mitigation strategies"]
- **Adoption Metrics:** [e.g., "Track login rates, feature utilization, support ticket volume as adoption indicators"]

---

## ERP-9. Go-Live & Hypercare

### ERP-9.1 Go-Live Approach
- **Go-Live Strategy:** [Big bang / Phased by module / Phased by geography / Phased by business unit]
- **Big Bang Criteria:** [e.g., "Acceptable if: <500 users, single country, simple data, strong change readiness"]
- **Phased Criteria:** [e.g., "Required if: >1000 users, multi-country, complex data, high change resistance"]

### ERP-9.2 Cutover Plan
- **Cutover Weekend:** [e.g., "Friday 18:00 — Monday 08:00 window"]
- **Cutover Activities:** [e.g., "Final data sync, balance reconciliation, go-live checklist, smoke tests"]
- **Rollback Plan:** [e.g., "Documented rollback procedure with decision checkpoint at Sunday 12:00"]

### ERP-9.3 Hypercare Support
- **Hypercare Duration:** [e.g., "4 weeks intensive, 8 weeks standard"]
- **Support Structure:**
  - **Level 1:** [e.g., "Client IT helpdesk — basic queries, password resets"]
  - **Level 2:** [e.g., "Vendor functional consultants — process questions, configuration issues"]
  - **Level 3:** [e.g., "Vendor technical team — bugs, customizations, integrations"]
- **Response Times:**
  - Critical (system down / cannot process transactions): [1 hour response, 4 hour resolution]
  - High (major function impaired): [4 hour response, 24 hour resolution]
  - Medium (workaround available): [24 hour response, 5 business days resolution]
  - Low (enhancement / question): [48 hour response, next release]
- **On-site Presence:** [e.g., "Vendor functional leads on-site for first 2 weeks; remote support acceptable thereafter"]

---

## ERP-10. Post-Implementation Support & Warranty

### ERP-10.1 Warranty Period
- **Duration:** [e.g., "6 months from go-live"]
- **Coverage:** [e.g., "All defects in delivered configuration, customization, documentation, and training materials"]
- **Exclusions:** [e.g., "Warranty does not cover: client-caused data errors, third-party system changes, new requirements"]

### ERP-10.2 Support Transition
- **Knowledge Transfer:** [e.g., "Comprehensive knowledge transfer to client IT team during months 3-4 of hypercare"]
- **Documentation Handover:** [e.g., "All configuration documentation, custom code, integration specs, runbooks"]
- **Access Transfer:** [e.g., "Admin access transferred to client; vendor access revoked or reduced to read-only"]

### ERP-10.3 Ongoing Support Options
- **Option A — Client Self-Support:** [e.g., "Client manages post-warranty; vendor available on T&M basis for major enhancements"]
- **Option B — Managed Service:** [e.g., "Vendor or partner provides ongoing managed service — separate RFP/negotiation"]
- **Option C — Hybrid:** [e.g., "Client handles L1/L2, vendor/partner handles L3 and enhancements"]

---

## ERP-11. ERP-Specific Vendor Requirements

### ERP-11.1 ERP Partner Status
- **Required Status:** [e.g., "SAP Platinum Partner / Microsoft Gold Partner / Oracle Diamond Partner / NetSuite 5-Star Partner"]
- **Specializations:** [e.g., "Partner must hold specialization in: [industry] / [module] / [geography]"]

### ERP-11.2 ERP Certifications
| Role | Required Certification |
|---|---|
| **ERP Project Manager** | [e.g., SAP Activate Certified / Microsoft Dynamics 365 Implementation methodology] |
| **Functional Lead (Finance)** | [e.g., SAP S/4HANA Financials Certification / Dynamics 365 Finance Functional Consultant] |
| **Functional Lead (SCM)** | [e.g., SAP S/4HANA Sourcing and Procurement / Dynamics 365 Supply Chain Functional Consultant] |
| **Technical Architect** | [e.g., SAP HANA Certification / Dynamics 365 Solution Architect] |
| **Integration Specialist** | [e.g., SAP Integration Suite / Azure Integration Services] |
| **Data Migration Specialist** | [e.g., SAP Data Migration Certification / Proven data migration experience] |
| **Basis/Admin** | [e.g., SAP HANA Administration / Azure/Dynamics 365 Administration] |

### ERP-11.3 Industry Experience
- **Vertical Expertise:** [e.g., "Minimum 3 ERP implementations in [manufacturing / retail / healthcare / professional services]"]
- **Similar Scale:** [e.g., "Minimum 1 implementation of comparable user count and geographic complexity"]

---

## ERP-12. ERP Pricing Specifics

### ERP-12.1 License Costs
- **License Model:** [e.g., "Perpetual + maintenance OR Subscription (SaaS)"]
- **User Counts:**
  - **Full Users:** [e.g., 100]
  - **Limited Users:** [e.g., 300]
  - **Self-Service Users:** [e.g., 500]
- **Module Pricing:** [e.g., "Break down by module if module-based licensing"]
- **Who Purchases:** [e.g., "Client purchases licenses directly from publisher / Vendor resells with client approval"]

### ERP-12.2 Implementation Pricing
- **Fixed Components:** [e.g., "Discovery, standard configuration, training, standard reports — fixed price"]
- **Variable Components:** [e.g., "Customizations, integrations, data migration volume, complex reports — T&M or unit-priced"]
- **Change Request Pricing:** [e.g., "Day rates by role for out-of-scope changes"]

### ERP-12.3 Ongoing Costs
- **Annual Maintenance:** [e.g., "Publisher maintenance/support fees (typically 18-22% of license cost for perpetual)"]
- **Hosting Costs:** [e.g., "If cloud-hosted: infrastructure costs"]
- **Support Costs:** [e.g., "Post-warranty support pricing"]

---

## ERP-13. ERP Scoring Additions

[Add these as additional sub-criteria under Category 1 (Technical Approach) in the Scoring Rubric]

| Sub-Criteria | Weight within Cat 1 | Notes |
|---|---|---|
| ERP Solution Fit | 5% | Does the proposed ERP solution fit the client's size, complexity, and industry? |
| Implementation Methodology | 5% | Is the implementation approach (activate, sure step, etc.) appropriate and well-planned? |
| Data Migration Strategy | 5% | Is the data migration plan comprehensive with validation and reconciliation? |
| Integration Architecture | 5% | Are integration designs robust, using appropriate tools and standards? |
| Change Management Approach | 5% | Is the training and change management plan adequate for user adoption? |
| Industry Template / Accelerators | 5% | Does the vendor offer pre-built content, templates, or accelerators specific to the industry? |

---

**END OF ERP IMPLEMENTATION ADDENDUM**
