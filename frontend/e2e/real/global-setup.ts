import { API_TARGET, DEMO_PASSWORD, demoAccounts } from "./helpers";

const HINT = `Start FastAPI with the demo seed and point API_PROXY_TARGET at it (now ${API_TARGET}); see frontend/README.md.`;

/** Fail fast with a readable reason instead of letting every test time out. */
export default async function globalSetup() {
  let health: Response;
  try {
    health = await fetch(`${API_TARGET}/health`);
  } catch (error) {
    throw new Error(`The API is not reachable: ${String(error)}. ${HINT}`);
  }
  if (!health.ok)
    throw new Error(`The API health check answered ${health.status}. ${HINT}`);

  for (const { email } of Object.values(demoAccounts)) {
    const login = await fetch(`${API_TARGET}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: DEMO_PASSWORD }),
    });
    if (!login.ok)
      throw new Error(
        `The demo account ${email} cannot sign in (${login.status}), so the demo seed is missing. ${HINT}`
      );
  }
}
