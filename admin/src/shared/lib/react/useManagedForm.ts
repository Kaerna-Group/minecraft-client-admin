import { useCallback, useMemo, useState } from 'react';

type ValidationResult<T> = Partial<Record<keyof T, string>>;

function shallowEqual<T extends Record<string, unknown>>(left: T, right: T) {
  const leftKeys = Object.keys(left) as Array<keyof T>;
  const rightKeys = Object.keys(right) as Array<keyof T>;

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

export function useManagedForm<T extends Record<string, unknown>>(initialValue: T, validate: (value: T) => ValidationResult<T>) {
  const [initialState, setInitialState] = useState(initialValue);
  const [value, setValue] = useState(initialValue);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(() => validate(value), [validate, value]);
  const isDirty = useMemo(() => !shallowEqual(initialState, value), [initialState, value]);
  const isValid = useMemo(() => Object.values(errors).every((entry) => !entry), [errors]);

  const setField = useCallback(<K extends keyof T>(key: K, nextValue: T[K]) => {
    setValue((current) => ({ ...current, [key]: nextValue }));
  }, []);

  const replace = useCallback((nextValue: T) => {
    setInitialState(nextValue);
    setValue(nextValue);
    setSubmitAttempted(false);
  }, []);

  const reset = useCallback(() => {
    setValue(initialState);
    setSubmitAttempted(false);
  }, [initialState]);

  const markSaved = useCallback((nextValue?: T) => {
    const resolved = nextValue ?? value;
    setInitialState(resolved);
    setValue(resolved);
    setSubmitAttempted(false);
  }, [value]);

  const shouldShowError = useCallback(
    <K extends keyof T>(key: K) => submitAttempted || Boolean(value[key]),
    [submitAttempted, value],
  );

  return {
    value,
    setValue,
    setField,
    replace,
    reset,
    markSaved,
    errors,
    isDirty,
    isValid,
    submitAttempted,
    setSubmitAttempted,
    shouldShowError,
  };
}
