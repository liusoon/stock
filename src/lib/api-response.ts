/**
 * API响应格式标准化
 * 提供统一的成功和错误响应格式
 */

import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp: string;
    stats?: any;
    query?: any;
    [key: string]: any;
  };
}

export class ApiResponseHandler {
  /**
   * 创建成功响应
   */
  static success<T>(
    data: T, 
    meta?: Partial<ApiResponse['meta']>
  ): NextResponse<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    return NextResponse.json(response);
  }

  /**
   * 创建错误响应
   */
  static error(
    message: string,
    code: string = 'INTERNAL_ERROR',
    status: number = 500,
    details?: any
  ): NextResponse<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response, { status });
  }

  /**
   * 处理API路由中的错误
   */
  static handleError(error: any): NextResponse<ApiResponse> {
    console.error('API Error:', error);

    // Tushare API错误
    if (error.message?.includes('Tushare API error')) {
      return this.error(
        error.message,
        'TUSHARE_API_ERROR',
        400,
        { originalError: error.message }
      );
    }

    // 网络错误
    if (error.message?.includes('fetch')) {
      return this.error(
        'Failed to connect to Tushare API',
        'NETWORK_ERROR',
        503
      );
    }

    // Token错误
    if (error.message?.includes('TUSHARE_TOKEN')) {
      return this.error(
        'Tushare token is not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    // 参数错误
    if (error.name === 'ValidationError') {
      return this.error(
        error.message,
        'VALIDATION_ERROR',
        400,
        error.details
      );
    }

    // 默认内部错误
    return this.error(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * 参数验证错误类
 */
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 请求参数验证工具
 */
export class RequestValidator {
  /**
   * 验证必需参数
   */
  static required(params: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required parameters: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }
  }

  /**
   * 验证日期格式 (YYYYMMDD)
   */
  static dateFormat(date: string, fieldName: string = 'date'): void {
    if (date && !/^\d{8}$/.test(date)) {
      throw new ValidationError(
        `Invalid ${fieldName} format. Expected YYYYMMDD, got: ${date}`
      );
    }
  }

  /**
   * 验证股票代码格式
   */
  static stockCode(code: string, fieldName: string = 'ts_code'): void {
    if (code && !/^\d{6}\.(SH|SZ)$/.test(code)) {
      throw new ValidationError(
        `Invalid ${fieldName} format. Expected XXXXXX.SH or XXXXXX.SZ, got: ${code}`
      );
    }
  }

  /**
   * 验证数值范围
   */
  static numberRange(
    value: number, 
    min: number, 
    max: number, 
    fieldName: string = 'value'
  ): void {
    if (value < min || value > max) {
      throw new ValidationError(
        `${fieldName} must be between ${min} and ${max}, got: ${value}`
      );
    }
  }
}