/**
 * 分钟级K线数据API端点
 * GET /api/tushare/stk-mins
 */

import { NextRequest } from 'next/server';
import { TushareClient } from '@/lib/tushare-client';
import { ApiResponseHandler, RequestValidator } from '@/lib/api-response';
import { getCurrentDate, getDateDaysAgo } from '../config';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const ts_code = searchParams.get('ts_code');
    const freq = searchParams.get('freq') as '1min' | '5min' | '15min' | '30min' | '60min' || '60min';
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const days = parseInt(searchParams.get('days') || '5'); // 默认最近5天

    // 参数验证
    if (!ts_code) {
      return ApiResponseHandler.error(
        'ts_code parameter is required',
        'VALIDATION_ERROR',
        400
      );
    }

    RequestValidator.stockCode(ts_code, 'ts_code');

    // 验证频率参数
    const validFreqs = ['1min', '5min', '15min', '30min', '60min'];
    if (!validFreqs.includes(freq)) {
      return ApiResponseHandler.error(
        `Invalid freq parameter. Must be one of: ${validFreqs.join(', ')}`,
        'VALIDATION_ERROR',
        400
      );
    }

    // 创建Tushare客户端
    const client = new TushareClient();

    console.log(`Calling Tushare stk_mins API: ${ts_code}, freq: ${freq}`);

    // 如果没有提供时间范围，自动计算最近N天
    let finalStartDate = start_date;
    let finalEndDate = end_date;

    if (!start_date || !end_date) {
      // 计算最近N天的时间范围 (包含一些缓冲天数以确保有足够的交易日)
      const bufferDays = Math.max(days * 1.5, 10); // 至少10天缓冲
      finalStartDate = getDateDaysAgo(bufferDays) + ' 09:00:00';
      finalEndDate = getCurrentDate() + ' 15:30:00';
    }

    console.log(`Time range: ${finalStartDate} to ${finalEndDate}`);

    // 获取分钟级K线数据
    const stkMinsData = await client.getStkMins({
      ts_code,
      freq,
      start_date: finalStartDate,
      end_date: finalEndDate
    });

    // 按时间排序数据 (最新的在前)
    const sortedData = stkMinsData.sort((a: any, b: any) => {
      return new Date(b.trade_time).getTime() - new Date(a.trade_time).getTime();
    });

    // 如果指定了days参数，只返回最近的数据
    let resultData = sortedData;
    if (days && !start_date && !end_date) {
      // 计算需要的K线数量 (每个交易日的K线数量)
      const klinePerDay = getKLineCountPerDay(freq);
      const maxKLines = days * klinePerDay;
      resultData = sortedData.slice(0, maxKLines);
    }

    // 重新按时间正序排列 (用于图表显示)
    resultData = resultData.reverse();

    // 生成统计信息
    const stats = generateStkMinsStats(resultData, freq, days);

    return ApiResponseHandler.success(resultData, {
      total: resultData.length,
      stats,
      query: {
        ts_code,
        freq,
        start_date: finalStartDate,
        end_date: finalEndDate,
        days
      }
    });

  } catch (error) {
    console.error('Stk mins API error:', error);
    return ApiResponseHandler.handleError(error);
  }
}

/**
 * 根据频率计算每个交易日的K线数量
 */
function getKLineCountPerDay(freq: string): number {
  // 交易时间：9:30-11:30 (2小时), 13:00-15:00 (2小时) = 4小时 = 240分钟
  const tradingMinutesPerDay = 240;

  switch (freq) {
    case '1min':
      return tradingMinutesPerDay; // 240根K线
    case '5min':
      return tradingMinutesPerDay / 5; // 48根K线
    case '15min':
      return tradingMinutesPerDay / 15; // 16根K线
    case '30min':
      return tradingMinutesPerDay / 30; // 8根K线
    case '60min':
      return tradingMinutesPerDay / 60; // 4根K线
    default:
      return 4; // 默认60分钟
  }
}

/**
 * 生成分钟级K线统计信息
 */
function generateStkMinsStats(data: any[], freq: string, days: number) {
  if (data.length === 0) return null;

  const stats = {
    total_records: data.length,
    frequency: freq,
    days_requested: days,
    time_range: {
      start: data[0]?.trade_time || null,
      end: data[data.length - 1]?.trade_time || null
    },
    price_stats: {
      highest_price: 0,
      lowest_price: Number.MAX_VALUE,
      price_change_total: 0,
      avg_volume: 0
    },
    trading_sessions: {
      morning_count: 0,   // 9:30-11:30
      afternoon_count: 0  // 13:00-15:00
    }
  };

  let totalVolume = 0;
  let highestPrice = 0;
  let lowestPrice = Number.MAX_VALUE;

  data.forEach(item => {
    // 价格统计
    if (item.high > highestPrice) {
      highestPrice = item.high;
    }
    if (item.low < lowestPrice) {
      lowestPrice = item.low;
    }

    // 成交量统计
    totalVolume += item.vol || 0;

    // 交易时段统计
    const time = item.trade_time;
    if (time) {
      const hour = parseInt(time.split(' ')[1].split(':')[0]);
      if (hour >= 9 && hour < 12) {
        stats.trading_sessions.morning_count++;
      } else if (hour >= 13 && hour < 16) {
        stats.trading_sessions.afternoon_count++;
      }
    }
  });

  // 计算最终统计值
  stats.price_stats.highest_price = highestPrice;
  stats.price_stats.lowest_price = lowestPrice === Number.MAX_VALUE ? 0 : lowestPrice;
  stats.price_stats.price_change_total = highestPrice - lowestPrice;
  stats.price_stats.avg_volume = data.length > 0 ? Math.round(totalVolume / data.length) : 0;

  return stats;
}