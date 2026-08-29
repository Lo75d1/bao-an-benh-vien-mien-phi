export function isDirectFormSubmit(target: EventTarget | null, currentTarget: EventTarget): boolean {
  return target === currentTarget;
}
