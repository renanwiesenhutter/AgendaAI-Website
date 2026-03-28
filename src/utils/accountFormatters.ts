export const getDigits = (value: string) => value.replace(/\D/g, '');

export const normalizePhoneForWebhook = (value: string) => {
  const digits = getDigits(value);
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

export const formatPhoneBR = (value: string) => {
  const digits = getDigits(value);
  const localPhone = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;

  if (localPhone.length >= 11) {
    const ddd = localPhone.slice(0, 2);
    const part1 = localPhone.slice(2, 7);
    const part2 = localPhone.slice(7, 11);
    return `(${ddd}) ${part1}-${part2}`;
  }

  if (localPhone.length === 10) {
    const ddd = localPhone.slice(0, 2);
    const part1 = localPhone.slice(2, 6);
    const part2 = localPhone.slice(6, 10);
    return `(${ddd}) ${part1}-${part2}`;
  }

  return value || '-';
};

export const formatCurrencyBRL = (amount?: number | null, currency?: string | null) => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return 'Valor indisponivel';
  const safeCurrency = currency && currency.trim() ? currency.toUpperCase() : 'BRL';

  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: safeCurrency
    }).format(amount);
  } catch {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }
};

export const formatDatePtBR = (value?: string | null) => {
  if (!value || !value.trim()) return 'Data indisponivel';

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) return 'Data indisponivel';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(parsedDate);
};

export const formatSubscriptionInterval = (value?: string | null) => {
  switch ((value || '').toLowerCase()) {
    case 'day':
      return 'por dia';
    case 'week':
      return 'por semana';
    case 'month':
      return 'por mes';
    case 'year':
      return 'por ano';
    default:
      return '';
  }
};
