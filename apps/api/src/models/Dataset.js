import mongoose from 'mongoose'

/**
 * Dataset Model
 *
 * Stores metadata about an uploaded dataset.
 * The actual file lives in services/ai/uploads/ on the Python service.
 * MongoDB stores everything ABOUT the dataset, not the file itself.
 *
 * Lifecycle states:
 *   uploaded -> profiled -> cleaned -> analyzed -> ready
 */
const datasetSchema = new mongoose.Schema(
  {
    // Original filename provided by the user
    originalName: { type: String, required: true, trim: true },

    // File type: csv, xlsx
    fileType: { type: String, required: true, enum: ['csv', 'xlsx', 'xls'] },

    // File size in KB
    fileSizeKb: { type: Number, required: true },

    // ID assigned by the AI service when the file was saved (UUID)
    aiFileId: { type: String, required: true },

    // Dataset lifecycle state
    status: {
      type: String,
      enum: ['uploaded', 'profiled', 'cleaned', 'analyzed', 'ready'],
      default: 'uploaded',
    },

    // Summary returned from FastAPI after upload validation
    summary: {
      rowCount: Number,
      columnCount: Number,
      duplicateRows: Number,
      totalMissingValues: Number,
      missingPercentage: Number,
    },

    // Column metadata returned from FastAPI
    columns: [
      {
        name: String,
        dtype: String,
        nullCount: Number,
        nullPct: Number,
        uniqueCount: Number,
        min: mongoose.Schema.Types.Mixed,
        max: mongoose.Schema.Types.Mixed,
        mean: Number,
        median: Number,
        std: Number,
        topValue: String,
        topCount: Number,
      },
    ],

    // Column names in order (for quick access)
    columnNames: [String],

    // Stored sample preview rows (first 25-50 rows)
    preview: [mongoose.Schema.Types.Mixed],
  },

  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
)

export const Dataset = mongoose.model('Dataset', datasetSchema)