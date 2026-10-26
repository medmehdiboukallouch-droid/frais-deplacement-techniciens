/** Valeurs stockées en base (CHECK frais_deplacement_type_frais_check) — minuscules */
export const EXPENSE_TYPE_VALUES = [
  'transport',
  'repas',
  'materiel',
  'hebergement',
  'autre',
] as const

export type ExpenseTypeValue = (typeof EXPENSE_TYPE_VALUES)[number]

export const EXPENSE_TYPE_OPTIONS: { value: ExpenseTypeValue; label: string }[] = [
  { value: 'transport', label: 'Transport' },
  { value: 'repas', label: 'Repas' },
  { value: 'materiel', label: 'Matériel' },
  { value: 'hebergement', label: 'Hébergement' },
  { value: 'autre', label: 'Autre' },
]
