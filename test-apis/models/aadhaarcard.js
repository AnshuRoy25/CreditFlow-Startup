import mongoose from 'mongoose';

const aadhaarSchema = new mongoose.Schema({
  aadhaar: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  dob: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['M', 'F', 'T']
  },
  address: {
    type: String,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  }
});

export default mongoose.model('AadhaarCard', aadhaarSchema, 'aadhaarcards');