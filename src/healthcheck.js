// Simple executable health check for hosting platforms that override Docker HEALTHCHECK.
try {
  const response = await fetch('http://127.0.0.1:3000/healthz', {signal: AbortSignal.timeout(4000)});
  process.exit(response.ok && (await response.json()).ok === true ? 0 : 1);
} catch { process.exit(1); }
