'use client'

import { filterStocksByIndustry } from '@/lib/industry-utils'
import { MarketQuotesService } from '@/lib/market-quotes'
import { LocalStorage } from '@/lib/storage'
import { Stock } from '@/types/stock'
import { ChevronLeft, ChevronRight, Clock, Database, Heart, LayoutGrid, Plus, RefreshCw, Search, Table, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IndustryFilter } from './IndustryFilter'
import { StockStats } from './StockStats'
import { WideStockTable } from './WideStockTable'

interface StockPoolProps {
  refreshTrigger?: number
}

export function StockPool({ refreshTrigger }: StockPoolProps) {
  const [allStocks, setAllStocks] = useState<Stock[]>([])
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [viewMode, setViewMode] = useState<'basic' | 'full'>('basic')
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<string>('')

  // 过滤和分页逻辑
  const filteredStocks = useMemo(() => {
    let filtered = allStocks

    // 先按行业筛选
    if (selectedIndustry) {
      filtered = filterStocksByIndustry(filtered, selectedIndustry)
    }

    // 再按搜索关键词筛选
    if (searchTerm.trim()) {
      filtered = filtered.filter(stock =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [allStocks, selectedIndustry, searchTerm])

  const totalPages = Math.ceil(filteredStocks.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentStocks = filteredStocks.slice(startIndex, endIndex)

  // 重置分页当筛选条件改变时
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedIndustry])

  // 加载股票池数据
  const loadStockPool = () => {
    const stockPool = LocalStorage.getStockPool()
    const selectedIds = LocalStorage.getSelectedStockIds()
    setAllStocks(stockPool)
    setSelectedStockIds(selectedIds)
  }

  useEffect(() => {
    loadStockPool()
  }, [refreshTrigger])

  // 添加到自选股
  const handleAddToSelected = (stock: Stock) => {
    LocalStorage.addToSelected(stock.symbol)
    setSelectedStockIds(prev => [...prev, stock.symbol])
  }

  // 从自选股移除
  const handleRemoveFromSelected = (stock: Stock) => {
    LocalStorage.removeFromSelected(stock.symbol)
    setSelectedStockIds(prev => prev.filter(id => id !== stock.symbol))
  }

  // 刷新真实行情数据
  const handleRefreshQuotes = async () => {
    if (allStocks.length === 0) {
      setUpdateStatus('股票池为空，无需更新行情')
      return
    }

    setLoading(true)
    setUpdateStatus('正在批量获取股票池行情数据...')

    try {
      const { stocks: updatedStocks, result } = await MarketQuotesService.updateStockQuotes(allStocks)

      if (result.success) {
        setAllStocks(updatedStocks)
        LocalStorage.saveStockPool(updatedStocks)

        setUpdateStatus(`成功更新 ${result.updatedCount} 只股票行情，失败 ${result.failedCount} 只`)
        setLastUpdateTime(result.timestamp)

        if (result.failedCount > 0) {
          console.warn('部分股票更新失败:', result.errors)
        }
      } else {
        setUpdateStatus('行情更新失败，请稍后重试')
      }
    } catch (error) {
      console.error('刷新股票池行情异常:', error)
      setUpdateStatus('行情更新异常，请检查网络连接')
    } finally {
      setLoading(false)
      // 8秒后清除状态信息（股票池数据量大，显示时间稍长）
      setTimeout(() => {
        setUpdateStatus('')
      }, 8000)
    }
  }

  if (allStocks.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">股票池为空</h3>
          <p className="text-gray-500">请先导入股票数据或从API获取数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 统计数据 */}
      <StockStats stocks={allStocks} />

      {/* 操作栏 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Database className="h-6 w-6 mr-2 text-blue-600" />
            股票池
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {allStocks.length} 只股票
            {filteredStocks.length !== allStocks.length && `, 筛选后 ${filteredStocks.length} 只`}
            {selectedStockIds.length > 0 && ` | 已选 ${selectedStockIds.length} 只`}
          </p>
        </div>
        <div className="flex space-x-3">
          {/* 视图切换 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('basic')}
              className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'basic'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              基础视图
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'full'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Table className="h-4 w-4 mr-1" />
              完整视图
            </button>
          </div>

          <button
            onClick={handleRefreshQuotes}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '更新中...' : '刷新行情'}
          </button>
        </div>
      </div>

      {/* 行情更新状态 */}
      {(updateStatus || lastUpdateTime) && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            {updateStatus && (
              <div className="flex items-center text-green-700">
                <Database className="h-4 w-4 mr-2" />
                {updateStatus}
              </div>
            )}
            {lastUpdateTime && (
              <div className="flex items-center text-green-600">
                <Clock className="h-4 w-4 mr-2" />
                最后更新: {MarketQuotesService.formatUpdateTime(lastUpdateTime)}
              </div>
            )}
          </div>
          <div className="text-xs text-green-600 mt-1">
            数据来源：Tushare Pro | 股票池批量更新 | 行情数据仅供参考
          </div>
        </div>
      )}

      {/* 搜索框 */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索股票代码或名称"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 行业筛选 */}
      <div className="mb-4">
        <IndustryFilter
          stocks={allStocks}
          selectedIndustry={selectedIndustry}
          onIndustryChange={setSelectedIndustry}
        />
      </div>

      {/* 股票列表 */}
      {viewMode === 'basic' ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                  股票代码
                </th>
                <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                  股票名称
                </th>
                <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-900">
                  市场
                </th>
                <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-900">
                  最新价
                </th>
                <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-900">
                  涨跌幅
                </th>
                <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-900">
                  自选
                </th>
              </tr>
            </thead>
            <tbody>
              {currentStocks.length > 0 ? (
                currentStocks.map(stock => {
                  const isSelected = selectedStockIds.includes(stock.symbol)
                  return (
                    <tr key={stock.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm font-mono text-gray-900">
                        {stock.symbol}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                        {stock.name}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${stock.market === 'SH'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {stock.market}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right text-sm">
                        {stock.currentPrice ?
                          <span className="text-gray-900 font-medium">¥{stock.currentPrice.toFixed(2)}</span> :
                          <span className="text-gray-400">--</span>
                        }
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right text-sm">
                        {stock.changePercent ? (
                          <div className={`flex items-center justify-end ${stock.changePercent > 0 ? 'text-red-600' :
                            stock.changePercent < 0 ? 'text-green-600' : 'text-gray-600'
                            }`}>
                            {stock.changePercent > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : stock.changePercent < 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                            ) : null}
                            {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </div>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        {isSelected ? (
                          <button
                            onClick={() => handleRemoveFromSelected(stock)}
                            className="text-red-600 hover:text-red-800 focus:outline-none"
                            title="取消自选"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddToSelected(stock)}
                            className="text-blue-600 hover:text-blue-800 focus:outline-none"
                            title="加入自选"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                    {searchTerm ? '未找到匹配的股票' : '暂无数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                显示 {startIndex + 1}-{Math.min(endIndex, filteredStocks.length)} 条，共 {filteredStocks.length} 条
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                    const pageNumber = index + 1
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`px-3 py-1 text-sm rounded-md ${currentPage === pageNumber
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  })}
                  {totalPages > 5 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
                  {totalPages > 5 && (
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-3 py-1 text-sm rounded-md ${currentPage === totalPages
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {totalPages}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <WideStockTable
          stocks={currentStocks}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRemoveStock={() => { }} // 股票池不支持删除
          showAddToSelected={true}
          selectedStockIds={selectedStockIds}
          onAddToSelected={handleAddToSelected}
          onRemoveFromSelected={handleRemoveFromSelected}
        />
      )}

      {/* 数据源信息 */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div>
          {allStocks.length > 0 && `股票池共 ${allStocks.length} 只股票`}
          {selectedStockIds.length > 0 && ` | 已加入自选 ${selectedStockIds.length} 只`}
        </div>
        <div className="flex items-center">
          <Database className="h-3 w-3 mr-1" />
          数据来源：Tushare Pro
        </div>
      </div>
    </div>
  )
}