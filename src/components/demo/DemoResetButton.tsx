"use client";
import React from "react";
import { useDemoState } from "@/contexts/DemoStateContext";

export default function DemoResetButton() {
  const { dispatch } = useDemoState();
  return (
    <button
      className="btn btn-outline btn-sm"
      style={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}
      onClick={() => dispatch({ type: "RESET" })}
    >
      ↺ Reset demo
    </button>
  );
}
