// Клиент для внешней системы ravapi.eu (portal.ravapi.eu).
// Логинится под учётной записью из переменных окружения, получает cookie-сессию
// и забирает список должников через их внутренний (недокументированный) API.
//
// Используется только по явному действию пользователя (кнопка "Обновить" в
// разделе "Должники") — постоянного фонового опроса нет.

const BASE_URL = "https://portal.ravapi.eu";

// Заголовки, имитирующие обычный браузерный запрос — некоторые бэкенды (в т.ч.
// защищённые через WAF/reverse-proxy) отклоняют запросы без Origin/Referer/UA
// статусом 403, даже если логин и пароль верны.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Origin: BASE_URL,
  Referer: `${BASE_URL}/login`,
  Accept: "application/json, text/plain, */*",
};

export type RavapiDebtor = {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  vehicleName: string | null;
  organisation: string | null;
  currentBalance: number;
  balanceWithDeposits: number | null;
  dateOfFirstUnpaidPayoff: string | null;
  dateOfLastUnpaidPayoff: string | null;
  debtNotes: string | null;
  isContactedForDebt: boolean;
};

class RavapiError extends Error {}

function extractSetCookies(res: Response): string[] {
  // Node 18+/undici поддерживает getSetCookie(); на всякий случай подстрахуемся.
  const headersAny = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersAny.getSetCookie === "function") {
    return headersAny.getSetCookie();
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

function cookieJarFrom(setCookies: string[]): Record<string, string> {
  const jar: Record<string, string> = {};
  for (const raw of setCookies) {
    const pair = raw.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar[name] = value;
  }
  return jar;
}

function cookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function login(): Promise<Record<string, string>> {
  const email = process.env.RAVAPI_EMAIL;
  const password = process.env.RAVAPI_PASSWORD;
  if (!email || !password) {
    throw new RavapiError("Не заданы RAVAPI_EMAIL / RAVAPI_PASSWORD в переменных окружения");
  }

  // Многие такие бэкенды выдают начальный CSRF/сессионный cookie на обычный GET
  // страницы логина ещё до самого логина — без него POST /api/login тоже может
  // отвечать 403.
  let initialJar: Record<string, string> = {};
  try {
    const pre = await fetch(`${BASE_URL}/dashboard`, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html,application/xhtml+xml" },
    });
    initialJar = cookieJarFrom(extractSetCookies(pre));
  } catch {
    // Если предварительный запрос не удался — продолжаем без initial-cookie,
    // логин всё равно попробуется.
  }

  const loginHeaders: Record<string, string> = {
    ...BROWSER_HEADERS,
    "Content-Type": "application/json",
  };
  if (Object.keys(initialJar).length > 0) {
    loginHeaders.Cookie = cookieHeader(initialJar);
    if (initialJar["XSRF-TOKEN"]) {
      loginHeaders["X-XSRF-TOKEN"] = decodeURIComponent(initialJar["XSRF-TOKEN"]);
    }
  }

  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: loginHeaders,
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const snippet = bodyText ? ` — ${bodyText.slice(0, 200)}` : "";
    throw new RavapiError(`Не удалось войти в ravapi.eu (статус ${res.status})${snippet}`);
  }

  const jar = { ...initialJar, ...cookieJarFrom(extractSetCookies(res)) };
  if (Object.keys(jar).length === 0) {
    throw new RavapiError("ravapi.eu не вернул сессионные cookie при входе");
  }
  return jar;
}

async function fetchDebtorsPage(
  jar: Record<string, string>,
  skip: number,
  take: number
): Promise<{ items: RavapiDebtor[]; total: number | null }> {
  const headers: Record<string, string> = {
    ...BROWSER_HEADERS,
    "Content-Type": "application/json",
    Cookie: cookieHeader(jar),
  };
  if (jar["XSRF-TOKEN"]) {
    headers["X-XSRF-TOKEN"] = decodeURIComponent(jar["XSRF-TOKEN"]);
  }

  const res = await fetch(`${BASE_URL}/api/Drivers/GetDebtors`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      isRentingFleetVehicle: true,
      skip,
      take,
      sortItems: [],
      propertiesNames: [
        "Id",
        "FirstName",
        "LastName",
        "Organisation",
        "PhoneNumber",
        "VehicleName",
        "CurrentBalance",
        "BalanceWithDeposits",
        "DateOfFirstUnpaidPayoff",
        "DateOfLastUnpaidPayoff",
        "DebtNotes",
        "IsContactedForDebt",
      ],
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new RavapiError("ravapi.eu отклонил сессию (401/403) — возможно, истёк логин");
  }
  if (!res.ok) {
    throw new RavapiError(`Ошибка запроса списка должников (статус ${res.status})`);
  }

  const data = await res.json();
  const items = data?.result?.items ?? data?.items ?? [];
  const total = data?.result?.total ?? data?.total ?? null;
  return { items, total };
}

