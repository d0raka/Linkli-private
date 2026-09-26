/**
 * Target for every client-side form's native `action`. If a form is submitted before React
 * hydrates (or with JavaScript disabled) the browser POSTs here instead of leaking the fields
 * into a GET query string. The body is intentionally never read or logged.
 */

const PAGE = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>הטופס לא נשלח | Linkli</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Heebo, Rubik, Arial, sans-serif; background: #f6f5f4; color: #17151c; }
  main { max-width: 460px; padding: 32px 24px; text-align: center; }
  h1 { font-size: 24px; margin: 0 0 12px; }
  p { line-height: 1.7; color: #57535f; margin: 0 0 20px; }
  a { display: inline-block; padding: 12px 22px; border-radius: 12px; background: #8a2f4a; color: #fff; text-decoration: none; font-weight: 700; }
</style>
</head>
<body>
<main>
  <h1>הטופס לא נשלח</h1>
  <p>Linkli זקוקה ל-JavaScript כדי לשלוח טפסים בצורה מאובטחת. הפרטים שהזנתם לא נשמרו ולא הועברו. אפשר לחזור אחורה, לוודא ש-JavaScript מופעל, ולנסות שוב.</p>
  <a href="javascript:history.back()" onclick="history.back(); return false;">חזרה לטופס</a>
</main>
</body>
</html>`;

const headers = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "private, no-store, max-age=0",
  "x-robots-tag": "noindex",
};

export async function POST(_request: Request) {
  return new Response(PAGE, { status: 400, headers });
}

export async function GET() {
  return new Response(null, { status: 405, headers: { ...headers, allow: "POST" } });
}
