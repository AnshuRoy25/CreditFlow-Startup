import mongoose from 'mongoose';
import connectDB from './config/db.js';
import AadhaarCard from './models/aadhaarcard.js';

await connectDB();

const aadhaarRecords = [
  { aadhaar: '123456789000', name: 'Anshu Roy',   dob: '16-03-2006', gender: 'M', address: 'A-303, Shree Vijaya Residency, Chivda Gully, Lalbaug, Mumbai, Maharashtra 400012', mobile: '7738385936' },
  { aadhaar: '345678901234', name: 'Priya Mehta',    dob: '22-03-1998', gender: 'F', address: '45 Linking Road, Mumbai, Maharashtra 400050',    mobile: '9823456789' },
  { aadhaar: '456789012345', name: 'Arjun Verma',    dob: '10-11-1993', gender: 'M', address: '78 Connaught Place, New Delhi 110001',            mobile: '9712345678' },
  { aadhaar: '567890123456', name: 'Sneha Iyer',     dob: '05-07-1997', gender: 'F', address: '23 Anna Salai, Chennai, Tamil Nadu 600002',       mobile: '9654321098' },
  { aadhaar: '678901234567', name: 'Vikram Nair',    dob: '18-01-1990', gender: 'M', address: '56 MG Road, Kochi, Kerala 682016',                mobile: '9543210987' },
  { aadhaar: '789012345678', name: 'Anjali Singh',   dob: '30-09-1996', gender: 'F', address: '89 Hazratganj, Lucknow, Uttar Pradesh 226001',    mobile: '9432109876' },
  { aadhaar: '890123456789', name: 'Rohan Gupta',    dob: '14-04-1994', gender: 'M', address: '34 Park Street, Kolkata, West Bengal 700016',     mobile: '9321098765' },
  { aadhaar: '901234567890', name: 'Neha Joshi',     dob: '27-12-1999', gender: 'F', address: '67 FC Road, Pune, Maharashtra 411004',            mobile: '9210987654' },
  { aadhaar: '012345678901', name: 'Karan Malhotra', dob: '03-06-1992', gender: 'M', address: '11 Sector 17, Chandigarh 160017',                 mobile: '9109876543' },
  { aadhaar: '123456789012', name: 'Divya Pillai',   dob: '19-02-1995', gender: 'F', address: '44 Jubilee Hills, Hyderabad, Telangana 500033',   mobile: '9098765432' }
];

await AadhaarCard.deleteMany({});
console.log('Cleared existing Aadhaar records');

await AadhaarCard.insertMany(aadhaarRecords);
console.log('10 Aadhaar records inserted successfully');

mongoose.disconnect();