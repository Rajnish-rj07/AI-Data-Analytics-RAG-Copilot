import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Accept': 'application/json',
  },
})

export const healthApi = {
  getHealth: async () => {
    const res = await api.get('/health')
    return res.data
  },
}

export const datasetsApi = {
  uploadDataset: async (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await api.post('/datasets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted)
        }
      },
    })
    return res.data
  },

  getAll: async () => {
    const res = await api.get('/datasets')
    return res.data
  },

  getById: async (id) => {
    const res = await api.get(`/datasets/${id}`)
    return res.data
  },

  deleteById: async (id) => {
    const res = await api.delete(`/datasets/${id}`)
    return res.data
  },

  getProfile: async (id) => {
    const res = await api.get(`/datasets/${id}/profile`)
    return res.data
  },

  getCleaningPlan: async (id) => {
    const res = await api.get(`/datasets/${id}/cleaning-plan`)
    return res.data
  },

  applyClean: async (id, config) => {
    const res = await api.post(`/datasets/${id}/clean`, config)
    return res.data
  },

  getEdaSummary: async (id) => {
    const res = await api.get(`/datasets/${id}/eda/summary`)
    return res.data
  },

  queryEdaAggregate: async (id, query) => {
    const res = await api.post(`/datasets/${id}/eda/aggregate`, query)
    return res.data
  },

  indexRag: async (id) => {
    const res = await api.post(`/datasets/${id}/rag/index`)
    return res.data
  },

  getRagStatus: async (id) => {
    const res = await api.get(`/datasets/${id}/rag/status`)
    return res.data
  },

  askRag: async (id, question, topK = 4) => {
    const res = await api.post(`/datasets/${id}/rag/ask`, { question, top_k: topK })
    return res.data
  },

  generateReport: async (id, params = {}) => {
    const payload = typeof params === 'string' ? { title: params } : (params || {})
    const res = await api.post(`/datasets/${id}/report`, payload)
    return res.data
  },
}

export default api

