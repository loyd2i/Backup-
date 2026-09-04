// Configuration fiscale par pays pour la génération des factures/reçus.

export interface TaxConfig {
  country: string;     // Code pays (ISO 3166-1 alpha-2)
  countryName: string; // Nom affiché
  vatRate: number;     // Taux de TVA (0.20 = 20%)
}

export const SUPPORTED_COUNTRIES: TaxConfig[] = [
  { country: 'FR', countryName: 'France', vatRate: 0.20 },
  { country: 'BE', countryName: 'Belgique', vatRate: 0.21 },
  { country: 'CH', countryName: 'Suisse', vatRate: 0.081 },
  { country: 'LU', countryName: 'Luxembourg', vatRate: 0.17 },
  { country: 'CA', countryName: 'Canada', vatRate: 0.05 },
];

const DEFAULT_TAX_CONFIG = SUPPORTED_COUNTRIES[0]; // France par défaut

export function getTaxConfig(country?: string | null): TaxConfig {
  return SUPPORTED_COUNTRIES.find((c) => c.country === country) || DEFAULT_TAX_CONFIG;
}

// Commission prélevée par la plateforme sur chaque session terminée
export const PLATFORM_COMMISSION_RATE = 0.03;
