import mongoose from 'mongoose'

// Singleton connection - only connect once for the lifetime of the process
let isConnected = false

export async function connectDB() {
  if (isConnected) return

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set.')
  }

  try {
    await mongoose.connect(uri, {
      dbName: 'ai_da_copilot',
    })
    isConnected = true
    console.log('[DB] MongoDB connected successfully')
  } catch (err) {
    console.error('[DB] MongoDB connection failed:', err.message)
    // Do not crash the server - let individual requests fail gracefully
  }
}

export default mongoose