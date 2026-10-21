import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local before running this script.",
  );
  process.exit(1);
}

const redirectUri = "http://localhost:53682/oauth2callback";
const scope =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
const state = randomBytes(24).toString("hex");

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope,
  access_type: "offline",
  prompt: "consent",
  include_granted_scopes: "true",
  state,
}).toString();

function openBrowser(url) {
  const command =
    process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}

async function saveRefreshToken(refreshToken) {
  const envPath = new URL("../.env.local", import.meta.url);
  let content = "";
  try {
    content = await readFile(envPath, "utf8");
  } catch {
    content = "";
  }

  const line = `GOOGLE_REFRESH_TOKEN=${refreshToken}`;
  if (/^GOOGLE_REFRESH_TOKEN=.*$/m.test(content)) {
    content = content.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line);
  } else {
    if (content && !content.endsWith("\n")) content += "\n";
    content += `${line}\n`;
  }

  await writeFile(envPath, content, { mode: 0o600 });
}

async function exchangeCode(code) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) throw new Error(`token_exchange_http_${response.status}`);
  const payload = await response.json();
  if (!payload.refresh_token) throw new Error("no_refresh_token");
  return payload.refresh_token;
}

function respond(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><title>Clarteon booking setup</title><p>${message}</p>`);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", redirectUri);
  if (url.pathname !== "/oauth2callback") {
    respond(response, 404, "Not found.");
    return;
  }

  if (url.searchParams.get("state") !== state) {
    respond(
      response,
      400,
      "The authorization state did not match. Close this tab and run the script again.",
    );
    return;
  }

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    respond(response, 400, "Google did not grant access. Close this tab and try again.");
    server.close();
    process.exitCode = 1;
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    respond(response, 400, "No authorization code was returned. Close this tab and try again.");
    return;
  }

  try {
    const refreshToken = await exchangeCode(code);
    await saveRefreshToken(refreshToken);
    respond(
      response,
      200,
      "Authorization complete. The refresh token is saved in .env.local. You can close this window.",
    );
    server.close();
    setTimeout(() => process.exit(0), 250);
  } catch (error) {
    const codeValue = error instanceof Error ? error.message : "unknown";
    respond(response, 500, "The token exchange failed. Check the terminal and try again.");
    console.error(`Token exchange failed: ${codeValue}`);
    server.close();
    process.exitCode = 1;
  }
});

server.on("error", (error) => {
  console.error(`Could not start the local OAuth server: ${error.name}`);
  process.exit(1);
});

server.listen(53682, "127.0.0.1", () => {
  console.log("Google Calendar setup");
  console.log("Before you continue:");
  console.log("- Enable the Google Calendar API for the Cloud project.");
  console.log("- Create an OAuth client of type Desktop app. If you use a Web application");
  console.log("  client instead, add this authorized redirect URI:");
  console.log(`  ${redirectUri}`);
  console.log("- If the OAuth consent screen is in Testing, Google expires refresh tokens");
  console.log("  after 7 days. Set it to In production for a lasting token.");
  console.log("- Sign in with the team Google account and grant calendar access.");
  console.log("- Give that account permission to change events on the shared calendar.");
  console.log("");
  console.log("The refresh token will be written to .env.local; it is never printed.");
  console.log("");
  console.log("If the browser does not open, visit:");
  console.log(authUrl.toString());
  console.log("");
  console.log("Waiting for the Google callback...");
  openBrowser(authUrl.toString());
});

setTimeout(
  () => {
    console.error("Timed out waiting for the Google callback. Run the script again.");
    server.close();
    process.exit(1);
  },
  5 * 60 * 1_000,
).unref();
