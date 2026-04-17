import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Builder from './pages/Builder'
import FillForm from './pages/FillForm'
import Responses from './pages/Responses'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Public routes — no auth needed */}
      <Route path="/login"  element={<Login />} />
      <Route path="/f/:id"  element={<FillForm />} />

      {/* Protected routes — require login */}
      <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
      <Route path="/builder/:id" element={<AuthGuard><Builder /></AuthGuard>} />
      <Route path="/responses/:id" element={<AuthGuard><Responses /></AuthGuard>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
