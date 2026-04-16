import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Builder from './pages/Builder'
import FillForm from './pages/FillForm'
import Responses from './pages/Responses'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/builder/:id" element={<Builder />} />
      <Route path="/f/:id" element={<FillForm />} />
      <Route path="/responses/:id" element={<Responses />} />
    </Routes>
  )
}
