export function renderErrorPage(status) {
  const { title, message, action } = status === 404 ? {
    title: 'Page not found',
    message: 'This address may be outdated or mistyped. Return to the overview to find your ledger.',
    action: 'Back to overview',
  } : {
    title: 'This page couldn’t load',
    message: 'ClearLedger ran into a problem loading this page. Try opening the overview again in a moment.',
    action: 'Try again',
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#233326">
  <title>${title} — ClearLedger</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23233326'/%3E%3Cpath d='M8 25C3 10 17 6 26 5c0 13-5 21-18 20' fill='%23bfe47b'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="error-page">
  <header class="error-header">
    <div class="brand"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M8 30C-1 13 15 7 32 4c0 17-6 29-24 26Z" fill="currentColor"/><path d="M9 29c4-9 9-14 16-18" fill="none" stroke="#233326" stroke-width="2"/></svg>ClearLedger</div>
  </header>
  <main class="error-main">
    <section class="panel error-panel" aria-labelledby="error-title">
      <p class="badge error-code">Error ${status}</p>
      <h1 id="error-title">${title}</h1>
      <p class="panel-intro">${message}</p>
      <a class="primary error-action" href="/">${action}</a>
    </section>
  </main>
</body>
</html>`;
}
