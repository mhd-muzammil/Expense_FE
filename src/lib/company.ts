/**
 * Fixed company (seller) details printed on every invoice.
 * Sourced from the current "Renderways Technology Pvt Ltd" tax details.
 */
export const COMPANY = {
  name: 'Renderways Technology Pvt Ltd',
  address:
    'No. 25, 1st floor Gandhi street, Mettukuppam, Maduravoyal, Chennai-600095 ' +
    'Phone no:9543095480  |  No:22/26 LIC Colony, Hotel Vasantham Road, OPP.New Bus stand, ' +
    'Salem - 636004 Phone : 8122633004  |  No.20/12, 1st West Highway Road, Katpadi(PO), ' +
    'Gandhi Nagar, Vellore-632006. Phone no: 82206 60352, Chennai, Tamil Nadu (TN-33) 600095, IN',
  phone: '+91 95430 95480',
  email: 'support@renderways.in',
  website: 'www.renderways.in',
  gstin: '33AALCR1788A1ZG',
  // Place these image files in expense_frontend/public/ (Vite serves them at root).
  // If missing, the document falls back to a text logo / no stamp.
  logo: '/renderways-logo.png',
  stamp: '/renderways-stamp.png',
} as const
