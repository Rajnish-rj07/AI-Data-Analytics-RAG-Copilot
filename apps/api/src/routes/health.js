import { Router } from 'express'
import axios from 'axios'
import mongoose from 'mongoose'

export const healthRouter = Router()

healthRouter.get('/health', async (req, res) => {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

  let aiServiceStatus = 'unknown'
  let aiServiceMessage = ''

  try {
    const aiResponse = await axios.get(AI_SERVICE_URL + '/health', { timeout: 3000 })
    aiServiceStatus = 'ok'
    aiServiceMessage = aiResponse.data && aiResponse.data.message ? aiResponse.data.message : 'FastAPI is running'
  } catch (err) {
    aiServiceStatus = 'error'
    aiServiceMessage = 'FastAPI service is unreachable'
  }

  const dbState = mongoose.connection.readyState
  const dbStatus = dbState === 1 ? 'ok' : dbState === 2 ? 'connecting' : 'disconnected'

  res.json({
    success: true,
    message: 'Node.js API is running',
    timestamp: new Date().toISOString(),
    services: {
      api: 'ok',
      ai: aiServiceStatus,
      aiMessage: aiServiceMessage,
      database: dbStatus,
    },
  })
})