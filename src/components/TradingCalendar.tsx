'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTradeCalendar } from '@/lib/useTradeCalendar'
import { CalendarDate, MonthCalendarData } from '@/types/stock'
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Clock, RefreshCw, Building2 } from 'lucide-react'

interface TradingCalendarProps {
  className?: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

export function TradingCalendar({ className = '' }: TradingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [monthData, setMonthData] = useState<MonthCalendarData | null>(null)
  
  const {
    loading,
    error,
    exchange,
    fetchMonthCalendar,
    getCachedMonth,
    switchExchange
  } = useTradeCalendar()

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  // 日期范围限制：当前日期前后6个月
  const today = new Date()
  const minDate = new Date(today.getFullYear(), today.getMonth() - 6, 1)
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 6, 1)

  // 检查是否可以导航到上个月/下个月
  const canGoToPrevMonth = currentDate > minDate
  const canGoToNextMonth = currentDate < maxDate

  // 加载当前月份的数据
  useEffect(() => {
    const loadCurrentMonth = async () => {
      try {
        const cached = getCachedMonth(currentYear, currentMonth)
        if (cached) {
          setMonthData(cached)
        } else {
          const data = await fetchMonthCalendar(currentYear, currentMonth)
          setMonthData(data)
        }
      } catch (err) {
        console.error('加载月度日历失败:', err)
      }
    }

    loadCurrentMonth()
  }, [currentYear, currentMonth, exchange, fetchMonthCalendar, getCachedMonth])

  // 生成日历格子数据
  const calendarGrid = useMemo(() => {
    if (!monthData) return []

    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const firstDayWeek = firstDay.getDay()
    const daysInMonth = monthData.dates.length

    // 前一个月的填充日期
    const prevMonthDays = []
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, -i)
      prevMonthDays.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        calendarDate: null as CalendarDate | null
      })
    }

    // 当前月份的日期
    const currentMonthDays = monthData.dates.map((calendarDate) => {
      const isToday = calendarDate.dateString === new Date().toISOString().split('T')[0]
      return {
        date: calendarDate.date,
        isCurrentMonth: true,
        isToday,
        calendarDate
      }
    })

    // 下一个月的填充日期
    const totalCells = 42 // 6行 * 7列
    const remainingCells = totalCells - prevMonthDays.length - currentMonthDays.length
    const nextMonthDays = []
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(currentYear, currentMonth, i)
      nextMonthDays.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        calendarDate: null as CalendarDate | null
      })
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]
  }, [monthData, currentYear, currentMonth])

  // 导航到上个月
  const goToPrevMonth = () => {
    if (!canGoToPrevMonth) return
    const newDate = new Date(currentYear, currentMonth - 2, 1)
    setCurrentDate(newDate)
  }

  // 导航到下个月
  const goToNextMonth = () => {
    if (!canGoToNextMonth) return
    const newDate = new Date(currentYear, currentMonth, 1)
    setCurrentDate(newDate)
  }

  // 导航到今天
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // 刷新当前月份数据
  const refreshCurrentMonth = async () => {
    try {
      const data = await fetchMonthCalendar(currentYear, currentMonth, exchange, true) // forceRefresh = true
      setMonthData(data)
    } catch (err) {
      console.error('刷新日历失败:', err)
    }
  }

  // 获取日期样式
  const getDateStyle = (item: any) => {
    if (!item.isCurrentMonth) {
      return 'text-gray-300 hover:bg-gray-100'
    }

    if (item.isToday) {
      return 'bg-blue-100 text-blue-800 font-bold ring-2 ring-blue-500'
    }

    const calendarDate = item.calendarDate
    if (!calendarDate) {
      return 'text-gray-500'
    }

    if (calendarDate.isTrading) {
      return 'bg-green-100 text-green-800 hover:bg-green-200'
    } else if (calendarDate.isHoliday) {
      return 'bg-red-100 text-red-800 hover:bg-red-200'
    } else if (calendarDate.isWeekend) {
      return 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }

    return 'text-gray-500 hover:bg-gray-100'
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* 标题和控制区 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-600" />
            交易日历
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {monthData ? `本月共 ${monthData.tradingDays} 个交易日` : '加载中...'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* 交易所切换 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => switchExchange('SSE')}
              className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
                exchange === 'SSE' 
                  ? 'bg-white text-red-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="h-4 w-4 mr-1" />
              上交所
            </button>
            <button
              onClick={() => switchExchange('SZSE')}
              className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
                exchange === 'SZSE' 
                  ? 'bg-white text-green-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="h-4 w-4 mr-1" />
              深交所
            </button>
          </div>

          <button
            onClick={refreshCurrentMonth}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* 月份导航 */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPrevMonth}
          disabled={!canGoToPrevMonth}
          className={`p-2 rounded-lg transition-colors ${
            canGoToPrevMonth 
              ? 'hover:bg-gray-100 text-gray-700' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">
            {currentYear}年 {MONTHS[currentMonth - 1]}
          </h3>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            今天
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          disabled={!canGoToNextMonth}
          className={`p-2 rounded-lg transition-colors ${
            canGoToNextMonth 
              ? 'hover:bg-gray-100 text-gray-700' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* 日历表格 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 bg-gray-50">
          {WEEKDAYS.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* 日历格子 */}
        <div className="grid grid-cols-7">
          {calendarGrid.map((item, index) => (
            <div
              key={index}
              className={`
                h-16 border-r border-b border-gray-200 last-in-row:border-r-0 last:border-b-0
                flex items-center justify-center text-sm cursor-pointer transition-colors
                ${getDateStyle(item)}
              `}
            >
              <div className="text-center">
                <div className="font-medium">
                  {item.date.getDate()}
                </div>
                {item.isCurrentMonth && item.calendarDate && (
                  <div className="text-xs mt-1">
                    {item.calendarDate.isTrading ? '交易' : '休市'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap items-center justify-center space-x-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
          <span>交易日</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
          <span>节假日</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2"></div>
          <span>周末</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 border border-blue-500 rounded mr-2"></div>
          <span>今天</span>
        </div>
      </div>

      {/* 数据源信息 */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          {monthData ? `更新时间: ${new Date(monthData.lastUpdate).toLocaleString()}` : ''}
        </div>
        <div className="flex items-center">
          <TrendingUp className="h-3 w-3 mr-1" />
          数据来源：Tushare Pro
        </div>
      </div>
    </div>
  )
}