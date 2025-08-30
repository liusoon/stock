/**
 * 备份日行情数据API端点
 * GET /api/tushare/bak-daily
 */

import { NextRequest } from 'next/server';
import { TushareClient } from '@/lib/tushare-client';
import { ApiResponseHandler, RequestValidator } from '@/lib/api-response';
import { getCurrentDate } from '../config';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const ts_code = searchParams.get('ts_code'); // 股票代码
    const trade_date = searchParams.get('trade_date');
    const start_date = searchParams.get('start_date'); 
    const end_date = searchParams.get('end_date');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // 参数验证
    if (trade_date) {
      RequestValidator.dateFormat(trade_date, 'trade_date');
    }
    
    if (start_date) {
      RequestValidator.dateFormat(start_date, 'start_date');
    }
    
    if (end_date) {
      RequestValidator.dateFormat(end_date, 'end_date');
    }

    if (ts_code) {
      RequestValidator.stockCode(ts_code, 'ts_code');
    }

    // 创建Tushare客户端
    const client = new TushareClient();

    console.log('Calling Tushare bak_daily API...');

    // 构建备份日行情请求参数
    const bakDailyParams: any = {};
    if (ts_code) {
      bakDailyParams.ts_code = ts_code;
    }
    if (start_date && end_date) {
      bakDailyParams.start_date = start_date;
      bakDailyParams.end_date = end_date;
    } else if (trade_date) {
      bakDailyParams.trade_date = trade_date;
    }
    if (limit) {
      bakDailyParams.limit = limit;
    }
    if (offset) {
      bakDailyParams.offset = offset;
    }

    // 获取备份日行情数据
    const bakDailyData = await client.getBakDaily(bakDailyParams);

    // 应用限制
    let result = bakDailyData;
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        result = bakDailyData.slice(0, limitNum);
      }
    }

    // 生成统计信息
    const stats = generateBakDailyStats(result);

    return ApiResponseHandler.success(result, {
      total: result.length,
      stats,
      query: {
        ts_code,
        trade_date,
        start_date,
        end_date,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      }
    });

  } catch (error) {
    console.error('Bak daily API error:', error);
    return ApiResponseHandler.handleError(error);
  }
}

/**
 * 生成备份日行情统计信息
 */
function generateBakDailyStats(data: any[]) {
  if (data.length === 0) return null;

  const stats = {
    total_records: data.length,
    date_range: {
      start: null as string | null,
      end: null as string | null
    },
    markets: {
      SH: 0,
      SZ: 0
    },
    price_stats: {
      avg_close: 0,
      avg_change_pct: 0,
      positive_count: 0,
      negative_count: 0
    },
    volume_stats: {
      total_volume: 0,
      total_amount: 0,
      avg_volume: 0
    }
  };

  let totalClose = 0;
  let totalChangePct = 0;
  let totalVolume = 0;
  let totalAmount = 0;
  const dates = new Set<string>();

  data.forEach(item => {
    // 日期范围
    if (item.trade_date) {
      dates.add(item.trade_date);
    }

    // 市场分布
    if (item.ts_code) {
      if (item.ts_code.includes('.SH')) {
        stats.markets.SH++;
      } else if (item.ts_code.includes('.SZ')) {
        stats.markets.SZ++;
      }
    }

    // 价格统计 - 注意：bak_daily 使用 pct_change 而不是 pct_chg
    if (item.close) {
      totalClose += item.close;
    }
    
    if (item.pct_change) {
      totalChangePct += item.pct_change;
      if (item.pct_change > 0) {
        stats.price_stats.positive_count++;
      } else if (item.pct_change < 0) {
        stats.price_stats.negative_count++;
      }
    }

    // 成交量统计
    if (item.vol) {
      totalVolume += item.vol;
    }
    
    if (item.amount) {
      totalAmount += item.amount;
    }
  });

  // 计算平均值
  const count = data.length;
  if (count > 0) {
    stats.price_stats.avg_close = Math.round((totalClose / count) * 100) / 100;
    stats.price_stats.avg_change_pct = Math.round((totalChangePct / count) * 100) / 100;
    stats.volume_stats.avg_volume = Math.round(totalVolume / count);
    stats.volume_stats.total_volume = totalVolume;
    stats.volume_stats.total_amount = totalAmount;
  }

  // 日期范围
  const sortedDates = Array.from(dates).sort();
  if (sortedDates.length > 0) {
    stats.date_range.start = sortedDates[0];
    stats.date_range.end = sortedDates[sortedDates.length - 1];
  }

  return stats;
}