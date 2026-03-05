import mongoose from 'mongoose';
import connectDB from './config/db.js';
import PanRecord from './models/panrecord.js';

// Connect to MongoDB
await connectDB();

const panRecords = [
  { pan: 'ABCDE1234F', name: 'Rahul Sharma' },
  { pan: 'BCDEF2345G', name: 'Priya Mehta' },
  { pan: 'CDEFG3456H', name: 'Arjun Verma' },
  { pan: 'DEFGH4567I', name: 'Sneha Iyer' },
  { pan: 'EFGHI5678J', name: 'Vikram Nair' },
  { pan: 'FGHIJ6789K', name: 'Anjali Singh' },
  { pan: 'GHIJK7890L', name: 'Rohan Gupta' },
  { pan: 'HIJKL8901M', name: 'Neha Joshi' },
  { pan: 'IJKLM9012N', name: 'Karan Malhotra' },
  { pan: 'JKLMN0123O', name: 'Divya Pillai' }
];

// Clear existing records first
// So running seed twice does not create duplicates
await PanRecord.deleteMany({});
console.log('Cleared existing PAN records');

// Insert all 10 records
await PanRecord.insertMany(panRecords);
console.log('10 PAN records inserted successfully');

// Disconnect after seeding
mongoose.disconnect();