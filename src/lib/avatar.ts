// Короткая «версия» аватарки — подставляется в URL картинки (?v=...), чтобы
// браузер кэшировал фото, но сразу подхватывал новое после смены.
export function avatarVersion(dataUrl: string) {
  let h = 0;
  for (let i = 0; i < dataUrl.length; i++) h = (h * 31 + dataUrl.charCodeAt(i)) | 0;
  return `${dataUrl.length.toString(36)}${(h >>> 0).toString(36)}`;
}
