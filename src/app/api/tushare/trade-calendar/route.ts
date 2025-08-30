/**
 * 交易日历API端点
 * GET /api/tushare/trade-calendar
 */

import { NextRequest } from 'next/server';
import { TushareClient } from '@/lib/tushare-client';
import { ApiResponseHandler, RequestValidator } from '@/lib/api-response';
import { TUSHARE_CONFIG, getCurrentDate, getDateDaysAgo } from '../config';
import { TradeCalendarItem } from '@/types/stock';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange') || 'SSE'; // 默认上交所
    const start_date = searchParams.get('start_date') || getDateDaysAgo(30); // 默认30天前
    const end_date = searchParams.get('end_date') || getCurrentDate(); // 默认今天
    const is_open = searchParams.get('is_open'); // 可选：筛选交易日/休市日

    // 参数验证
    RequestValidator.dateFormat(start_date, 'start_date');
    RequestValidator.dateFormat(end_date, 'end_date');

    if (exchange && !['SSE', 'SZSE'].includes(exchange)) {
      throw new Error('Invalid exchange. Use SSE or SZSE');
    }

    console.log('Calling Tushare trade calendar API...', {
      exchange,
      start_date,
      end_date,
      is_open
    });

    // 创建Tushare客户端
    const client = new TushareClient();

    // 构建请求参数
    const params: any = {
      exchange,
      start_date,
      end_date
    };

    if (is_open !== null && is_open !== undefined) {
      const isOpenNum = parseInt(is_open);
      if (!isNaN(isOpenNum) && [0, 1].includes(isOpenNum)) {
        params.is_open = isOpenNum;
      }
    }

    // 调用交易日历API
    const calendarData = await client.getTradeCal(params);

    // 转换数据为标准格式
    const transformedData: TradeCalendarItem[] = calendarData.map((item: any) => ({
      exchange: item.exchange || exchange,
      cal_date: item.cal_date,
      is_open: typeof item.is_open === 'number' ? item.is_open : parseInt(item.is_open) || 0,
      pretrade_date: item.pretrade_date || ''
    }));

    // 生成统计信息
    const stats = generateCalendarStats(transformedData, start_date, end_date);

    return ApiResponseHandler.success(transformedData, {
      total: transformedData.length,
      stats,
      query: {
        exchange,
        start_date,
        end_date,
        is_open
      }
    });

  } catch (error) {
    console.error('Trade calendar API error:', error);
    return ApiResponseHandler.handleError(error);
  }
}

/**
 * 生成交易日历统计信息
 */
function generateCalendarStats(data: TradeCalendarItem[], startDate: string, endDate: string) {
  const stats = {
    total_days: data.length,
    trading_days: 0,
    non_trading_days: 0,
    date_range: {
      start: startDate,
      end: endDate
    },
    trading_ratio: 0,
    exchanges: {} as Record<string, { trading: number; total: number }>
  };

  // 统计各项数据
  data.forEach(item => {
    if (item.is_open === 1) {
      stats.trading_days++;
    } else {
      stats.non_trading_days++;
    }

    // 按交易所统计
    if (!stats.exchanges[item.exchange]) {
      stats.exchanges[item.exchange] = { trading: 0, total: 0 };
    }
    stats.exchanges[item.exchange].total++;
    if (item.is_open === 1) {
      stats.exchanges[item.exchange].trading++;
    }
  });

  // 计算交易日比例
  if (stats.total_days > 0) {
    stats.trading_ratio = Math.round((stats.trading_days / stats.total_days) * 100 * 100) / 100;
  }

  return stats;
}