/**
 * Denomination vocabulary, kept out of the React context on purpose.
 *
 * Server components read these terms while rendering, and importing them from
 * a "use client" module hands the server a client reference rather than the
 * object — every lookup comes back undefined, including the fallback. Holding
 * the data here lets both sides import the same table.
 */

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
