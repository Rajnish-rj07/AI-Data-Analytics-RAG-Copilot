import { Router } from 'express'
import multer from 'multer'
import axios from 'axios'
import FormData from 'form-data'
import { Dataset } from '../models/Dataset.js'

export const datasetRouter = Router()

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

// Multer: store uploads in memory temporarily (we forward to FastAPI immediately)
// Why memory? We stream the file to FastAPI and don't persist it on the Node side.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls']
    const ext = '.' + file.originalname.split('.').pop().toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV and XLSX files are supported.'))
    }
  },
})


/**
 * POST /api/v1/datasets
 *
 * Accepts a file upload, forwards it to the FastAPI AI service for
 * validation and parsing, then stores the metadata in MongoDB.
 *
 * Returns the saved dataset record with preview data.
 */
datasetRouter.post('/', upload.single('file'), async (req, res) => {
  // Multer puts the file on req.file
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file was uploaded. Please attach a file with the key "file".',
    })
  }

  try {
    // ── Forward to FastAPI ──────────────────────────────────────────────
    // We rebuild the file as a multipart form and send it to the AI service.
    const form = new FormData()
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    })

    let aiResponse
    try {
      aiResponse = await axios.post(
        AI_SERVICE_URL + '/api/v1/datasets/upload',
        form,
        {
          headers: form.getHeaders(),
          timeout: 30000, // 30s timeout for large files
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      )
    } catch (aiErr) {
      // FastAPI returned an error (validation failure, bad file, etc.)
      const status = aiErr.response?.status || 503
      const message = aiErr.response?.data?.detail || 'The AI service could not process this file.'
      return res.status(status).json({ success: false, message })
    }

    const aiData = aiResponse.data

    // ── Save metadata to MongoDB ────────────────────────────────────────
    const ext = req.file.originalname.split('.').pop().toLowerCase()

    const dataset = new Dataset({
      originalName: req.file.originalname,
      fileType: ext,
      fileSizeKb: aiData.file_size_kb,
      aiFileId: aiData.file_id,
      status: 'uploaded',
      summary: {
        rowCount: aiData.summary.row_count,
        columnCount: aiData.summary.column_count,
        duplicateRows: aiData.summary.duplicate_rows,
        totalMissingValues: aiData.summary.total_missing_values,
        missingPercentage: aiData.summary.missing_percentage,
      },
      columns: aiData.columns.map((col) => ({
        name: col.name,
        dtype: col.dtype,
        nullCount: col.null_count,
        nullPct: col.null_pct,
        uniqueCount: col.unique_count,
        min: col.min,
        max: col.max,
        mean: col.mean,
        median: col.median,
        std: col.std,
        topValue: col.top_value,
        topCount: col.top_count,
      })),
      columnNames: aiData.column_names,
      preview: aiData.preview || [],
    })

    await dataset.save()

    // ── Respond to client ───────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: 'Dataset uploaded and validated successfully.',
      dataset: {
        id: dataset._id,
        originalName: dataset.originalName,
        fileType: dataset.fileType,
        fileSizeKb: dataset.fileSizeKb,
        status: dataset.status,
        summary: dataset.summary,
        columns: dataset.columns,
        columnNames: dataset.columnNames,
        preview: dataset.preview,
        createdAt: dataset.createdAt,
      },
    })
  } catch (err) {
    console.error('[Dataset Upload Error]', err.message)
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while processing the dataset.',
    })
  }
})


/**
 * GET /api/v1/datasets
 * Returns all uploaded datasets (metadata only, no preview rows).
 */
datasetRouter.get('/', async (req, res) => {
  try {
    const datasets = await Dataset.find({})
      .select('-columns -columnNames -preview') // Exclude heavy fields from list view
      .sort({ createdAt: -1 })


    return res.json({
      success: true,
      count: datasets.length,
      datasets,
    })
  } catch (err) {
    console.error('[Dataset List Error]', err.message)
    return res.status(500).json({ success: false, message: 'Could not retrieve datasets.' })
  }
})


/**
 * GET /api/v1/datasets/:id
 * Returns a single dataset with full column metadata.
 */
datasetRouter.get('/:id', async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id)
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' })
    }
    return res.json({ success: true, dataset })
  } catch (err) {
    console.error('[Dataset Get Error]', err.message)
    return res.status(500).json({ success: false, message: 'Could not retrieve dataset.' })
  }
})


/**
 * DELETE /api/v1/datasets/:id
 * Removes dataset metadata from MongoDB.
 * Note: does NOT delete the file from the AI service yet (Phase 2 scope).
 */
