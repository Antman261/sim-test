export type Obj = Record<string, unknown>;
export type TextResponse = { text: string; status: number };
export type JsonResponse<T extends Obj = Obj> = { json?: T; status: number };
