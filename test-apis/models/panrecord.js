import mongoose from 'mongoose';

const panSchema = new mongoose.Schema({
  pan: {
    type: String,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  }
});

const PanRecord = mongoose.model('PanRecord', panSchema);

export default PanRecord;