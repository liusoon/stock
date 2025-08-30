'use client'

import { useMemo } from 'react'
import { Stock } from '@/types/stock'
import { TrendingUp, Building2, PieChart, BarChart3 } from 'lucide-react'

interface StockStatsProps {
  stocks: Stock[]
}

export function StockStats({ stocks }: StockStatsProps) {
  const stats = useMemo(() => {
    const shStocks = stocks.filter(s => s.market === 'SH')
    const szStocks = stocks.filter(s => s.market === 'SZ')
    
    // 按行业分类统计（根据股票名称简单分类）
    const industries = stocks.reduce((acc, stock) => {
      let industry = '其他'
      
      if (stock.name.includes('科技') || stock.name.includes('软件') || stock.name.includes('芯片')) {
        industry = '科技'
      } else if (stock.name.includes('医疗') || stock.name.includes('制药') || stock.name.includes('生物')) {
        industry = '医疗'
      } else if (stock.name.includes('金融') || stock.name.includes('银行') || stock.name.includes('证券')) {
        industry = '金融'
      } else if (stock.name.includes('制造') || stock.name.includes('机械') || stock.name.includes('设备')) {
        industry = '制造'
      } else if (stock.name.includes('材料') || stock.name.includes('化学') || stock.name.includes('化工')) {
        industry = '材料'
      } else if (stock.name.includes('能源') || stock.name.includes('电力') || stock.name.includes('新能源')) {
        industry = '能源'
      } else if (stock.name.includes('通信') || stock.name.includes('电子') || stock.name.includes('信息')) {
        industry = '通信'
      }
      
      acc[industry] = (acc[industry] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topIndustries = Object.entries(industries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
    
    return {
      total: stocks.length,
      shCount: shStocks.length,
      szCount: szStocks.length,
      industries: topIndustries
    }
  }, [stocks])
  
  if (stocks.length === 0) {
    return null
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 总数 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">总股票数</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
        </div>
      </div>
      
      {/* 上海交易所 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Building2 className="h-8 w-8 text-red-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">上海交易所</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.shCount}</p>
          </div>
        </div>
      </div>
      
      {/* 深圳交易所 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <PieChart className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">深圳交易所</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.szCount}</p>
          </div>
        </div>
      </div>
      
      {/* 行业分布 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center mb-2">
          <BarChart3 className="h-6 w-6 text-purple-600 mr-2" />
          <p className="text-sm font-medium text-gray-500">主要行业</p>
        </div>
        <div className="space-y-1">
          {stats.industries.slice(0, 3).map(([industry, count]) => (
            <div key={industry} className="flex justify-between text-xs">
              <span className="text-gray-600">{industry}</span>
              <span className="font-medium text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}