export const nowIso = () => new Date().toISOString();
export const toJson = (value: unknown): string => JSON.stringify(value);
export const fromJson = <T>(value: string): T => JSON.parse(value) as T;
