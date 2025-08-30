/**
 * 市场数据API端点 (日行情 + 基础指标)
 * GET /api/tushare/market-data
 */

import { NextRequest } from 'next/server';
import { TushareClient } from '@/lib/tushare-client';
import { ApiResponseHandler, RequestValidator } from '@/lib/api-response';
import { TUSHARE_CONFIG, getCurrentDate, getDateDaysAgo } from '../config';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const ts_code = searchParams.get('ts_code'); // 股票代码
    const trade_date = searchParams.get('trade_date') || getCurrentDate(); // 交易日期
    const start_date = searchParams.get('start_date'); 
    const end_date = searchParams.get('end_date');
    const limit = searchParams.get('limit');
    const include_basic = searchParams.get('include_basic') === 'true'; // 是否包含基础指标

    // 参数验证
    RequestValidator.dateFormat(trade_date, 'trade_date');
    
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

    console.log('Calling Tushare market data API...');

    // 并行获取数据以提高性能
    const promises: Promise<any>[] = [];
    
    // 构建日行情请求参数
    const dailyParams: any = {};
    if (ts_code) {
      dailyParams.ts_code = ts_code;
    }
    if (start_date && end_date) {
      dailyParams.start_date = start_date;
      dailyParams.end_date = end_date;
    } else {
      dailyParams.trade_date = trade_date;
    }

    // 获取日行情数据
    promises.push(client.getDailyData(dailyParams));

    // 如果需要基础指标数据，并行获取
    if (include_basic) {
      promises.push(client.getDailyBasic(dailyParams));
    }

    const results = await Promise.all(promises);
    const dailyData = results[0] || [];
    const basicData = include_basic ? results[1] || [] : [];

    // 合并数据（如果都有数据的话）
    let combinedData = dailyData;
    
    if (include_basic && basicData.length > 0) {
      // 创建基础数据的映射表
      const basicDataMap = new Map();
      basicData.forEach((item: any) => {
        const key = `${item.ts_code}_${item.trade_date}`;
        basicDataMap.set(key, item);
      });

      // 合并数据
      combinedData = dailyData.map((daily: any) => {
        const key = `${daily.ts_code}_${daily.trade_date}`;
        const basic = basicDataMap.get(key);
        
        return {
          ...daily,
          ...(basic && {
            // 基础指标字段
            turnover_rate: basic.turnover_rate,
            pe: basic.pe,
            pb: basic.pb,
            ps: basic.ps,
            dv_ratio: basic.dv_ratio,
            total_share: basic.total_share,
            float_share: basic.float_share,
            total_mv: basic.total_mv,
            circ_mv: basic.circ_mv,
          })
        };
      });
    }

    // 应用限制
    let result = combinedData;
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        result = combinedData.slice(0, limitNum);
      }
    }

    // 生成统计信息
    const stats = generateMarketStats(result);

    return ApiResponseHandler.success(result, {
      total: result.length,
      stats,
      query: {
        ts_code,
        trade_date,
        start_date,
        end_date,
        include_basic,
        limit: limit ? parseInt(limit) : undefined
      }
    });

  } catch (error) {
    console.error('Market data API error:', error);
    return ApiResponseHandler.handleError(error);
  }
}

/**
 * 生成市场数据统计信息
 */
function generateMarketStats(data: any[]) {
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

    // 价格统计
    if (item.close) {
      totalClose += item.close;
    }
    
    if (item.pct_chg) {
      totalChangePct += item.pct_chg;
      if (item.pct_chg > 0) {
        stats.price_stats.positive_count++;
      } else if (item.pct_chg < 0) {
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