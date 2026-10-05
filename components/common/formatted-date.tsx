"use client";

import * as React from "react";
import {
  formatDateOrNA,
  formatUtcDateOrNA,
} from "@/app/lib/utils/date-utils";

const subscribe = () => () => {};

interface FormattedDateProps extends React.ComponentPropsWithoutRef<"span"> {
  date: string | Date | undefined | null;
  long?: boolean;
}


export const FormattedDate = React.forwardRef<
  HTMLSpanElement,
  FormattedDateProps
>(({ date, long = false, ...props }, ref) => {
  const pattern = long ? "MMMM d, yyyy" : "MMM d, yyyy";
  const text = React.useSyncExternalStore(
    subscribe,
    () => formatDateOrNA(date, pattern),
    () => formatUtcDateOrNA(date, pattern),
  );

  return (
    <span ref={ref} {...props}>{text}</span>
  );
});
FormattedDate.displayName = "FormattedDate";
