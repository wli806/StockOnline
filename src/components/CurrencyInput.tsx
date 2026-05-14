"use client";

import { useState } from "react";

const RATE = 4.75; // AUD → CNY

interface Props {
  audValue: string;
  onChangeAUD: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function CurrencyInput({ audValue, onChangeAUD, placeholder = "0.00", required = false, className = "" }: Props) {
  const [cur, setCur] = useState<"AUD" | "CNY">("AUD");
  const [display, setDisplay] = useState(audValue || "");

  function switchTo(next: "AUD" | "CNY") {
    if (next === cur) return;
    const n = parseFloat(display);
    if (!isNaN(n) && display !== "") {
      setDisplay(next === "CNY" ? (n * RATE).toFixed(2) : (n / RATE).toFixed(2));
    }
    setCur(next);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplay(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && raw !== "") {
      onChangeAUD(cur === "CNY" ? String(n / RATE) : raw);
    } else {
      onChangeAUD(raw === "" ? "" : raw);
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <input
        type="number"
        step="0.01"
        min="0"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="min-w-0 flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs flex-shrink-0 h-[34px]">
        <button type="button" onClick={() => switchTo("AUD")}
          className={`px-1.5 font-bold transition-colors ${cur === "AUD" ? "bg-slate-700 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>
          $
        </button>
        <button type="button" onClick={() => switchTo("CNY")}
          className={`px-1.5 font-bold transition-colors border-l border-slate-200 ${cur === "CNY" ? "bg-slate-700 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>
          ¥
        </button>
      </div>
    </div>
  );
}
