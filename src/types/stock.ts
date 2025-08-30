export interface Stock {
  id: string
  symbol: string // 股票代码 (600000)
  name: string   // 股票名称
  market: string // 市场 (SH/SZ)
  addedAt: string // 添加时间
  currentPrice?: number
  change?: number
  changePercent?: number
  
  // === 行情更新相关字段 ===
  lastUpdateTime?: string // 最后更新时间
  tradeDate?: string      // 交易日期
  
  // === 扩展字段：Table.xls 文件中的所有字段 ===
  // 基础信息
  代码?: string
  名称?: string
  所属行业?: string
  细分行业?: string
  备注?: string
  
  // 价格相关
  现价?: number
  昨收?: number
  开盘?: number
  最高?: number
  最低?: number
  买价?: number
  卖价?: number
  涨跌?: number
  涨幅?: number
  开盘涨幅?: number
  实体涨幅?: number
  
  // 成交量和金额
  总手?: number
  现手?: number
  总金额?: number
  内盘?: number
  外盘?: number
  内外比?: number
  换手?: number
  竞价换手?: number
  量比?: number
  
  // 市值相关
  总市值?: number
  流通市值?: number
  流通比例?: number
  
  // 技术指标
  委比?: number
  现均差?: number
  主力净量?: number
  '1分钟涨速'?: number
  '4分钟涨速'?: number
  
  // 估值指标
  TTM市盈率?: number
  市净率?: number
  每股盈利?: number
  净利润?: number
  
  // 自选相关
  自选时间?: string
  自选价格?: number
  自选收益?: number
  
  // 利好利空
  利好?: string
  利空?: string
  
  // 涨跌幅区间
  '5日涨幅'?: number
  '10日涨幅'?: number
  '20日涨幅'?: number
  '60日涨幅'?: number
  月涨幅?: number
  
  // 成交额相关
  '5日成交额'?: number
  总成交额?: number
  
  // 其他技术指标
  振幅?: number
  量价比?: number
  价格位置?: number
  
  // 预留字段（用于存储其他动态字段）
  [key: string]: any
}

export interface StockImportData {
  symbol: string
  name: string
  [key: string]: any // 允许其他字段
}

// 交易日历相关接口
export interface TradeCalendarItem {
  exchange: string     // 交易所 (SSE/SZSE)
  cal_date: string     // 日历日期 (YYYYMMDD)
  is_open: number      // 是否交易 (0休市/1交易)
  pretrade_date: string // 上一个交易日 (YYYYMMDD)
}

// 日历日期信息（前端使用）
export interface CalendarDate {
  date: Date           // JavaScript Date对象
  dateString: string   // YYYY-MM-DD格式
  isTrading: boolean   // 是否交易日
  isWeekend: boolean   // 是否周末
  isHoliday: boolean   // 是否节假日
  exchange: string     // 交易所
  tradeDate: string    // 交易日期 (YYYYMMDD)
}

// 月度日历数据
export interface MonthCalendarData {
  year: number
  month: number        // 1-12
  dates: CalendarDate[]
  tradingDays: number  // 当月交易日数量
  lastUpdate: string   // 最后更新时间
}