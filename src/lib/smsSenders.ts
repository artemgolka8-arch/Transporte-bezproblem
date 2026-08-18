// Разрешённые значения поля "Nadawca" (отправитель) в SMSPlanet.
// "TEST" доступен всегда, "BezProblem" — подтверждённое имя отправителя аккаунта.
export const SMS_SENDERS = ["TEST", "BezProblem"] as const;
export type SmsSender = (typeof SMS_SENDERS)[number];
