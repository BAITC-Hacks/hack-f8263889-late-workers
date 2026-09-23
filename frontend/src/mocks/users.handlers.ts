import type {
  Gender,
  SortOrder,
  User,
  UserCreate,
  UserStatus,
  UsersSort,
} from "@/modules/users";
import { HttpResponse, http } from "msw";

import { usersData } from "./users.data";

// Requests go out with an absolute URL (the backend origin), so a relative
// path would never match — `*/api/users` matches whatever the origin is.
const USERS_PATH = "*/api/users";

const GENDERS: Gender[] = ["male", "female", "unknown"];
const STATUSES: UserStatus[] = ["active", "blocked"];
const SORTS: UsersSort[] = ["lastName", "email", "createdAt"];
const ORDERS: SortOrder[] = ["asc", "desc"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{10,15}$/;

let users: User[] = usersData.map((user) => ({ ...user }));
let nextId = users.length + 1;

const errorResponse = (
  status: number,
  code: string,
  fields?: Record<string, string>
) =>
  HttpResponse.json(
    { error: fields ? { code, fields } : { code } },
    { status }
  );

const validationError = (fields: Record<string, string>) =>
  errorResponse(400, "VALIDATION_ERROR", fields);

const findUser = (rawId: string) =>
  users.find((user) => user.id === Number(rawId));

/** Validates the writable fields; `partial` skips the "missing = REQUIRED" rule (PATCH). */
const validateInput = (
  input: Partial<UserCreate>,
  partial: boolean
): Record<string, string> => {
  const fields: Record<string, string> = {};

  const text = (key: "firstName" | "lastName") => {
    const value = input[key];
    if (value === undefined) {
      if (!partial) fields[key] = "REQUIRED";
      return;
    }
    if (typeof value !== "string" || value.trim() === "") {
      fields[key] = "REQUIRED";
    }
  };

  text("firstName");
  text("lastName");

  if (input.email === undefined) {
    if (!partial) fields.email = "REQUIRED";
  } else if (typeof input.email !== "string" || input.email.trim() === "") {
    fields.email = "REQUIRED";
  } else if (!EMAIL_RE.test(input.email)) {
    fields.email = "INVALID_FORMAT";
  }

  if (input.phone === undefined) {
    if (!partial) fields.phone = "REQUIRED";
  } else if (typeof input.phone !== "string" || input.phone.trim() === "") {
    fields.phone = "REQUIRED";
  } else if (!PHONE_RE.test(input.phone)) {
    fields.phone = "INVALID_FORMAT";
  }

  if (input.gender === undefined) {
    if (!partial) fields.gender = "REQUIRED";
  } else if (!GENDERS.includes(input.gender)) {
    fields.gender = "INVALID_FORMAT";
  }

  return fields;
};

const isEmailTaken = (email: string, exceptId?: number) =>
  users.some(
    (user) =>
      user.id !== exceptId && user.email.toLowerCase() === email.toLowerCase()
  );

const matchesQuery = (user: User, q: string) => {
  const needle = q.toLowerCase();
  return (
    user.firstName.toLowerCase().includes(needle) ||
    user.lastName.toLowerCase().includes(needle) ||
    user.email.toLowerCase().includes(needle)
  );
};

const compareUsers = (a: User, b: User, sort: UsersSort) => {
  if (sort === "createdAt") {
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  }
  return a[sort].localeCompare(b[sort], "ru");
};

export const handlers = [
  http.get(USERS_PATH, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const fields: Record<string, string> = {};

    const rawPage = params.get("page");
    const rawLimit = params.get("limit");
    const rawStatus = params.get("status");
    const rawSort = params.get("sort");
    const rawOrder = params.get("order");

    const page = rawPage === null ? 1 : Number(rawPage);
    const limit = rawLimit === null ? 20 : Number(rawLimit);

    if (!Number.isInteger(page) || page < 1) fields.page = "INVALID_FORMAT";
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      fields.limit = "INVALID_FORMAT";
    }
    if (rawStatus !== null && !STATUSES.includes(rawStatus as UserStatus)) {
      fields.status = "INVALID_FORMAT";
    }
    if (rawSort !== null && !SORTS.includes(rawSort as UsersSort)) {
      fields.sort = "INVALID_FORMAT";
    }
    if (rawOrder !== null && !ORDERS.includes(rawOrder as SortOrder)) {
      fields.order = "INVALID_FORMAT";
    }
    if (Object.keys(fields).length > 0) return validationError(fields);

    const q = params.get("q")?.trim() ?? "";
    let items = users.filter(
      (user) =>
        (q === "" || matchesQuery(user, q)) &&
        (rawStatus === null || user.status === rawStatus)
    );

    if (rawSort !== null) {
      const direction = rawOrder === "desc" ? -1 : 1;
      items = [...items].sort(
        (a, b) => compareUsers(a, b, rawSort as UsersSort) * direction
      );
    }

    const start = (page - 1) * limit;
    return HttpResponse.json({
      items: items.slice(start, start + limit),
      total: items.length,
      page,
      limit,
    });
  }),

  http.post(USERS_PATH, async ({ request }) => {
    const input = (await request.json()) as Partial<UserCreate>;
    const fields = validateInput(input, false);
    if (Object.keys(fields).length > 0) return validationError(fields);
    if (isEmailTaken(input.email as string)) {
      return errorResponse(409, "EMAIL_TAKEN");
    }

    const user: User = {
      id: nextId++,
      firstName: (input.firstName as string).trim(),
      lastName: (input.lastName as string).trim(),
      email: (input.email as string).trim(),
      phone: (input.phone as string).trim(),
      gender: input.gender as Gender,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    users = [user, ...users];
    return HttpResponse.json(user, { status: 201 });
  }),

  http.patch(`${USERS_PATH}/:id`, async ({ params, request }) => {
    const user = findUser(String(params.id));
    if (!user) return errorResponse(404, "USER_NOT_FOUND");

    const patch = (await request.json()) as Partial<UserCreate>;
    const fields = validateInput(patch, true);
    if (Object.keys(fields).length > 0) return validationError(fields);
    if (patch.email !== undefined && isEmailTaken(patch.email, user.id)) {
      return errorResponse(409, "EMAIL_TAKEN");
    }

    Object.assign(user, patch);
    return HttpResponse.json(user);
  }),

  http.delete(`${USERS_PATH}/:id`, ({ params }) => {
    const user = findUser(String(params.id));
    if (!user) return errorResponse(404, "USER_NOT_FOUND");
    users = users.filter((item) => item.id !== user.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${USERS_PATH}/:id/block`, ({ params }) => {
    const user = findUser(String(params.id));
    if (!user) return errorResponse(404, "USER_NOT_FOUND");
    if (user.status === "blocked") return errorResponse(409, "ALREADY_BLOCKED");
    user.status = "blocked";
    return HttpResponse.json(user);
  }),

  http.post(`${USERS_PATH}/:id/unblock`, ({ params }) => {
    const user = findUser(String(params.id));
    if (!user) return errorResponse(404, "USER_NOT_FOUND");
    if (user.status === "active") return errorResponse(409, "NOT_BLOCKED");
    user.status = "active";
    return HttpResponse.json(user);
  }),
];
