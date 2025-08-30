/**
 * 批量数据获取API端点
 * GET /api/tushare/batch-fetch
 * 一次性获取股票基本信息 + 最新行情数据 + 基础指标数据
 */

import { NextRequest } from 'next/server';
import { TushareClient } from '@/lib/tushare-client';
import { ApiResponseHandler, RequestValidator } from '@/lib/api-response';
import { DataTransformer } from '@/lib/data-transformer';
import { TUSHARE_CONFIG, getCurrentDate, getDateDaysAgo } from '../config';
import { Stock } from '@/types/stock';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') as 'SH' | 'SZ' | null; // 市场过滤
    const limit = searchParams.get('limit'); // 限制数量
    const include_market_data = searchParams.get('include_market_data') === 'true'; // 是否包含行情数据
    const include_basic_indicators = searchParams.get('include_basic_indicators') === 'true'; // 是否包含基础指标
    const list_status = searchParams.get('list_status') || 'L'; // 上市状态
    const trade_date = searchParams.get('trade_date') || getDateDaysAgo(1); // 交易日期，默认昨天

    console.log('Batch fetch request:', {
      market,
      limit,
      include_market_data,
      include_basic_indicators,
      list_status,
      trade_date
    });

    // 参数验证
    if (market && !['SH', 'SZ'].includes(market)) {
      throw new Error('Market must be SH or SZ');
    }

    RequestValidator.dateFormat(trade_date, 'trade_date');

    // 创建Tushare客户端
    const client = new TushareClient();

    // Step 1: 获取股票基本信息
    console.log('Step 1: 获取股票基本信息...');
    const stockBasicParams: any = {
      list_status,
      fields: TUSHARE_CONFIG.FIELDS.STOCK_BASIC
    };

    // 根据市场过滤
    if (market === 'SH') {
      stockBasicParams.exchange = 'SSE';
    } else if (market === 'SZ') {
      stockBasicParams.exchange = 'SZSE';
    }

    const stockBasicData = await client.getStockBasic(stockBasicParams);
    
    if (stockBasicData.length === 0) {
      throw new Error('未获取到股票基本信息数据');
    }

    console.log(`获取到 ${stockBasicData.length} 只股票基本信息`);

    // 应用数量限制
    let limitedStockData = stockBasicData;
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        limitedStockData = stockBasicData.slice(0, limitNum);
      }
    }

    console.log(`处理 ${limitedStockData.length} 只股票数据`);

    // Step 2: 获取行情数据（如果需要）
    let dailyDataMap: Map<string, any> | undefined;
    if (include_market_data) {
      console.log('Step 2: 获取行情数据...');
      try {
        const dailyData = await client.getDailyData({
          trade_date,
          fields: TUSHARE_CONFIG.FIELDS.DAILY
        });
        
        if (dailyData.length > 0) {
          dailyDataMap = DataTransformer.createDataMap(dailyData);
          console.log(`获取到 ${dailyData.length} 条行情数据`);
        } else {
          console.log('未获取到行情数据，可能是非交易日');
        }
      } catch (error) {
        console.warn('获取行情数据失败:', error);
        // 行情数据获取失败不影响整体流程
      }
    }

    // Step 3: 获取基础指标数据（如果需要）
    let basicIndicatorsMap: Map<string, any> | undefined;
    if (include_basic_indicators) {
      console.log('Step 3: 获取基础指标数据...');
      try {
        const basicData = await client.getDailyBasic({
          trade_date,
          fields: TUSHARE_CONFIG.FIELDS.DAILY_BASIC
        });
        
        if (basicData.length > 0) {
          basicIndicatorsMap = DataTransformer.createDataMap(basicData);
          console.log(`获取到 ${basicData.length} 条基础指标数据`);
        } else {
          console.log('未获取到基础指标数据，可能是非交易日');
        }
      } catch (error) {
        console.warn('获取基础指标数据失败:', error);
        // 基础指标获取失败不影响整体流程
      }
    }

    // Step 4: 数据合并和转换
    console.log('Step 4: 数据合并和转换...');
    const stocks: Stock[] = DataTransformer.batchMergeStockData(
      limitedStockData,
      dailyDataMap,
      basicIndicatorsMap
    );

    // Step 5: 生成统计信息
    const stats = generateBatchStats(stocks, {
      total_basic: stockBasicData.length,
      processed: limitedStockData.length,
      has_market_data: !!dailyDataMap,
      has_basic_indicators: !!basicIndicatorsMap,
      market_data_count: dailyDataMap?.size || 0,
      basic_indicators_count: basicIndicatorsMap?.size || 0,
      trade_date
    });

    console.log('批量数据获取完成:', stats.summary);

    return ApiResponseHandler.success(stocks, {
      total: stocks.length,
      stats,
      query: {
        market,
        limit: limit ? parseInt(limit) : undefined,
        include_market_data,
        include_basic_indicators,
        list_status,
        trade_date
      }
    });

  } catch (error) {
    console.error('Batch fetch API error:', error);
    return ApiResponseHandler.handleError(error);
  }
}

/**
 * 生成批量获取统计信息
 */
function generateBatchStats(stocks: Stock[], metadata: {
  total_basic: number;
  processed: number;
  has_market_data: boolean;
  has_basic_indicators: boolean;
  market_data_count: number;
  basic_indicators_count: number;
  trade_date: string;
}) {
  const stats = {
    summary: {
      total_stocks: stocks.length,
      total_basic_available: metadata.total_basic,
      processed_count: metadata.processed,
      with_market_data: 0,
      with_basic_indicators: 0,
      trade_date: metadata.trade_date
    },
    markets: {
      SH: stocks.filter(s => s.market === 'SH').length,
      SZ: stocks.filter(s => s.market === 'SZ').length,
    },
    industries: getTopIndustries(stocks, 10),
    data_quality: {
      basic_info_complete: stocks.length,
      market_data_coverage: 0,
      basic_indicators_coverage: 0
    },
    performance: {
      data_sources: [] as string[],
      api_calls_made: 1, // 至少有股票基本信息
      total_records_processed: stocks.length
    }
  };

  // 统计有行情数据的股票
  if (metadata.has_market_data) {
    stats.summary.with_market_data = stocks.filter(s => s.currentPrice && s.currentPrice > 0).length;
    stats.data_quality.market_data_coverage = Math.round(
      (stats.summary.with_market_data / stocks.length) * 100
    );
    stats.performance.data_sources.push('daily_market_data');
    stats.performance.api_calls_made++;
  }

  // 统计有基础指标的股票
  if (metadata.has_basic_indicators) {
    stats.summary.with_basic_indicators = stocks.filter(s => s['TTM市盈率'] && s['TTM市盈率'] > 0).length;
    stats.data_quality.basic_indicators_coverage = Math.round(
      (stats.summary.with_basic_indicators / stocks.length) * 100
    );
    stats.performance.data_sources.push('daily_basic_indicators');
    stats.performance.api_calls_made++;
  }

  return stats;
}

/**
 * 获取前N个行业分布
 */
function getTopIndustries(stocks: Stock[], top: number = 10) {
  const industryCount: Record<string, number> = {};
  
  stocks.forEach(stock => {
    const industry = stock.所属行业 || stock.industry || '未知';
    industryCount[industry] = (industryCount[industry] || 0) + 1;
  });

  return Object.entries(industryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, top)
    .map(([industry, count]) => ({
      industry,
      count,
      percentage: Math.round((count / stocks.length) * 100)
    }));
}