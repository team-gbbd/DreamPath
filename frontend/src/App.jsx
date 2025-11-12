import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ChatPage from './pages/dw/ChatPage'
import AnalysisPage from './pages/dw/AnalysisPage'
import './App.css'

function App() {
  const [sessionId, setSessionId] = useState(null)

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/" 
            element={<ChatPage sessionId={sessionId} setSessionId={setSessionId} />} 
          />
          <Route 
            path="/analysis" 
            element={
              sessionId ? 
                <AnalysisPage sessionId={sessionId} /> : 
                <Navigate to="/" replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App

