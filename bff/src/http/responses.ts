export function jsonResponse(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

export function csrfMismatchResponse(): Response {
  return jsonResponse(419, { errors: { body: ['CSRF token mismatch'] } });
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text === '') {
    // Public API の 204 など body が空の response でも JSON flow を壊さない。
    return {};
  }

  return JSON.parse(text) as unknown;
}
