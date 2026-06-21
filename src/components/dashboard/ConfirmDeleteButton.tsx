"use client";
import React from "react";

export function ConfirmDeleteButton({
  message,
  children,
  ...props
}: { message: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
