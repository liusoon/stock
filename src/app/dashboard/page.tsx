'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { WatchList } from '@/components/WatchList'
import { StockPool } from '@/components/StockPool'
import { ImportForm } from '@/components/ImportForm'
import { TradingCalendar } from '@/components/TradingCalendar'
import { LogOut, Upload, Database, Heart, User, Calendar } from 'lucide-react'

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'watchlist' | 'stockpool' | 'import' | 'calendar'>('watchlist')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])
  
  const handleLogout = () => {
    logout()
    router.push('/')
  }
  
  const handleImportSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
    setActiveTab('stockpool') // 导入成功后切换到股票池页面
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return null // 将重定向到首页
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                股票关注列表
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <User className="h-4 w-4 mr-2" />
                {user?.name || user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                <LogOut className="h-4 w-4 mr-1" />
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* 标签页导航 */}
      <div className="max-w-7xl mx-auto">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'watchlist'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Heart className="h-4 w-4 inline mr-2" />
              我的自选
            </button>
            <button
              onClick={() => setActiveTab('stockpool')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stockpool'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database className="h-4 w-4 inline mr-2" />
              股票池
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              交易日历
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              导入数据
            </button>
          </nav>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'watchlist' && (
          <WatchList refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'stockpool' && (
          <StockPool refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'calendar' && (
          <TradingCalendar />
        )}
        {activeTab === 'import' && (
          <ImportForm onImportSuccess={handleImportSuccess} />
        )}
      </div>
    </div>
  )
}