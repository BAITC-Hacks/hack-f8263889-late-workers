import type { IncomingMessage, ServerResponse } from "node:http";

export type Fields = Record<string, string>;

export function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function noContent(res: ServerResponse) {
  res.statusCode = 204;
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

export function error(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  fields?: Fields
) {
  json(res, status, {
    error: { code, message, ...(fields ? { fields } : {}) },
  });
}

export function methodNotAllowed(res: ServerResponse, allow: string) {
  res.setHeader("Allow", allow);
  error(res, 405, "METHOD_NOT_ALLOWED", "Метод не поддерживается");
}

export function sessionToken(req: IncomingMessage): string | undefined {
  return req.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("access_token="))
    ?.slice("access_token=".length);
}
