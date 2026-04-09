import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface BaiduTranslateResponse {
  from: string;
  to: string;
  trans_result: {
    src: string;
    dst: string;
  }[];
  error_code?: string;
  error_msg?: string;
}

// 从环境变量获取百度翻译 API 配置
const BAIDU_APP_ID = process.env.NEXT_PUBLIC_BAIDU_APP_ID || '';
const BAIDU_SECRET_KEY = process.env.NEXT_PUBLIC_BAIDU_SECRET_KEY || '';
const BAIDU_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

/**
 * 生成 MD5 签名
 */
function generateMD5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * 获取百度翻译 API 错误码对应的错误信息
 */
function getBaiduErrorMessage(errorCode: string, errorMsg?: string): string {
  const errorMap: Record<string, string> = {
    '52000': '成功',
    '52001': '请求超时，请重试',
    '52002': '系统错误，请重试',
    '52003': '未授权用户，请检查 appid 是否正确',
    '54000': '必填参数为空或固定参数有误',
    '54001': '签名错误，请检查密钥是否正确',
    '54003': '访问频率受限，请降低调用频率',
    '54004': '账户余额不足，请充值',
    '54005': '长query请求频繁，请降低长query的发送频率',
    '58000': '客户端IP非法，请检查IP白名单设置',
    '58001': '译文语言方向不支持，请检查语言参数',
    '58002': '服务当前已关闭，请稍后再试',
    '90107': '认证未通过或未生效，请检查认证信息',
  };

  return errorMap[errorCode] || errorMsg || '未知错误';
}

// POST /api/translate/batch
export async function POST(request: NextRequest) {
  try {
    // 检查配置
    if (!BAIDU_APP_ID || !BAIDU_SECRET_KEY) {
      return NextResponse.json(
        { error: '百度翻译 API 配置缺失' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { texts, from = 'en', to = 'zh' } = body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: '翻译文本数组不能为空' },
        { status: 400 }
      );
    }

    // 过滤空文本并用 \n 连接多个查询
    const validTexts = texts.filter(t => t && t.trim() !== '');
    if (validTexts.length === 0) {
      return NextResponse.json(
        { error: '翻译文本不能为空' },
        { status: 400 }
      );
    }

    // 多个query用 \n 连接
    const query = validTexts.join('\n');

    // 生成签名
    const salt = Date.now().toString();
    const str1 = BAIDU_APP_ID + query + salt + BAIDU_SECRET_KEY;
    const sign = generateMD5(str1);

    console.log('[API Translate Batch] Request:', {
      count: validTexts.length,
      texts: validTexts.map(t => t.substring(0, 30) + (t.length > 30 ? '...' : '')),
      from,
      to,
    });

    // 调用百度翻译 API
    const response = await fetch(BAIDU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        q: query,
        appid: BAIDU_APP_ID,
        salt: salt,
        from: from,
        to: to,
        sign: sign,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BaiduTranslateResponse = await response.json();

    console.log('[API Translate Batch] Response:', {
      from: data.from,
      to: data.to,
      resultCount: data.trans_result?.length || 0,
      error_code: data.error_code,
    });

    // 检查错误
    if (data.error_code) {
      const errorMsg = getBaiduErrorMessage(data.error_code, data.error_msg);
      return NextResponse.json(
        { error: `百度翻译 API 错误 [${data.error_code}]: ${errorMsg}` },
        { status: 400 }
      );
    }

    // 将翻译结果映射回原始文本
    const translations: string[] = [];
    if (data.trans_result && data.trans_result.length > 0) {
      // 百度API会返回与输入顺序对应的结果
      for (let i = 0; i < validTexts.length; i++) {
        const result = data.trans_result[i];
        translations.push(result ? result.dst : '');
      }
    }

    return NextResponse.json({
      translations,
      from: data.from,
      to: data.to,
    });
  } catch (error: any) {
    console.error('[API Translate Batch] Error:', error);
    return NextResponse.json(
      { error: error.message || '翻译失败' },
      { status: 500 }
    );
  }
}
