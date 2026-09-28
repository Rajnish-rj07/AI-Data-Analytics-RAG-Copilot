import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'

/**
 * App — Root router component.
 *
 * Currently contains only the HomePage.
 * As we build features, we'll add routes for:
 *   /projects          → Project list
 *   /projects/:id      → Project detail (dataset, EDA, RAG, reports)
 *   /projects/new      → Create project + upload dataset
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}

export default App
