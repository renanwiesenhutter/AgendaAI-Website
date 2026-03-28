export type AccountApiUser = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type AccountApiSubscription = {
  plan_name?: string | null;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  interval?: string | null;
  next_billing_date?: string | null;
  customer_id?: string | null;
  subscription_id?: string | null;
  portal_url?: string | null;
};

export type AccountWebhookResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  account?: AccountApiUser | null;
  subscription?: AccountApiSubscription | null;
};
