/**
 * 交易日历数据管理Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { TradeCalendarItem, CalendarDate, MonthCalendarData } from '@/types/stock';

interface TradeCalendarApi {
  success: boolean;
  data: TradeCalendarItem[];
  meta?: {
    total: number;
    stats: any;
    query: any;
  };
}

export function useTradeCalendar() {
  const [calendarData, setCalendarData] = useState<Map<string, MonthCalendarData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchange, setExchange] = useState<'SSE' | 'SZSE'>('SSE');

  /**
   * 格式化日期为YYYYMMDD
   */
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  /**
   * 生成月度日历的缓存key
   */
  const getMonthKey = (year: number, month: number, exchange: string): string => {
    return `${year}-${String(month).padStart(2, '0')}-${exchange}`;
  };

  /**
   * 将YYYYMMDD转换为Date对象
   */
  const parseDate = (dateString: string): Date => {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1; // JS月份从0开始
    const day = parseInt(dateString.substring(6, 8));
    return new Date(year, month, day);
  };

  /**
   * 转换API数据为前端日历格式
   */
  const transformToCalendarDates = (
    apiData: TradeCalendarItem[], 
    year: number, 
    month: number
  ): CalendarDate[] => {
    const dates: CalendarDate[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 创建交易数据的映射表
    const tradeMap = new Map<string, TradeCalendarItem>();
    apiData.forEach(item => {
      tradeMap.set(item.cal_date, item);
    });

    // 生成该月所有日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day); // JS月份从0开始
      const dateString = formatDateToString(date);
      const tradeInfo = tradeMap.get(dateString);
      
      // 判断是否为周末
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const calendarDate: CalendarDate = {
        date: date,
        dateString: date.toISOString().split('T')[0], // YYYY-MM-DD
        isTrading: tradeInfo ? tradeInfo.is_open === 1 : false,
        isWeekend: isWeekend,
        isHoliday: tradeInfo ? tradeInfo.is_open === 0 && !isWeekend : false,
        exchange: exchange,
        tradeDate: dateString
      };
      
      dates.push(calendarDate);
    }

    return dates;
  };

  /**
   * 获取指定月份的交易日历
   */
  const fetchMonthCalendar = useCallback(async (year: number, month: number, targetExchange: string = exchange, forceRefresh: boolean = false) => {
    const monthKey = getMonthKey(year, month, targetExchange);
    
    // 检查缓存 (除非强制刷新)
    if (!forceRefresh && calendarData.has(monthKey)) {
      return calendarData.get(monthKey)!;
    }

    setLoading(true);
    setError(null);

    try {
      // 计算查询日期范围
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // 该月最后一天
      
      const start_date = formatDateToString(startDate);
      const end_date = formatDateToString(endDate);

      console.log(`获取${year}年${month}月交易日历...`, { start_date, end_date, exchange: targetExchange });

      // 调用API
      const response = await fetch(
        `/api/tushare/trade-calendar?exchange=${targetExchange}&start_date=${start_date}&end_date=${end_date}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TradeCalendarApi = await response.json();

      if (!result.success) {
        throw new Error('API返回失败状态');
      }

      // 转换数据
      const dates = transformToCalendarDates(result.data, year, month);
      const tradingDays = dates.filter(d => d.isTrading).length;

      const monthData: MonthCalendarData = {
        year,
        month,
        dates,
        tradingDays,
        lastUpdate: new Date().toISOString()
      };

      // 更新缓存
      setCalendarData(prev => new Map(prev).set(monthKey, monthData));

      return monthData;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '获取交易日历失败';
      console.error('获取交易日历异常:', err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [exchange, calendarData]);

  /**
   * 获取当前月份的交易日历
   */
  const getCurrentMonthCalendar = useCallback(async (forceRefresh: boolean = false) => {
    const now = new Date();
    return fetchMonthCalendar(now.getFullYear(), now.getMonth() + 1, exchange, forceRefresh);
  }, [fetchMonthCalendar, exchange]);

  /**
   * 清除缓存
   */
  const clearCache = useCallback(() => {
    setCalendarData(new Map());
  }, []);

  /**
   * 切换交易所
   */
  const switchExchange = useCallback((newExchange: 'SSE' | 'SZSE') => {
    setExchange(newExchange);
  }, []);

  /**
   * 获取缓存的月度数据
   */
  const getCachedMonth = useCallback((year: number, month: number, targetExchange: string = exchange) => {
    const monthKey = getMonthKey(year, month, targetExchange);
    return calendarData.get(monthKey);
  }, [calendarData, exchange]);

  return {
    loading,
    error,
    exchange,
    fetchMonthCalendar,
    getCurrentMonthCalendar,
    getCachedMonth,
    clearCache,
    switchExchange,
    calendarData: Array.from(calendarData.values())
  };
}