// Забирает всех должников постранично (take=100 за раз, максимум 20 страниц —
// то есть до 2000 записей, с запасом на рост).
export async function fetchAllDebtors(): Promise<RavapiDebtor[]> {
  const jar = await login();
  const take = 100;
  const maxPages = 20;
  const all: RavapiDebtor[] = [];

  for (let page = 0; page < maxPages; page++) {
    const { items, total } = await fetchDebtorsPage(jar, page * take, take);
    all.push(...items);
    if (items.length < take) break;
    if (total !== null && all.length >= total) break;
  }

  return all;
}

// ---------------------------------------------------------------------------
// Расшифровка задолженности конкретного клиента (списания/начисления).
//
// ⚠️ ВАЖНО: GetDebtors (выше) отдаёт только итоговый баланс клиента — без
// построчной детализации "за что и когда списано". Построчных данных для
// эндпойнта ниже пока нет: URL, тело запроса и структура ответа ("Не удалось
// проверить эндпойнт ravapi.eu — TODO...") — это ЗАГЛУШКА по образцу
// GetDebtors, которую нужно поправить под реальный запрос.
//
// Как найти реальный запрос: откройте portal.ravapi.eu → карточку клиента,
// где видна детализация списаний → DevTools → вкладка Network → найдите
// запрос, который уходит при открытии этой детализации → скопируйте:
//   1) URL и метод
//   2) тело запроса (скорее всего { driverId: <id>, ... })
//   3) пример ответа (JSON) — поля даты/суммы/причины списания
// и замените ими код ниже (URL, тело fetch и парсинг ответа).
// ---------------------------------------------------------------------------

export type RavapiDebtItem = {
  id: number;
  date: string | null;
  amount: number; // отрицательное число = списание (увеличивает долг)
  reason: string | null; // за что: аренда/штраф/ущерб/комиссия и т.п.
  category: string | null; // основание/тип операции, если ravapi его отдаёт отдельно
  vehicleName: string | null;
};

// TODO: заменить на реальный путь недокументированного API ravapi.eu, когда
// он будет найден через DevTools (см. комментарий выше). Текущее значение —
// предположение по аналогии с "/api/Drivers/GetDebtors".
const DEBT_DETAILS_ENDPOINT = "/api/Drivers/GetDebtorPayoffs";

export async function fetchDebtorDebtDetails(driverExternalId: number): Promise<RavapiDebtItem[]> {
  const jar = await login();

  const headers: Record<string, string> = {
    ...BROWSER_HEADERS,
    "Content-Type": "application/json",
    Cookie: cookieHeader(jar),
  };
  if (jar["XSRF-TOKEN"]) {
    headers["X-XSRF-TOKEN"] = decodeURIComponent(jar["XSRF-TOKEN"]);
  }

  const res = await fetch(`${BASE_URL}${DEBT_DETAILS_ENDPOINT}`, {
    method: "POST",
    headers,
    // TODO: тело запроса тоже нужно проверить и поправить под реальный API —
    // сейчас это предположение по аналогии с GetDebtors.
    body: JSON.stringify({
      driverId: driverExternalId,
      skip: 0,
      take: 200,
      sortItems: [],
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new RavapiError("ravapi.eu отклонил сессию (401/403) — возможно, истёк логин");
  }
  if (!res.ok) {
    throw new RavapiError(`Ошибка запроса расшифровки долга (статус ${res.status})`);
  }

  const data = await res.json();
  const items = data?.result?.items ?? data?.items ?? [];

  // TODO: поправить маппинг полей под реальные имена из ответа ravapi.eu.
  return items.map((raw: Record<string, unknown>): RavapiDebtItem => ({
    id: Number(raw.id ?? raw.Id ?? 0),
    date: (raw.date ?? raw.Date ?? raw.createdAt ?? null) as string | null,
    amount: Number(raw.amount ?? raw.Amount ?? 0),
    reason: (raw.reason ?? raw.Reason ?? raw.description ?? raw.Description ?? null) as string | null,
    category: (raw.category ?? raw.Category ?? raw.type ?? raw.Type ?? null) as string | null,
    vehicleName: (raw.vehicleName ?? raw.VehicleName ?? null) as string | null,
  }));
}
