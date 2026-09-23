import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

import type {
  LoginInput,
  RegisterBusinessInput,
  RegisterStudentInput,
  User,
} from "../src/modules/auth/types.ts";
import {
  normalizeBusinessInput,
  normalizeStudentInput,
  validateBusiness,
  validateLogin,
  validateStudent,
  validationMessages,
} from "../src/modules/auth/validation.ts";

const SESSION_SECONDS = 604800;
const MAX_BODY_BYTES = 64 * 1024;
const COOKIE_ATTRIBUTES = "HttpOnly; SameSite=Lax; Path=/";

type Account = { user: User; password: string };
type Session = { email: string; expiresAt: number };
type Fields = Record<string, string>;

const seededAccounts = (): Account[] => [
  {
    password: "coffee2026",
    user: {
      id: 1,
      email: "owner@zerno.kz",
      role: "business",
      createdAt: "2026-09-23T09:00:00Z",
      business: {
        id: 1,
        companyName: "Кофейня «Зерно»",
        contactName: "Айгерим Нурланова",
        contactPhone: "+77011234567",
      },
      student: null,
    },
  },
  {
    password: "arman2026",
    user: {
      id: 2,
      email: "arman@student.kz",
      role: "student",
      createdAt: "2026-09-23T09:05:00Z",
      business: null,
      student: {
        id: 1,
        name: "Арман Сейтказы",
        skills: ["Анализ данных", "Дизайн интерфейсов"],
        technologies: ["Python", "React"],
      },
    },
  },
];

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function error(
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

function validationError(res: ServerResponse, fields: Fields) {
  error(res, 422, "VALIDATION_ERROR", "Проверьте поля формы", fields);
}

async function readBody(
  req: IncomingMessage
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(buffer);
  }
  const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return {};
  return body as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  return Array.isArray(value) && value.every((tag) => typeof tag === "string")
    ? value
    : null;
}

function russianFields(
  errors: Record<string, keyof typeof validationMessages | undefined>
): Fields {
  return Object.fromEntries(
    Object.entries(errors)
      .filter(
        (entry): entry is [string, keyof typeof validationMessages] =>
          !!entry[1]
      )
      .map(([field, key]) => [field, validationMessages[key]])
  );
}

function sessionToken(req: IncomingMessage): string | undefined {
  return req.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("access_token="))
    ?.slice("access_token=".length);
}

const emailKey = (email: string) => email.trim().toLowerCase();

