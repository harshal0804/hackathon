const postSchema = new mongoose.Schema({
  // ... existing fields ...
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  inProgressAt: Date,
  resolvedAt: Date
}); 