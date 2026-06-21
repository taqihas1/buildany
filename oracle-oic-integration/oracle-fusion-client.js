const axios = require('axios');

class OracleFusionClient {
  constructor(baseUrl, clientId, clientSecret) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
  }

  async authenticate() {
    const tokenUrl = `${this.baseUrl}/oauth2/v1/token`;
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'urn:opc:idm:t.user.me'
    });

    try {
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      this.accessToken = response.data.access_token;
      console.log('✅ Authenticated successfully');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async createJournalEntry(journalData) {
    const url = `${this.baseUrl}/fscmRestApi/resources/11.13.18.05/journalEntries`;
    
    try {
      const response = await axios.post(url, journalData, {
        headers: {
          'Content-Type': 'application/vnd.oracle.adf.resourceitem+json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      console.log('✅ Journal Entry Created:', response.data.JournalEntryId || response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create journal entry:', error.response?.data || error.message);
      throw error;
    }
  }

  async createAPInvoice(invoiceData) {
    const url = `${this.baseUrl}/fscmRestApi/resources/11.13.18.05/payablesInvoices`;
    
    try {
      const response = await axios.post(url, invoiceData, {
        headers: {
          'Content-Type': 'application/vnd.oracle.adf.resourceitem+json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      console.log('✅ AP Invoice Created:', response.data.InvoiceId || response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create AP invoice:', error.response?.data || error.message);
      throw error;
    }
  }

  async getJournalEntries(query = '') {
    const url = `${this.baseUrl}/fscmRestApi/resources/11.13.18.05/journalEntries${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get journal entries:', error.response?.data || error.message);
      throw error;
    }
  }
}

// ===== USAGE EXAMPLE =====

async function main() {
  // CONFIGURE THESE
  const fusionUrl = 'https://your-instance.oraclecloud.com';
  const clientId = 'YOUR_CLIENT_ID';
  const clientSecret = 'YOUR_CLIENT_SECRET';

  const client = new OracleFusionClient(fusionUrl, clientId, clientSecret);

  // 1. Authenticate
  await client.authenticate();

  // 2. Create Journal Entry
  const journalEntry = {
    JournalName: 'API-TEST-001',
    AccountingDate: '2026-05-23',
    JournalSource: 'Manual',
    JournalCategory: 'Adjustment',
    CurrencyCode: 'USD',
    journalEntryLines: [
      {
        AccountCombination: '01.110.1110.0000.000',
        EnteredDebitAmount: 1000.00,
        EnteredCreditAmount: 0,
        Description: 'API test debit'
      },
      {
        AccountCombination: '01.210.2110.0000.000',
        EnteredDebitAmount: 0,
        EnteredCreditAmount: 1000.00,
        Description: 'API test credit'
      }
    ]
  };

  await client.createJournalEntry(journalEntry);

  // 3. Create AP Invoice
  const apInvoice = {
    BusinessUnit: 'US001',
    InvoiceNumber: 'API-INV-001',
    InvoiceDate: '2026-05-23',
    InvoiceCurrency: 'USD',
    InvoiceAmount: 1500.00,
    Supplier: 'Acme Corp',
    SupplierSite: 'MAIN',
    invoiceLines: [
      {
        LineNumber: 1,
        LineAmount: 1500.00,
        DistributionCombination: '01.510.5110.0000.000',
        Description: 'API test invoice'
      }
    ]
  };

  await client.createAPInvoice(apInvoice);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = OracleFusionClient;
