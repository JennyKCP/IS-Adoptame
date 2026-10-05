"use client";

import * as React from "react";
import { formatTimeAgo, formatUtcDateOrNA } from "@/app/lib/utils/date-utils";

const subscribe = () => () => {};

interface TimeAgoProps extends React.ComponentPropsWithoutRef<"span"> {
  date: string | Date | undefined | null;
}


export const TimeAgo = React.forwardRef<HTMLSpanElement, TimeAgoProps>(
  ({ date, ...props }, ref) => {
    const text = React.useSyncExternalStore(
      subscribe,
      () => formatTimeAgo(date),
      () => formatUtcDateOrNA(date),
    );

    return (
      <span ref={ref} {...props}>{text}</span>
    );
  },
);
TimeAgo.displayName = "TimeAgo";
