const mongoose = require('mongoose');

const PAYMENT_PROVIDERS = ['bkash', 'rocket', 'nagad', 'bank'];

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    classLevel: { type: String, required: true },
    subject: { type: String, required: true },
    teacherName: { type: String, required: true },
    schedule: { type: String, required: true },
    time: { type: String, required: true },
    room: { type: String, default: '' },
    courseFee: { type: Number, required: true, default: 0 },
    paymentInstructions: { type: String, default: '' },
    paymentAccounts: [
      {
        provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
        accountNumber: { type: String, required: true },
        accountName: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
      },
    ],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Batch', batchSchema);
