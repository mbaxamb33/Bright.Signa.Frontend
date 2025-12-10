export interface SalesCategory {
  id: string;
  name: string;
  target: number;
  achieved: number;
}

export interface WeeklyTarget {
  week: number;
  categories: SalesCategory[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  weeklyTargets: WeeklyTarget[];
}

export interface MonthlyData {
  month: string;
  year: number;
  shopTarget: SalesCategory[];
  employees: Employee[];
}

export const SALES_CATEGORIES = [
  { id: 'voce_total', name: 'VOCE TOTAL' },
  { id: 'mnp', name: 'MNP' },
  { id: 'ga_mfp', name: 'GA+MFP' },
  { id: 'mft', name: 'MFT' },
  { id: 'resemnari_total', name: 'RESEMNARI TOTAL' },
  { id: 'resemnari_mobil', name: 'RESEMNARI MOBIL' },
  { id: 'resemnari_fix', name: 'RESEMNARI FIX' },
  { id: 'terminals', name: 'TERMINALS' },
  { id: 'accesorii_lei', name: 'ACCESORII LEI' },
  { id: 'fixed', name: 'FIXED' },
  { id: 'non_connectivity', name: 'NON CONNECTIVITY' }
];
