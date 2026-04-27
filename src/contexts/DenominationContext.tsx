"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type Denomination = 
  | "baptist" | "anglican" | "methodist" | "pentecostal" 
  | "catholic" | "adventist" | "presbyterian" | "independent";

export interface DenominationTerms {
  giving: string;
  body: string;
  minister: string;
  tier: string;
  label: string;
  icon: string;
}

export const termsMap: Record<Denomination, DenominationTerms> = {
  anglican: { giving: "Planned giving (FWO)", body: "PCC", minister: "Vicar", tier: "Diocese", label: "Anglican", icon: "✝️" },
  baptist: { giving: "Covenanted giving", body: "Deacons", minister: "Minister", tier: "Association", label: "Baptist", icon: "🕊️" },
  methodist: { giving: "Planned giving", body: "Church Council", minister: "Minister", tier: "Circuit", label: "Methodist", icon: "🔔" },
  pentecostal: { giving: "Tithe & offerings", body: "Elders", minister: "Pastor", tier: "Network", label: "Pentecostal", icon: "⚡" },
  catholic: { giving: "Parish giving", body: "Finance Committee", minister: "Parish Priest", tier: "Diocese", label: "Catholic", icon: "⛪" },
  presbyterian: { giving: "Freewill offering (FWO)", body: "Session", minister: "Minister", tier: "Presbytery", label: "Presbyterian", icon: "📖" },
  adventist: { giving: "Systematic Benevolence", body: "Church Board", minister: "Pastor", tier: "Conference", label: "Seventh-day Adventist", icon: "🌿" },
  independent: { giving: "Regular giving", body: "Leadership team", minister: "Pastor", tier: "Network", label: "Independent", icon: "➕" },
};

interface DenominationContextType {
  denomination: Denomination;
  terms: DenominationTerms;
  setDenomination: (d: Denomination) => void;
}

const DenominationContext = createContext<DenominationContextType | undefined>(undefined);

export function DenominationProvider({
  children,
  initialDenomination = "baptist",
}: {
  children: ReactNode;
  initialDenomination?: Denomination;
}) {
  const [denomination, setDenomination] = useState<Denomination>(initialDenomination);

  return (
    <DenominationContext.Provider value={{
      denomination,
      terms: termsMap[denomination],
      setDenomination
    }}>
      {children}
    </DenominationContext.Provider>
  );
}

export function useDenomination() {
  const context = useContext(DenominationContext);
  if (!context) throw new Error("useDenomination must be used within a DenominationProvider");
  return context;
}
