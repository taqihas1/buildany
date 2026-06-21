import requests
from urllib.parse import urlencode

class OracleFusionClient:
    def __init__(self, base_url: str, client_id: str, client_secret: str):
        self.base_url = base_url.rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None

    def authenticate(self) -> str:
        """Get OAuth 2.0 access token."""
        token_url = f"{self.base_url}/oauth2/v1/token"
        data = {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'scope': 'urn:opc:idm:t.user.me'
        }

        try:
            response = requests.post(token_url, data=data)
            response.raise_for_status()
            self.access_token = response.json()['access_token']
            print("✅ Authenticated successfully")
            return self.access_token
        except requests.exceptions.RequestException as e:
            print(f"❌ Authentication failed: {e}")
            raise

    def _headers(self) -> dict:
        return {
            'Content-Type': 'application/vnd.oracle.adf.resourceitem+json',
            'Authorization': f'Bearer {self.access_token}'
        }

    def create_journal_entry(self, journal_data: dict) -> dict:
        """Create a GL Journal Entry."""
        url = f"{self.base_url}/fscmRestApi/resources/11.13.18.05/journalEntries"

        try:
            response = requests.post(url, json=journal_data, headers=self._headers())
            response.raise_for_status()
            result = response.json()
            print(f"✅ Journal Entry Created: {result.get('JournalEntryId', result)}")
            return result
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to create journal entry: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(e.response.text)
            raise

    def create_ap_invoice(self, invoice_data: dict) -> dict:
        """Create an AP Invoice."""
        url = f"{self.base_url}/fscmRestApi/resources/11.13.18.05/payablesInvoices"

        try:
            response = requests.post(url, json=invoice_data, headers=self._headers())
            response.raise_for_status()
            result = response.json()
            print(f"✅ AP Invoice Created: {result.get('InvoiceId', result)}")
            return result
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to create AP invoice: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(e.response.text)
            raise

    def get_journal_entries(self, query: str = '') -> dict:
        """Query journal entries."""
        url = f"{self.base_url}/fscmRestApi/resources/11.13.18.05/journalEntries"
        if query:
            url += f"?q={urlencode({'q': query})['q']}"

        try:
            response = requests.get(url, headers={'Authorization': f'Bearer {self.access_token}'})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to get journal entries: {e}")
            raise


def main():
    # ===== CONFIGURE THESE =====
    fusion_url = 'https://your-instance.oraclecloud.com'
    client_id = 'YOUR_CLIENT_ID'
    client_secret = 'YOUR_CLIENT_SECRET'

    client = OracleFusionClient(fusion_url, client_id, client_secret)

    # 1. Authenticate
    client.authenticate()

    # 2. Create Journal Entry
    journal_entry = {
        "JournalName": "API-TEST-001",
        "AccountingDate": "2026-05-23",
        "JournalSource": "Manual",
        "JournalCategory": "Adjustment",
        "CurrencyCode": "USD",
        "journalEntryLines": [
            {
                "AccountCombination": "01.110.1110.0000.000",
                "EnteredDebitAmount": 1000.00,
                "EnteredCreditAmount": 0,
                "Description": "API test debit"
            },
            {
                "AccountCombination": "01.210.2110.0000.000",
                "EnteredDebitAmount": 0,
                "EnteredCreditAmount": 1000.00,
                "Description": "API test credit"
            }
        ]
    }

    client.create_journal_entry(journal_entry)

    # 3. Create AP Invoice
    ap_invoice = {
        "BusinessUnit": "US001",
        "InvoiceNumber": "API-INV-001",
        "InvoiceDate": "2026-05-23",
        "InvoiceCurrency": "USD",
        "InvoiceAmount": 1500.00,
        "Supplier": "Acme Corp",
        "SupplierSite": "MAIN",
        "invoiceLines": [
            {
                "LineNumber": 1,
                "LineAmount": 1500.00,
                "DistributionCombination": "01.510.5110.0000.000",
                "Description": "API test invoice"
            }
        ]
    }

    client.create_ap_invoice(ap_invoice)


if __name__ == "__main__":
    main()
