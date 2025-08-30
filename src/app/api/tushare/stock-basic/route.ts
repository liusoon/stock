/**
 * 股票基本信息API端点
 * GET /api/tushare/stock-basic
 */

import { NextRequest } from 'next/server';
import { TushareClient } from '@/lib/tushare-client';
import { ApiResponseHandler, RequestValidator } from '@/lib/api-response';
import { TUSHARE_CONFIG } from '../config';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const exchange = searchParams.get('exchange') || '';
    const list_status = searchParams.get('list_status') || TUSHARE_CONFIG.DEFAULTS.LIST_STATUS;
    const market = searchParams.get('market'); // SH或SZ
    const fields = searchParams.get('fields') || TUSHARE_CONFIG.FIELDS.STOCK_BASIC;
    const limit = searchParams.get('limit');

    // 参数验证
    if (list_status && !['L', 'D', 'P'].includes(list_status)) {
      RequestValidator.required({ list_status: 'L' }, ['list_status']);
    }

    if (market && !['SH', 'SZ'].includes(market)) {
      throw new Error('Market must be SH or SZ');
    }

    // 创建Tushare客户端
    const client = new TushareClient();

    // 构建请求参数
    const params: any = {
      exchange,
      list_status,
      fields
    };

    // 如果指定了市场，设置对应的exchange
    if (market === 'SH') {
      params.exchange = 'SSE';
    } else if (market === 'SZ') {
      params.exchange = 'SZSE';
    }

    // 调用Tushare API
    console.log('Calling Tushare stock_basic API with params:', params);
    const stockList = await client.getStockBasic(params);

    // 如果设置了限制条数
    let result = stockList;
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        result = stockList.slice(0, limitNum);
      }
    }

    // 添加统计信息
    const stats = {
      total: result.length,
      markets: {
        SH: result.filter(stock => stock.ts_code?.endsWith('.SH')).length,
        SZ: result.filter(stock => stock.ts_code?.endsWith('.SZ')).length,
      },
      industries: getTopIndustries(result, 5)
    };

    return ApiResponseHandler.success(result, {
      total: result.length,
      stats,
      query: {
        exchange,
        list_status,
        market,
        limit: limit ? parseInt(limit) : undefined
      }
    });

  } catch (error) {
    console.error('Stock basic API error:', error);
    return ApiResponseHandler.handleError(error);
  }
}

/**
 * 获取前N个行业分布
 */
function getTopIndustries(stocks: any[], top: number = 5) {
  const industryCount: Record<string, number> = {};
  
  stocks.forEach(stock => {
    if (stock.industry) {
      industryCount[stock.industry] = (industryCount[stock.industry] || 0) + 1;
    }
  });

  return Object.entries(industryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, top)
    .map(([industry, count]) => ({
      industry,
      count
    }));
}