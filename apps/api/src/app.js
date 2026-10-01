import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB } from './db/connection.js'
import { healthRouter } from './routes/health.js'
import { datasetRouter } from './routes/datasets.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Connect to MongoDB (non-blocking - server starts even if DB is slow)
connectDB()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// Routes
app.use('/api/v1', healthRouter)
app.use('/api/v1/datasets', datasetRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found: ' + req.method + ' ' + req.path,
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message)
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal error occurred'
      : err.message,
  })
})

app.listen(PORT, () => {
  console.log('[API] Node.js server running on http://localhost:' + PORT)
  console.log('[API] Environment: ' + (process.env.NODE_ENV || 'development'))
})

export default app