datasetRouter.delete('/:id', async (req, res) => {
  try {
    const dataset = await Dataset.findByIdAndDelete(req.params.id)
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' })
    }
    return res.json({ success: true, message: 'Dataset deleted.' })
  } catch (err) {
    console.error('[Dataset Delete Error]', err.message)
    return res.status(500).json({ success: false, message: 'Could not delete dataset.' })
  }
})


/**
 * GET /api/v1/datasets/:id/profile
 * Fetches deep statistical profiling from the FastAPI AI service using the stored aiFileId.
 * Returns: quality score, numerical/categorical profiles, correlation matrix, and insights.
 */
datasetRouter.get('/:id/profile', async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id)
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' })
    }

    const aiResponse = await axios.get(
      `${AI_SERVICE_URL}/api/v1/datasets/${dataset.aiFileId}/profile`,
      { timeout: 30000 }
    )

    return res.json({
      success: true,
      datasetId: dataset._id,
      originalName: dataset.originalName,
      deep_profile: aiResponse.data.deep_profile,
    })
  } catch (err) {
    const status = err.response?.status || 503
    const message = err.response?.data?.detail || 'Could not retrieve dataset profile from AI service.'
    console.error('[Dataset Profile Error]', err.message)
    return res.status(status).json({ success: false, message })
  }
})


/**
 * GET /api/v1/datasets/:id/cleaning-plan
 * Returns an AI-generated cleaning plan — READ ONLY, no data is modified.
 */
datasetRouter.get('/:id/cleaning-plan', async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id)
    if (!dataset) return res.status(404).json({ success: false, message: 'Dataset not found.' })

    const aiRes = await axios.get(
      `${AI_SERVICE_URL}/api/v1/datasets/${dataset.aiFileId}/cleaning-plan`,
      { timeout: 30000 }
    )
    return res.json({
      success: true,
      datasetId: dataset._id,
      originalName: dataset.originalName,
      cleaning_plan: aiRes.data.cleaning_plan,
    })
  } catch (err) {
    const status = err.response?.status || 503
    const message = err.response?.data?.detail || 'Could not retrieve cleaning plan.'
    console.error('[Cleaning Plan Error]', err.message)
    return res.status(status).json({ success: false, message })
  }
})


/**
 * POST /api/v1/datasets/:id/clean
 * Apply user-confirmed cleaning strategies. Returns change log + base64 CSV.
 * The user MUST have reviewed and confirmed the plan before this is called.
 */
datasetRouter.post('/:id/clean', async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id)
    if (!dataset) return res.status(404).json({ success: false, message: 'Dataset not found.' })

    const aiRes = await axios.post(
      `${AI_SERVICE_URL}/api/v1/datasets/${dataset.aiFileId}/clean`,
      req.body,
      { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
    )
    return res.json(aiRes.data)
  } catch (err) {
    const status = err.response?.status || 503
    const message = err.response?.data?.detail || 'Cleaning operation failed.'
    console.error('[Apply Clean Error]', err.message)
    return res.status(status).json({ success: false, message })
  }
})


/**
 * GET /api/v1/datasets/:id/eda/summary
 * Phase 5: Automated EDA insights & smart chart recommendations
 */
datasetRouter.get('/:id/eda/summary', async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id)
    if (!dataset) return res.status(404).json({ success: false, message: 'Dataset not found.' })

    const aiRes = await axios.get(
      `${AI_SERVICE_URL}/api/v1/datasets/${dataset.aiFileId}/eda/summary`,
      { timeout: 30000 }
    )
    return res.json({
      success: true,
      datasetId: dataset._id,
      originalName: dataset.originalName,
      ...aiRes.data,
    })
  } catch (err) {
    const status = err.response?.status || 503
    const message = err.response?.data?.detail || 'Could not retrieve EDA summary.'
    console.error('[EDA Summary Error]', err.message)
    return res.status(status).json({ success: false, message })
  }
})


/**
 * POST /api/v1/datasets/:id/eda/aggregate
 * Phase 5: Dynamic multi-dimensional aggregation query for custom chart visualizer
 */
datasetRouter.post('/:id/eda/aggregate', async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id)
    if (!dataset) return res.status(404).json({ success: false, message: 'Dataset not found.' })

    const aiRes = await axios.post(
      `${AI_SERVICE_URL}/api/v1/datasets/${dataset.aiFileId}/eda/aggregate`,
      req.body,
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    )
    return res.json(aiRes.data)
  } catch (err) {
    const status = err.response?.status || 503
    const message = err.response?.data?.detail || 'Aggregation query failed.'
    console.error('[EDA Aggregate Error]', err.message)
    return res.status(status).json({ success: false, message })
  }
})