export function authMock(): Plugin {
  return {
    name: "auth-mock",
    apply: "serve",
    configureServer(server) {
      const accounts = new Map(
        seededAccounts().map((account) => [
          emailKey(account.user.email),
          account,
        ])
      );
      const sessions = new Map<string, Session>();
      let nextUserId = 3;
      let nextBusinessId = 2;
      let nextStudentId = 2;

      function removeSession(req: IncomingMessage) {
        const token = sessionToken(req);
        if (token) sessions.delete(token);
      }

      function startSession(
        req: IncomingMessage,
        res: ServerResponse,
        user: User
      ) {
        removeSession(req);
        const token = randomUUID();
        sessions.set(token, {
          email: emailKey(user.email),
          expiresAt: Date.now() + SESSION_SECONDS * 1000,
        });
        res.setHeader(
          "Set-Cookie",
          `access_token=${token}; ${COOKIE_ATTRIBUTES}; Max-Age=${SESSION_SECONDS}`
        );
      }

      async function handle(
        req: IncomingMessage,
        res: ServerResponse,
        path: string
      ) {
        for (const [token, session] of sessions) {
          if (session.expiresAt <= Date.now()) sessions.delete(token);
        }

        const method = path === "/api/auth/me" ? "GET" : "POST";
        if (req.method !== method) {
          res.setHeader("Allow", method);
          error(res, 405, "METHOD_NOT_ALLOWED", "Метод не поддерживается");
          return;
        }

        if (path === "/api/auth/logout") {
          removeSession(req);
          res.setHeader(
            "Set-Cookie",
            `access_token=; ${COOKIE_ATTRIBUTES}; Max-Age=0`
          );
          res.setHeader("Cache-Control", "no-store");
          res.statusCode = 204;
          res.end();
          return;
        }

        if (path === "/api/auth/me") {
          const session = sessions.get(sessionToken(req) ?? "");
          const account = session && accounts.get(session.email);
          if (!account) {
            error(res, 401, "UNAUTHORIZED", "Требуется вход");
            return;
          }
          json(res, 200, { user: account.user });
          return;
        }

        let body: Record<string, unknown>;
        try {
          body = await readBody(req);
        } catch {
          validationError(res, {});
          return;
        }

        const credentials: LoginInput = {
          email: stringValue(body.email),
          password: stringValue(body.password),
        };
        if (path === "/api/auth/login") {
          const fields = russianFields(validateLogin(credentials));
          if (Object.keys(fields).length) {
            validationError(res, fields);
            return;
          }
          const account = accounts.get(emailKey(credentials.email));
          if (!account || account.password !== credentials.password) {
            error(res, 401, "INVALID_CREDENTIALS", "Неверный email или пароль");
            return;
          }
          startSession(req, res, account.user);
          json(res, 200, { user: account.user });
          return;
        }

        let user: User;
        if (path === "/api/auth/register/business") {
          const input: RegisterBusinessInput = normalizeBusinessInput({
            ...credentials,
            companyName: stringValue(body.companyName),
            contactName: stringValue(body.contactName),
            contactPhone: stringValue(body.contactPhone),
          });
          const fields = russianFields(validateBusiness(input));
          if (Object.keys(fields).length) {
            validationError(res, fields);
            return;
          }
          user = {
            id: nextUserId,
            email: input.email,
            role: "business",
            createdAt: new Date().toISOString(),
            business: {
              id: nextBusinessId,
              companyName: input.companyName,
              contactName: input.contactName,
              contactPhone: input.contactPhone,
            },
            student: null,
          };
        } else {
          const skills = stringArray(body.skills);
          const technologies = stringArray(body.technologies);
          const input: RegisterStudentInput = {
            ...credentials,
            name: stringValue(body.name),
            skills: skills ?? [],
            technologies: technologies ?? [],
          };
          const fields = russianFields(validateStudent(input));
          if (skills === null)
            fields.skills = "До 20 тегов, каждый до 50 символов";
          if (technologies === null)
            fields.technologies = "До 20 тегов, каждый до 50 символов";
          if (Object.keys(fields).length) {
            validationError(res, fields);
            return;
          }
          const normalized = normalizeStudentInput(input);
          user = {
            id: nextUserId,
            email: normalized.email,
            role: "student",
            createdAt: new Date().toISOString(),
            business: null,
            student: {
              id: nextStudentId,
              name: normalized.name,
              skills: normalized.skills,
              technologies: normalized.technologies,
            },
          };
        }

        const key = emailKey(user.email);
        if (accounts.has(key)) {
          error(
            res,
            409,
            "EMAIL_TAKEN",
            "Пользователь с таким email уже зарегистрирован"
          );
          return;
        }
        accounts.set(key, { user, password: credentials.password });
        nextUserId += 1;
        if (user.role === "business") nextBusinessId += 1;
        else nextStudentId += 1;
        startSession(req, res, user);
        json(res, 201, { user });
      }

      const paths = new Set([
        "/api/auth/register/business",
        "/api/auth/register/student",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/me",
      ]);
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        if (!paths.has(path)) {
          next();
          return;
        }
        void handle(req, res, path).catch(() => {
          if (!res.headersSent)
            error(res, 500, "INTERNAL_ERROR", "Не удалось выполнить запрос");
          else res.end();
        });
      });
    },
  };
}
