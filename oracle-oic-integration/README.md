# Oracle Fusion Financials - REST API Integration Guide

## Base URL
```
https://{fusion-instance}.oraclecloud.com/fscmRestApi/resources/11.13.18.05/
```

## Authentication

### Option 1: OAuth 2.0 (Recommended for Production)
```bash
curl -X POST \
  https://{fusion-instance}.oraclecloud.com/oauth2/v1/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=urn:opc:idm:t.user.me'
```

### Option 2: Basic Auth (for testing)
```bash
curl -u 'username:password' \
  https://{fusion-instance}.oraclecloud.com/fscmRestApi/resources/11.13.18.05/journalEntries
```

## Common Endpoints

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Create Journal Entry | `/journalEntries` | POST |
| Get Journal Entries | `/journalEntries` | GET |
| Create AP Invoice | `/payablesInvoices` | POST |
| Create AR Receipt | `/receivablesReceipts` | POST |
| Create Supplier | `/suppliers` | POST |

## 1. Create Journal Entry (GL)

### Request
```json
{
  "JournalName": "ADJ-2026-001",
  "AccountingDate": "2026-05-23",
  "JournalSource": "Manual",
  "JournalCategory": "Adjustment",
  "CurrencyCode": "USD",
  "journalEntryLines": [
    {
      "AccountCombination": "01.110.1110.0000.000",
      "EnteredDebitAmount": 1000.00,
      "EnteredCreditAmount": 0,
      "Description": "Test debit entry"
    },
    {
      "AccountCombination": "01.210.2110.0000.000",
      "EnteredDebitAmount": 0,
      "EnteredCreditAmount": 1000.00,
      "Description": "Test credit entry"
    }
  ]
}
```

### cURL
```bash
curl -X POST \
  https://{fusion-instance}.oraclecloud.com/fscmRestApi/resources/11.13.18.05/journalEntries \
  -H 'Content-Type: application/vnd.oracle.adf.resourceitem+json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d @journal-entry.json
```

## 2. Create AP Invoice

### Request
```json
{
  "BusinessUnit": "US001",
  "InvoiceNumber": "INV-2026-001",
  "InvoiceDate": "2026-05-23",
  "InvoiceCurrency": "USD",
  "InvoiceAmount": 1500.00,
  "Supplier": "Supplier Name",
  "SupplierSite": "MAIN",
  "invoiceLines": [
    {
      "LineNumber": 1,
      "LineAmount": 1500.00,
      "DistributionCombination": "01.510.5110.0000.000",
      "Description": "Office supplies"
    }
  ]
}
```

## 3. Oracle Integration Cloud (OIC) Flow

### OIC App-Driven Orchestration

```
[Trigger: REST Adapter]
    ↓
[Map: Transform Input to Fusion Format]
    ↓
[Invoke: Oracle ERP Cloud Adapter]
    ↓
[Map: Transform Response]
    ↓
[Reply: Return Status]
```

### OIC Adapter Configuration

**Oracle ERP Cloud Adapter:**
- Connection Type: Oracle ERP Cloud
- Connection URL: `https://{fusion-instance}.oraclecloud.com`
- Security Policy: Username Password Token / OAuth
- Service Catalog: Select `journalEntries` or target service

### OIC Mapping Example (XSLT)
```xml
<xsl:template match="/">
  <ns0:journalEntry>
    <ns0:JournalName><xsl:value-of select="/input/JournalName"/></ns0:JournalName>
    <ns0:AccountingDate><xsl:value-of select="/input/AccountingDate"/></ns0:AccountingDate>
    <ns0:CurrencyCode><xsl:value-of select="/input/CurrencyCode"/></ns0:CurrencyCode>
    <ns0:journalEntryLines>
      <xsl:for-each select="/input/Lines">
        <ns0:JournalEntryLine>
          <ns0:AccountCombination><xsl:value-of select="Account"/></ns0:AccountCombination>
          <ns0:EnteredDebitAmount><xsl:value-of select="Debit"/></ns0:EnteredDebitAmount>
          <ns0:EnteredCreditAmount><xsl:value-of select="Credit"/></ns0:EnteredCreditAmount>
        </ns0:JournalEntryLine>
      </xsl:for-each>
    </ns0:journalEntryLines>
  </ns0:journalEntry>
</xsl:template>
```

## Node.js Client Example

See `oracle-fusion-client.js` for working code.

## Python Client Example

See `oracle-fusion-client.py` for working code.

## Files in This Package

- `README.md` — This guide
- `oracle-fusion-client.js` — Node.js REST client
- `oracle-fusion-client.py` — Python REST client
- `sample-journal-entry.json` — Sample GL payload
- `sample-ap-invoice.json` — Sample AP payload
- `oic-flow-config.xml` — OIC export template (manual setup guide)
