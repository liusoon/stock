/**
 * Tushare API客户端
 * 处理API调用、错误处理和数据转换
 */

export interface TushareResponse<T = any> {
  request_id: string;
  code: number;
  msg: string;
  data?: {
    fields: string[];
    items: Array<Array<any>>;
    has_more: boolean;
  };
}

export interface TushareRequestParams {
  api_name: string;
  token: string;
  params?: Record<string, any>;
  fields?: string;
}

export class TushareClient {
  private baseUrl = 'http://api.waditu.com';
  private token: string;
  private rateLimit: number;

  constructor() {
    this.token = process.env.TUSHARE_TOKEN || '';
    this.rateLimit = parseInt(process.env.TUSHARE_RATE_LIMIT_DELAY || '200');
    
    if (!this.token) {
      throw new Error('TUSHARE_TOKEN environment variable is required');
    }
  }

  /**
   * 延迟执行，用于API限流
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 调用Tushare API
   */
  async call<T = any>(params: Omit<TushareRequestParams, 'token'>): Promise<TushareResponse<T>> {
    const requestParams: TushareRequestParams = {
      ...params,
      token: this.token
    };

    try {
      // API限流
      await this.delay(this.rateLimit);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TushareResponse<T> = await response.json();

      if (data.code !== 0) {
        throw new Error(`Tushare API error: ${data.msg} (code: ${data.code})`);
      }

      return data;
    } catch (error) {
      console.error('Tushare API call failed:', error);
      throw error;
    }
  }

  /**
   * 将Tushare响应数据转换为对象数组
   */
  transformResponse<T = Record<string, any>>(response: TushareResponse): T[] {
    if (!response.data || !response.data.fields || !response.data.items) {
      return [];
    }

    const { fields, items } = response.data;
    
    return items.map(item => {
      const obj: Record<string, any> = {};
      fields.forEach((field, index) => {
        obj[field] = item[index];
      });
      return obj as T;
    });
  }

  /**
   * 获取股票基本信息
   */
  async getStockBasic(params: {
    exchange?: string;
    list_status?: string;
    fields?: string;
  } = {}) {
    const response = await this.call({
      api_name: 'stock_basic',
      params: {
        exchange: params.exchange || '',
        list_status: params.list_status || 'L',
        ...params
      },
      fields: params.fields || 'ts_code,symbol,name,area,industry,market,list_date'
    });

    return this.transformResponse(response);
  }

  /**
   * 获取日行情数据
   */
  async getDailyData(params: {
    ts_code?: string;
    trade_date?: string;
    start_date?: string;
    end_date?: string;
    fields?: string;
  } = {}) {
    const response = await this.call({
      api_name: 'daily',
      params: {
        ...params
      },
      fields: params.fields || 'ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount'
    });

    return this.transformResponse(response);
  }

  /**
   * 获取每日基础指标
   */
  async getDailyBasic(params: {
    ts_code?: string;
    trade_date?: string;
    start_date?: string;
    end_date?: string;
    fields?: string;
  } = {}) {
    const response = await this.call({
      api_name: 'daily_basic',
      params: {
        ...params
      },
      fields: params.fields || 'ts_code,trade_date,close,turnover_rate,pe,pb,ps,dv_ratio,total_share,float_share,free_share,total_mv,circ_mv'
    });

    return this.transformResponse(response);
  }

  /**
   * 获取交易日历
   */
  async getTradeCal(params: {
    exchange?: string;
    start_date?: string;
    end_date?: string;
    is_open?: number;
  } = {}) {
    const response = await this.call({
      api_name: 'trade_cal',
      params: {
        exchange: params.exchange || 'SSE',
        ...params
      },
      fields: 'exchange,cal_date,is_open,pretrade_date'
    });

    return this.transformResponse(response);
  }

  /**
   * 获取备份日行情数据 (bak_daily)
   */
  async getBakDaily(params: {
    ts_code?: string;
    trade_date?: string;
    start_date?: string;
    end_date?: string;
    offset?: string;
    limit?: string;
    fields?: string;
  } = {}) {
    const response = await this.call({
      api_name: 'bak_daily',
      params: {
        ...params
      },
      fields: params.fields || 'ts_code,trade_date,name,close,open,high,low,pct_change,vol,amount'
    });

    return this.transformResponse(response);
  }

  /**
   * 获取K线历史数据（专用于K线图表）
   * 基于备份日行情数据，但返回格式优化用于K线显示
   */
  async getKLineHistory(params: {
    ts_code: string;
    start_date?: string;
    end_date?: string;
    limit?: string;
  }) {
    return this.getBakDaily({
      ts_code: params.ts_code,
      start_date: params.start_date,
      end_date: params.end_date,
      limit: params.limit,
      fields: 'ts_code,trade_date,name,close,open,high,low,pct_change,vol,amount'
    });
  }

  /**
   * 获取实时K线数据 (rt_k)
   */
  async getRtK(params: {
    ts_code: string;
    fields?: string;
  }) {
    const response = await this.call({
      api_name: 'rt_k',
      params: {
        ts_code: params.ts_code
      },
      fields: params.fields || 'ts_code,name,pre_close,high,open,low,close,vol,amount,num'
    });

    return this.transformResponse(response);
  }

  /**
   * 获取分钟级K线数据 (stk_mins)
   */
  async getStkMins(params: {
    ts_code: string;
    freq: '1min' | '5min' | '15min' | '30min' | '60min';
    start_date?: string;
    end_date?: string;
    fields?: string;
  }) {
    const response = await this.call({
      api_name: 'stk_mins',
      params: {
        ts_code: params.ts_code,
        freq: params.freq,
        start_date: params.start_date,
        end_date: params.end_date
      },
      fields: params.fields || 'ts_code,trade_time,open,high,low,close,vol,amount'
    });

    return this.transformResponse(response);
  }
}