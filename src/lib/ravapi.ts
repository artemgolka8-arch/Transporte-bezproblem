// Клиент для внешней системы ravapi.eu (portal.ravapi.eu).
// Логинится под учётной записью из переменных окружения, получает cookie-сессию
// и забирает список должников через их внутренний (недокументированный) API.
//
// Используется только по явному действию пользователя (кнопка "Обновить" в
// разделе "Должники") — постоянного фонового опроса нет.

const BASE_URL = "https://portal.ravapi.eu";

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

  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new RavapiError(`Не удалось войти в ravapi.eu (статус ${res.status})`);
  }

  const jar = cookieJarFrom(extractSetCookies(res));
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
    "Content-Type": "application/json",
    Accept: "application/json",
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
