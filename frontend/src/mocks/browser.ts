import { setupWorker } from "msw/browser";

import { handlers } from "./users.handlers";

export const worker = setupWorker(...handlers);
