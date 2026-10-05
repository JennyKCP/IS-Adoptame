









export type FieldErrors<TValues> = Partial<Record<keyof TValues, string[]>>;

export type ActionSuccess<TData> = {
  ok: true;
  message: string;
  
  data?: TData;
  
  redirectTo?: string;
};

export type ActionFailure<TValues> = {
  ok: false;
  
  message: string;
  
  fieldErrors?: FieldErrors<TValues>;
};

export type FormResult<TValues, TData = undefined> =
  | ActionSuccess<TData>
  | ActionFailure<TValues>;