const valid = id => typeof id === 'string' && /^G-[A-Z0-9]+$/.test(id);

// The ID is public configuration; reject everything else before HTML interpolation.
export function analyticsHead(id) {
 return valid(id) ? `<meta name="ga-measurement-id" content="${id}"><script type="module" src="/analytics.js"></script>` : '';
}

export function analyticsPolicy(policy, id) {
 if (!valid(id) || policy.includes("'strict-dynamic'")) return policy;
 const additions = {
  'script-src': ['https://www.googletagmanager.com'],
  'connect-src': ['https://www.google-analytics.com', 'https://region1.google-analytics.com', 'https://analytics.google.com', 'https://www.googletagmanager.com'],
  'img-src': ['https://www.google-analytics.com', 'https://region1.google-analytics.com'],
 };
 return policy.split(';').map(part => {
  const words = part.trim().split(/\s+/);
  const extra = additions[words[0]];
  return extra ? words.concat(extra.filter(value => !words.includes(value))).join(' ') : part.trim();
 }).join('; ');
}
