"use client";

import React, { ElementType, ReactNode } from "react";

type RequiredLabelProps<T extends ElementType = "span"> = {
  children: ReactNode;
  className?: string;
  indicatorClassName?: string;
  as?: T;
  id?: string;
};

export function RequiredLabel<T extends ElementType = "span">({
  children,
  className = "",
  indicatorClassName = "text-red-500",
  as,
  id,
}: RequiredLabelProps<T>) {
  const Comp = (as || "span") as ElementType;
  return (
    <Comp id={id} className={className}>
      {children}{" "}
      <span aria-hidden="true" className={indicatorClassName}>
        *
      </span>
    </Comp>
  );
}

export default RequiredLabel;