"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

import { termsMap, type Denomination, type DenominationTerms } from "@/lib/denominations";

// Re-exported so existing client imports keep working. Server components must
// import from "@/lib/denominations" directly — see the note there.
export { termsMap };
export type { Denomination, DenominationTerms };

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
