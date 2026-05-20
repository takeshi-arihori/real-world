import { ApiError, type ApiErrorKind } from './apiError';

/**
 * 成功レスポンスをtyped JSONへ変換し、bodyなしレスポンスはnullとして扱う。
 */
export async function parseSuccessResponse<TResponse>(
  response: Response,
): Promise<TResponse> {
  if (response.status === 204 || !hasJsonContent(response)) {
    // 204/no-body endpointは呼び出し側がTResponseにnullを指定する前提で扱う。
    return null as TResponse;
  }

  const payload = await parseJson(response);

  // endpoint固有のresponse shapeはfeature API側のTResponse指定で境界を作る。
  return payload as TResponse;
}

/**
 * HTTP errorレスポンスをfeature層が扱えるtyped ApiErrorへ変換する。
 */
export async function createHttpError(response: Response): Promise<ApiError> {
  const bodyErrors = hasJsonContent(response)
    ? extractBodyErrors(await parseJson(response))
    : [];
  const kind = getErrorKind(response.status);
  const message =
    bodyErrors.at(0) ?? `API request failed with status ${response.status}`;

  return new ApiError(message, {
    bodyErrors,
    kind,
    status: response.status,
  });
}

/**
 * JSON parse failureをunexpected ApiErrorとして扱い、raw Responseの解釈をlib内へ閉じ込める。
 */
async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause: unknown) {
    throw new ApiError('Unexpected API response', {
      bodyErrors: [],
      cause,
      kind: 'unexpected',
    });
  }
}

/**
 * レスポンスbodyをJSONとして読むべきかContent-Typeから判定する。
 */
function hasJsonContent(response: Response): boolean {
  return response.headers.get('Content-Type')?.includes('application/json') ?? false;
}

/**
 * HTTP status codeを画面・Provider側で分岐しやすいApiError kindへ対応付ける。
 */
function getErrorKind(status: number): ApiErrorKind {
  if (status === 401) {
    return 'unauthorized';
  }

  if (status === 403) {
    return 'forbidden';
  }

  if (status === 404) {
    return 'not_found';
  }

  if (status === 422) {
    return 'validation';
  }

  return 'unexpected';
}

/**
 * RealWorld形式のerrors.bodyだけをform/global errorへ渡せる文字列配列として取り出す。
 */
function extractBodyErrors(payload: unknown): string[] {
  if (!isRecord(payload) || !isRecord(payload.errors)) {
    return [];
  }

  const { body } = payload.errors;

  if (!Array.isArray(body)) {
    return [];
  }

  return body.filter((entry): entry is string => typeof entry === 'string');
}

/**
 * unknown payloadをproperty access可能なrecordへ絞り込む。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
