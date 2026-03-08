import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Lender from './src/models/Lender.js';

await connectDB();

const lenders = [
  {
    lenderId: 'LND001',
    name: 'FinFirst NBFC',
    type: 'NBFC',
    rbiRegistrationNumber: 'N-14.03286',
    logo: 'finfirst_logo.png',
    tagline: 'Your first step to credit',
    establishedYear: 2018,
    loanOffering: {
      minLoanAmount: 10000,
      maxLoanAmount: 200000,
      interestRateRange: { min: 14, max: 28 },
      tenureRange: { minMonths: 6, maxMonths: 24 },
      processingFeePercentage: 2.5
    },
    ntcPolicy: {
      acceptsNTC: true,
      minimumNtcScore: 600,
      acceptedRiskTiers: ['tier-1', 'tier-2']
    },
    disbursal: {
      averageDisbursalHours: 24,
      disbursalMode: 'direct_bank_transfer'
    },
    reputation: { rating: 4.2, totalLoansDisbursed: 15000 },
    contact: {
      website: 'https://www.finfirst.in',
      supportEmail: 'support@finfirst.in'
    },
    status: 'active'
  },

  {
    lenderId: 'LND002',
    name: 'SwiftCredit Finance',
    type: 'NBFC',
    rbiRegistrationNumber: 'N-14.03412',
    logo: 'swiftcredit_logo.png',
    tagline: 'Fast credit for new borrowers',
    establishedYear: 2019,
    loanOffering: {
      minLoanAmount: 15000,
      maxLoanAmount: 300000,
      interestRateRange: { min: 12, max: 24 },
      tenureRange: { minMonths: 6, maxMonths: 36 },
      processingFeePercentage: 2.0
    },
    ntcPolicy: {
      acceptsNTC: true,
      minimumNtcScore: 650,
      acceptedRiskTiers: ['tier-1']
    },
    disbursal: {
      averageDisbursalHours: 12,
      disbursalMode: 'direct_bank_transfer'
    },
    reputation: { rating: 4.5, totalLoansDisbursed: 28000 },
    contact: {
      website: 'https://www.swiftcredit.in',
      supportEmail: 'support@swiftcredit.in'
    },
    status: 'active'
  },

  {
    lenderId: 'LND003',
    name: 'BridgeCapital NBFC',
    type: 'NBFC',
    rbiRegistrationNumber: 'N-14.03589',
    logo: 'bridgecapital_logo.png',
    tagline: 'Building credit bridges',
    establishedYear: 2017,
    loanOffering: {
      minLoanAmount: 10000,
      maxLoanAmount: 150000,
      interestRateRange: { min: 18, max: 36 },
      tenureRange: { minMonths: 3, maxMonths: 18 },
      processingFeePercentage: 3.0
    },
    ntcPolicy: {
      acceptsNTC: true,
      minimumNtcScore: 550,
      acceptedRiskTiers: ['tier-1', 'tier-2', 'tier-3']
    },
    disbursal: {
      averageDisbursalHours: 48,
      disbursalMode: 'direct_bank_transfer'
    },
    reputation: { rating: 3.9, totalLoansDisbursed: 9000 },
    contact: {
      website: 'https://www.bridgecapital.in',
      supportEmail: 'support@bridgecapital.in'
    },
    status: 'active'
  },

  {
    lenderId: 'LND004',
    name: 'NeoLend Finance',
    type: 'NBFC',
    rbiRegistrationNumber: 'N-14.03701',
    logo: 'neolend_logo.png',
    tagline: 'Modern lending for modern India',
    establishedYear: 2020,
    loanOffering: {
      minLoanAmount: 20000,
      maxLoanAmount: 500000,
      interestRateRange: { min: 11, max: 22 },
      tenureRange: { minMonths: 12, maxMonths: 36 },
      processingFeePercentage: 1.5
    },
    ntcPolicy: {
      acceptsNTC: true,
      minimumNtcScore: 700,
      acceptedRiskTiers: ['tier-1']
    },
    disbursal: {
      averageDisbursalHours: 8,
      disbursalMode: 'direct_bank_transfer'
    },
    reputation: { rating: 4.7, totalLoansDisbursed: 42000 },
    contact: {
      website: 'https://www.neolend.in',
      supportEmail: 'support@neolend.in'
    },
    status: 'active'
  },

  {
    lenderId: 'LND005',
    name: 'GrowthPath NBFC',
    type: 'NBFC',
    rbiRegistrationNumber: 'N-14.03834',
    logo: 'growthpath_logo.png',
    tagline: 'Growing with every borrower',
    establishedYear: 2016,
    loanOffering: {
      minLoanAmount: 10000,
      maxLoanAmount: 250000,
      interestRateRange: { min: 16, max: 30 },
      tenureRange: { minMonths: 6, maxMonths: 30 },
      processingFeePercentage: 2.0
    },
    ntcPolicy: {
      acceptsNTC: true,
      minimumNtcScore: 580,
      acceptedRiskTiers: ['tier-1', 'tier-2']
    },
    disbursal: {
      averageDisbursalHours: 36,
      disbursalMode: 'direct_bank_transfer'
    },
    reputation: { rating: 4.1, totalLoansDisbursed: 21000 },
    contact: {
      website: 'https://www.growthpath.in',
      supportEmail: 'support@growthpath.in'
    },
    status: 'active'
  }
];

await Lender.deleteMany({});
console.log('Cleared existing lenders');

await Lender.insertMany(lenders);
console.log('5 lenders seeded successfully');

mongoose.disconnect();