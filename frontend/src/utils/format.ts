export const formatCurrency = (value: number, decimals = 2): string =>
  `€${Number(value).toFixed(decimals)}`;
