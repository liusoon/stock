'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { LoginForm } from '@/components/LoginForm'
import { RegisterForm } from '@/components/RegisterForm'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const router = useRouter()
  
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }
  
  if (isAuthenticated) {
    return null // 将重定向到dashboard
  }
  
  return (
    <>
      {showRegister ? (
        <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
      )}
    </>
  )
}