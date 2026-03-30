import type { AccountWebhookResponse } from '../types/account';

const ACCOUNT_ENDPOINT = 'https://n8n.dalzzen.com/webhook/account';
const ACCOUNT_UPDATE_ENDPOINT = 'https://n8n.dalzzen.com/webhook/account/update';
const inFlightByPhone = new Map<string, Promise<AccountWebhookResponse>>();
const recentResponseByPhone = new Map<string, { payload: AccountWebhookResponse; timestamp: number }>();
const RECENT_CACHE_MS = 1500;

type AccountUpdateRequest = {
  name: string;
  email: string;
  phone: string;
  previous_name?: string;
  previous_email?: string;
  previous_phone?: string;
};

async function requestAccount(phone: string) {
  const response = await fetch(ACCOUNT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone })
  });

  let payload: AccountWebhookResponse | null = null;

  try {
    payload = (await response.json()) as AccountWebhookResponse;
  } catch {
    throw new Error('Nao foi possivel ler os dados da conta.');
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Nao foi possivel carregar os dados da conta.');
  }

  if (!payload?.success) {
    throw new Error(payload?.message || payload?.error || 'Nao foi possivel carregar os dados da conta.');
  }

  return payload;
}

export async function fetchAccountByPhone(phone: string, options?: { force?: boolean }) {
  const normalizedPhone = phone.trim();
  const force = options?.force === true;

  if (!normalizedPhone) {
    throw new Error('Telefone invalido para buscar a conta.');
  }

  if (!force) {
    const cached = recentResponseByPhone.get(normalizedPhone);
    if (cached && Date.now() - cached.timestamp <= RECENT_CACHE_MS) {
      return cached.payload;
    }

    const inFlight = inFlightByPhone.get(normalizedPhone);
    if (inFlight) {
      return inFlight;
    }
  }

  const promise = requestAccount(normalizedPhone)
    .then((payload) => {
      recentResponseByPhone.set(normalizedPhone, { payload, timestamp: Date.now() });
      return payload;
    })
    .finally(() => {
      inFlightByPhone.delete(normalizedPhone);
    });

  inFlightByPhone.set(normalizedPhone, promise);
  return promise;
}

export async function updateAccount(payload: AccountUpdateRequest) {
  const response = await fetch(ACCOUNT_UPDATE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let responsePayload: AccountWebhookResponse | null = null;

  try {
    responsePayload = (await response.json()) as AccountWebhookResponse;
  } catch {
    throw new Error('Nao foi possivel salvar os dados da conta agora.');
  }

  if (!response.ok) {
    throw new Error(responsePayload?.message || responsePayload?.error || 'Nao foi possivel salvar os dados da conta agora.');
  }

  if (!responsePayload?.success) {
    throw new Error(responsePayload?.message || responsePayload?.error || 'Nao foi possivel salvar os dados da conta agora.');
  }

  return responsePayload;
}
