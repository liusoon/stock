'use client'

import { filterStocksByIndustry } from '@/lib/industry-utils'
import { MarketQuotesService } from '@/lib/market-quotes'
import { LocalStorage } from '@/lib/storage'
import { Stock } from '@/types/stock'
import { ChevronLeft, ChevronRight, Clock, Database, Heart, LayoutGrid, RefreshCw, Search, Table, Trash2, TrendingDown, TrendingUp, BarChart3, Calendar, Filter, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { IndustryFilter } from './IndustryFilter'
import { StockStats } from './StockStats'
import { WideStockTable } from './WideStockTable'
import { StockHistoryModal } from './StockHistoryModal'
import { KLineChart } from './KLineChart'
interface WatchListProps {
  refreshTrigger?: number
}

export function WatchList({ refreshTrigger }: WatchListProps) {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [filterMode, setFilterMode] = useState<'industry' | 'date' | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10) // 每页显示10条数据
  const [viewMode, setViewMode] = useState<'basic' | 'full'>('basic') // 视图模式
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showKLineModal, setShowKLineModal] = useState(false)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)

  // 过滤和分页逻辑
  const filteredStocks = useMemo(() => {
    let filtered = stocks

    // 互斥筛选：只能选择行业筛选或日期筛选
    if (filterMode === 'industry' && selectedIndustry) {
      filtered = filterStocksByIndustry(filtered, selectedIndustry)
    } else if (filterMode === 'date' && selectedDate) {
      // 按日期筛选：显示指定日期当天添加的股票
      filtered = filtered.filter(stock => {
        if (!stock.addedAt) return false
        const addedDate = new Date(stock.addedAt)
        const addedDateString = addedDate.toISOString().split('T')[0]
        return addedDateString === selectedDate
      })
    }

    // 搜索关键词筛选（独立于行业/日期筛选）
    if (searchTerm.trim()) {
      filtered = filtered.filter(stock =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [stocks, selectedIndustry, selectedDate, filterMode, searchTerm])

  const totalPages = Math.ceil(filteredStocks.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentStocks = filteredStocks.slice(startIndex, endIndex)

  // 重置分页当筛选条件改变时
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedIndustry, selectedDate, filterMode])

  // 加载自选股数据
  const loadStocks = () => {
    const selectedStocks = LocalStorage.getSelectedStocks()
    setStocks(selectedStocks)
  }

  useEffect(() => {
    loadStocks()
  }, [refreshTrigger])

  // 从自选股移除
  const handleRemove = (symbol: string) => {
    if (confirm('确定要从自选股中移除这只股票吗？')) {
      LocalStorage.removeFromSelected(symbol)
      loadStocks()
    }
  }

  // 清空自选股
  const handleClearAll = () => {
    if (confirm('确定要清空所有自选股吗？此操作不可恢复。')) {
      LocalStorage.clearSelectedStocks()
      setStocks([])
    }
  }

  // 处理股票代码点击
  const handleStockCodeClick = (stock: Stock) => {
    setSelectedStock(stock)
    setShowHistoryModal(true)
  }

  // 处理K线按钮点击
  const handleKLineClick = (stock: Stock) => {
    setSelectedStock(stock)
    setShowKLineModal(true)
  }

  // 刷新真实行情数据
  const handleRefreshQuotes = async () => {
    if (stocks.length === 0) {
      setUpdateStatus('无自选股需要更新')
      return
    }

    setLoading(true)
    setUpdateStatus('正在获取最新行情数据...')

    try {
      const { stocks: updatedStocks, result } = await MarketQuotesService.updateStockQuotes(stocks)

      if (result.success) {
        setStocks(updatedStocks)

        // 同步更新到股票池
        const stockPool = LocalStorage.getStockPool()
        const updatedPool = stockPool.map(poolStock => {
          const updated = updatedStocks.find(s => s.symbol === poolStock.symbol)
          return updated || poolStock
        })
        LocalStorage.saveStockPool(updatedPool)

        setUpdateStatus(`成功更新 ${result.updatedCount} 只股票行情`)
        setLastUpdateTime(result.timestamp)

        if (result.failedCount > 0) {
          console.warn('部分股票更新失败:', result.errors)
        }
      } else {
        setUpdateStatus('行情更新失败，请稍后重试')
      }
    } catch (error) {
      console.error('刷新行情异常:', error)
      setUpdateStatus('行情更新异常，请检查网络连接')
    } finally {
      setLoading(false)
      // 5秒后清除状态信息
      setTimeout(() => {
        setUpdateStatus('')
      }, 5000)
    }
  }

  if (stocks.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无自选股</h3>
          <p className="text-gray-500">请从股票池中添加感兴趣的股票到自选列表</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 统计数据 */}
      <StockStats stocks={stocks} />

      {/* 操作栏 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Heart className="h-6 w-6 mr-2 text-red-600" />
            我的自选股
          </h2>
          <p className="text-sm text-gray-500 mt-1">共 {stocks.length} 只自选股{filteredStocks.length !== stocks.length && `, 筛选后 ${filteredStocks.length} 只`}</p>
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
          <button
            onClick={handleClearAll}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            清空自选
          </button>
        </div>
      </div>

      {/* 行情更新状态 */}
      {(updateStatus || lastUpdateTime) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            {updateStatus && (
              <div className="flex items-center text-blue-700">
                <Database className="h-4 w-4 mr-2" />
                {updateStatus}
              </div>
            )}
            {lastUpdateTime && (
              <div className="flex items-center text-blue-600">
                <Clock className="h-4 w-4 mr-2" />
                最后更新: {MarketQuotesService.formatUpdateTime(lastUpdateTime)}
              </div>
            )}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            数据来源：Tushare Pro | 行情数据仅供参考
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

      {/* 筛选模式切换 */}
      <div className="mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                if (filterMode === 'industry') {
                  setFilterMode(null)
                  setSelectedIndustry(null)
                } else {
                  setFilterMode('industry')
                  setSelectedDate('')
                }
              }}
              className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterMode === 'industry'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Filter className="h-4 w-4 mr-1" />
              行业筛选
            </button>
            <button
              onClick={() => {
                if (filterMode === 'date') {
                  setFilterMode(null)
                  setSelectedDate('')
                } else {
                  setFilterMode('date')
                  setSelectedIndustry(null)
                }
              }}
              className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterMode === 'date'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="h-4 w-4 mr-1" />
              日期筛选
            </button>
          </div>
        </div>
      </div>

      {/* 行业筛选器 */}
      {filterMode === 'industry' && (
        <div className="mb-4">
          <IndustryFilter
            stocks={stocks}
            selectedIndustry={selectedIndustry}
            onIndustryChange={setSelectedIndustry}
          />
        </div>
      )}

      {/* 日期筛选器 */}
      {filterMode === 'date' && (
        <div className="mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label htmlFor="date-filter" className="text-sm font-medium text-gray-700">
                入池日期：
              </label>
            </div>
            <input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="flex items-center px-2 py-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="清除日期筛选"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <span className="text-xs text-gray-500">显示此日期当天添加的股票</span>
          </div>
        </div>
      )}

      {/* 股票列表 */}
      {viewMode === 'basic' ? (
        // 基础视图：只显示核心字段
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-3 text-center text-sm font-medium text-gray-900">
                  K线
                </th>
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
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {currentStocks.length > 0 ? (
                currentStocks.map(stock => (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-2 py-3 text-center">
                      <button
                        onClick={() => handleKLineClick(stock)}
                        className="text-blue-600 hover:text-blue-800 focus:outline-none p-1 rounded transition-colors"
                        title="显示K线图"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm font-mono">
                      <button
                        onClick={() => handleStockCodeClick(stock)}
                        className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
                      >
                        {stock.symbol}
                      </button>
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
                            <TrendingDown className="h-3 w-3 mr-1" />
                          ) : null}
                          {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </div>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemove(stock.symbol)}
                        className="text-red-600 hover:text-red-800 focus:outline-none"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                    {searchTerm ? '未找到匹配的股票' : '暂无数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 基础视图分页控件 */}
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
        // 完整视图：显示所有字段
        <WideStockTable
          stocks={currentStocks}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRemoveStock={handleRemove}
          onStockCodeClick={handleStockCodeClick}
          onKLineClick={handleKLineClick}
        />
      )}

      {/* 数据源信息 */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div>
          {stocks.length > 0 && `共 ${stocks.length} 只自选股`}
        </div>
        <div className="flex items-center">
          <Database className="h-3 w-3 mr-1" />
          数据来源：Tushare Pro
        </div>
      </div>

      {/* 历史数据弹窗 */}
      {selectedStock && (
        <StockHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false)
            setSelectedStock(null)
          }}
          stockCode={selectedStock.symbol}
          stockName={selectedStock.name}
        />
      )}

      {/* K线图弹窗 */}
      {selectedStock && (
        <KLineChart
          isOpen={showKLineModal}
          onClose={() => {
            setShowKLineModal(false)
            setSelectedStock(null)
          }}
          stockCode={selectedStock.symbol}
          stockName={selectedStock.name}
        />
      )}
    </div>
  )
}