const valid = id => typeof id === 'string' && /^G-[A-Z0-9]+$/.test(id);

// The ID is public configuration; reject everything else before HTML interpolation.
export function analyticsHead(id) {
 return '<script defer src="/portfolio-umami.js"></script>' + (valid(id) ? `<meta name="ga-measurement-id" content="${id}"><script type="module" src="/analytics.js"></script>` : '');
}

export function analyticsPolicy(policy, id) {
 if (policy.includes("'strict-dynamic'")) return policy;
 const additions = {
  'script-src': [...(valid(id) ? ['https://www.googletagmanager.com'] : []), 'https://umami.danielk.am'],
  'connect-src': [...(valid(id) ? ['https://www.google-analytics.com', 'https://region1.google-analytics.com', 'https://analytics.google.com', 'https://www.googletagmanager.com'] : []), 'https://umami.danielk.am'],
  'img-src': valid(id) ? ['https://www.google-analytics.com', 'https://region1.google-analytics.com'] : [],
 };
 return policy.split(';').map(part => {
  const words = part.trim().split(/\s+/);
  const extra = additions[words[0]];
  return extra ? words.concat(extra.filter(value => !words.includes(value))).join(' ') : part.trim();
 }).join('; ');
}
