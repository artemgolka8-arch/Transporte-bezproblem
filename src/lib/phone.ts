// Номера телефонов в разных таблицах (Vehicle.renterPhone, Client.phone,
// Debtor.phoneNumber из ravapi.eu) могут храниться в разных форматах:
// "+48 601 234 567", "601234567", "48601234567" и т.д. Сравниваем по
// последним 9 цифрам (длина польского мобильного номера без кода страны).

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-9);
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return na.length >= 7 && na === nb;
}
