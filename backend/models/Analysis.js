const mongoose = require('mongoose');

/**
 * Analysis Schema
 * Stores code analysis results including explanation, complexity,
 * flowchart, roast feedback, and execution steps.
 */
const analysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: [true, 'Code is required']
  },
  language: {
    type: String,
    required: true,
    enum: ['javascript', 'python', 'java', 'cpp', 'typescript'],
    default: 'javascript'
  },
  mode: {
    type: String,
    enum: ['explain', 'roast'],
    default: 'explain'
  },
  explanation: {
    type: String,
    default: ''
  },
  timeComplexity: {
    type: String,
    default: ''
  },
  spaceComplexity: {
    type: String,
    default: ''
  },
  steps: {
    type: [String],
    default: []
  },
  flowchart: {
    type: String,
    default: ''
  },
  interviewQuestions: {
    type: [String],
    default: []
  },
  roastFeedback: {
    type: String,
    default: ''
  },
  codeQualityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  executionSteps: [{
    step: Number,
    description: String,
    line: Number,
    code: String
  }],
  // Unique share ID for public sharing
  shareId: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Analysis', analysisSchema);
