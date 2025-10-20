import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, CreditCard, Mail, UserRound, Smartphone, Lock, ChevronDown, Tag, X } from 'lucide-react';
import { useSearchParams, useLocation } from "react-router-dom";
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe, PaymentRequestButtonElement } from "@stripe/react-stripe-js";
import clsx from "clsx";

<style>{`
@keyframes dash { to { stroke-dashoffset: 0; } }
@keyframes pop  { 0%{ transform: scale(.96); opacity:.6 } 100%{ transform: scale(1); opacity:1 } }

/* linha pontilhada “líder” entre marca e valor */
.receipt-leader {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
}
.receipt-leader::before {
  content: "";
  height: 1px;
  background:
    repeating-linear-gradient(
      to right,
      rgba(0,0,0,0.18) 0 2px,
      rgba(0,0,0,0) 2px 8px
    );
  opacity: .35;
  align-self: center;
  /* ocupa a coluna do meio */
  grid-column: 2 / 3;
}
/* serrilha inferior do “cupom” */
.receipt-teeth {
  height: 22px;
  background:
    linear-gradient(45deg, #0000 16px, #e5e7eb 0 20px, #0000 0),
    linear-gradient(-45deg,#0000 16px,#e5e7eb 0 20px,#0000 0);
  background-size: 20px 20px;
  background-position: 0 0, 0 0;
  border-bottom-left-radius: 0.75rem;
  border-bottom-right-radius: 0.75rem;
}

body.lock-scroll {
  overflow: hidden;
  height: 100dvh; /* evita “altura fantasma” quando some conteúdo */
}
`}</style>

// === Helpers (topo do arquivo) ===
const PRICE_CENTS_DEFAULT = 11880; // ajuste se seu backend devolver outro valor
const BRAND_DEFAULT = "DALZZEN";

function formatBRL(cents: number) {
  try {
    return (cents ?? 0) >= 0
      ? (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "R$ 0,00";
  } catch {
    return "R$ 0,00";
  }
}

/* === 1) Deixe o stripePromise ESTÁVEL no escopo de módulo === */
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK!);

function ApplePayPRB({
  enabled, name, email, phone, couponCode, onSuccess, mode,
}: {
  enabled: boolean;
  name: string;
  email: string;
  phone: string;
  couponCode?: string | null;
  onSuccess: (amountCents?: number, brand?: string) => void;
  mode: "annual" | "monthly";
}) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = React.useState<stripeJs.PaymentRequest | null>(null);
  const handlerAttached = React.useRef(false);

  React.useEffect(() => {
    if (!stripe || !enabled) { setPaymentRequest(null); return; }

    const amountMonthly = 1990;  // R$ 19,90 (centavos)
    const amountAnnual  = 11880; // R$ 118,80 (centavos)

    const nextMonthISO = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().slice(0, 10);
    })();

    const trialStartISO = new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10);

    const pr = stripe.paymentRequest({
      country: "BR",
      currency: "brl",
      // total mostra o que será cobrado AGORA:
      total: mode === "annual"
        ? { label: "Agenda AI – Anual (7 dias grátis)", amount: 0 }
        : { label: "Agenda AI – Mensal (1º mês)",       amount: amountMonthly },

      requestPayerName: true,
      requestPayerEmail: true,

      // 🔑 Exibir termos de recorrência no sheet
      recurringPaymentRequest: mode === "annual"
        ? {
            paymentDescription: "Agenda AI – assinatura anual",
            regularBilling: {
              label: "Agenda AI – Anual",
              amount: amountAnnual,
              paymentTiming: "recurring",
              billingInterval: "year",
              recurringPaymentStartDate: trialStartISO, // cobra em 7 dias
            },
            trialBilling: {
              label: "7 days free",
              amount: 0,
              paymentTiming: "deferred",
              billingInterval: "week",
            },
          }
        : {
            paymentDescription: "Agenda AI – assinatura mensal",
            regularBilling: {
              label: "Agenda AI – Mensal",
              amount: amountMonthly,
              paymentTiming: "recurring",
              billingInterval: "month",
              recurringPaymentStartDate: nextMonthISO, // próxima cobrança em ~1 mês
            },
            // sem trial no mensal → sem trialBilling
          },
    });

    pr.canMakePayment().then((res) => {
      if (res?.applePay) setPaymentRequest(pr);
      else setPaymentRequest(null);
    });

    return () => { setPaymentRequest(null); handlerAttached.current = false; };
  }, [stripe, enabled, mode, name, email, phone, couponCode]);

  React.useEffect(() => {
    if (!stripe || !paymentRequest || handlerAttached.current) return;

    paymentRequest.on("paymentmethod", async (ev) => {
      try {
        const base = "https://n8n.dalzzen.com/webhook";
        const headers = {
          "Content-Type": "application/json",
          "x-api-key": "ZT6^HNWHJ6$dV8n5T6V7tioSzZ!W9BxHz#YZu5Si%Y8QUzd%TREEVADN@KDU@Pmz55uF!kKNMjG&g7f^nVEMxUqahCozK7%yZgFoMvis&8wf8Zvyhw&7kguxteBhqbDM",
        };

        if (mode === "annual") {
          // ANUAL → SetupIntent (trial hoje = R$0)
          const r = await fetch(`${base}/payment/yearly/init`, {
            method: "POST",
            headers,
            body: JSON.stringify({ name, email, phone, coupon: couponCode || undefined }),
          });
          const j = await r.json();
          const cs: string | undefined = j?.client_secret;
          if (!cs || !cs.startsWith("seti_")) { ev.complete("fail"); return; }

          const { error } = await stripe.confirmCardSetup(cs, {
            payment_method: ev.paymentMethod.id,
          });
          if (error) { ev.complete("fail"); return; }

          ev.complete("success");
          onSuccess(undefined, "DALZZEN");
        } else {
          // MENSAL → PaymentIntent (cobra agora o 1º mês)
          const r = await fetch(`${base}/payment/monthly/init`, {
            method: "POST",
            headers,
            body: JSON.stringify({ name, email, phone, coupon: couponCode || undefined }),
          });
          const j = await r.json();
          const cs: string | undefined = j?.client_secret;
          if (!cs || !cs.startsWith("pi_")) { ev.complete("fail"); return; }

          const pay = await stripe.confirmCardPayment(cs, {
            payment_method: ev.paymentMethod.id,
          });
          if (pay.error) { ev.complete("fail"); return; }

          ev.complete("success");
          onSuccess(pay.paymentIntent?.amount, "DALZZEN");
        }
      } catch {
        ev.complete("fail");
      }
    });

    handlerAttached.current = true;
  }, [stripe, paymentRequest, mode, name, email, phone, couponCode, onSuccess]);

  if (!paymentRequest || !enabled) return null;

  // Mantém o mesmo tamanho do teu CTA (55px)
  return (
    <div className="w-full h-[55px] rounded-lg overflow-hidden">
      <PaymentRequestButtonElement
        className="w-full h-full"
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              height: '55px',
              theme: 'dark',
              type: 'default',
            },
          },
        }}
      />
    </div>
  );
}

/* === 2) Mova o StripePaymentForm para FORA do CheckoutPage === */
function StripePaymentForm({
  contactValid, name, email, phone, onSuccess, couponCode,
  mode, // "annual" | "monthly"
}: {
  contactValid: boolean; name: string; email: string; phone: string;
  onSuccess: (amountCents?: number, brand?: string) => void;
  couponCode?: string | null;
  mode: "annual" | "monthly";
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [peComplete, setPeComplete] = React.useState(false);

  // 👉 NOVO: saber o método selecionado DENTRO do PaymentElement
  const [selectedType, setSelectedType] = React.useState<string | null>(null);

  // o teu disabled original, mas só vale para cartão/PIX (quando não é apple_pay)
  const disabled = !stripe || !contactValid || loading || (selectedType !== "apple_pay" && !peComplete);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    // Se for Apple Pay, quem dispara é o botão PRB (abaixo)
    if (selectedType === "apple_pay" && mode === "annual") return;

    setLoading(true);
    setErrorMsg(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setErrorMsg(submitErr.message || "Complete os dados de pagamento.");
      setLoading(false);
      return;
    }

    try {
      const base = "https://n8n.dalzzen.com/webhook";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": "ZT6^HNWHJ6$dV8n5T6V7tioSzZ!W9BxHz#YZu5Si%Y8QUzd%TREEVADN@KDU@Pmz55uF!kKNMjG&g7f^nVEMxUqahCozK7%yZgFoMvis&8wf8Zvyhw&7kguxteBhqbDM",
      };

      if (mode === "annual") {
        const res = await fetch(`${base}/payment/yearly/init`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name, email, phone, coupon: couponCode || undefined }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const cs: string | undefined = data?.client_secret;
        if (!cs || !cs.startsWith("seti_")) throw new Error("Esperava client_secret de SetupIntent (seti_...).");

        const result = await stripe.confirmSetup({
          elements,
          clientSecret: cs,
          redirect: "if_required",
        });
        if (result.error) throw new Error(result.error.message || "Não foi possível processar.");
        onSuccess(undefined, "DALZZEN");
      } else {
        const res = await fetch(`${base}/payment/monthly/init`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name, email, phone, coupon: couponCode || undefined }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const cs: string | undefined = data?.client_secret;
        if (!cs || !cs.startsWith("pi_")) throw new Error("Esperava client_secret de PaymentIntent (pi_...).");

        const pay = await stripe.confirmPayment({
          elements,
          clientSecret: cs,
          redirect: "if_required",
        });
        if (pay.error) throw new Error(pay.error.message || "Falha ao confirmar o pagamento.");
        onSuccess(pay.paymentIntent?.amount, "DALZZEN");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Erro inesperado ao processar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg p-0 space-y-6">
      {/* PaymentElement continua igual, com Apple Pay AUTOMÁTICO */}
      <PaymentElement
        options={{
          layout: { type: "accordion", defaultCollapsed: false, radios: false, spacedAccordionItems: false },
          wallets: { applePay: "auto", googlePay: "auto" },
          terms: { card: "never", googlePay: "never", applePay: "never" },
        }}
        onChange={(e: any) => {
          setPeComplete(e.complete);
          // e.value?.type retorna 'card', 'apple_pay', 'link', etc.
          if (e?.value?.type) setSelectedType(e.value.type);
        }}
      />

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      {/* ⬇️ mesmo layout do teu rodapé; só troca o conteúdo */}
      <div className="space-y-4">
        {selectedType === "apple_pay" ? (
          <div
            className={`relative ${!contactValid ? "opacity-50" : ""}`}
            aria-disabled={!contactValid}
          >
            {/* Overlay que bloqueia clique/toque quando inválido */}
            {!contactValid && (
              <div
                className="absolute inset-0 z-10 cursor-not-allowed"
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  setErrorMsg("Preencha nome, e-mail e telefone para continuar.");
                }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                role="presentation"
                aria-hidden="true"
              />
            )}

            {/* PRB: visual sempre presente; interação bloqueada quando inválido */}
            <div className={!contactValid ? "pointer-events-none" : ""}>
              <ApplePayPRB
                enabled={true}
                mode={mode}                // "annual" ou "monthly"
                name={name}
                email={email}
                phone={phone}
                couponCode={couponCode ?? null}
                onSuccess={onSuccess}
              />
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={disabled}
            aria-disabled={disabled}
            aria-busy={loading || undefined}
            className={[
              "w-full h-[55px] text-white font-medium rounded-lg transition-all",
              mode === "annual" ? "bg-gradient-to-r from-blue-500 to-green-600" : "bg-blue-600",
              disabled
                ? "opacity-50 cursor-not-allowed pointer-events-none"
                : mode === "annual"
                ? "hover:opacity-90"
                : "hover:bg-blue-700",
            ].join(" ")}
          >
            <span className="grid grid-cols-[1.25rem_1fr_1.25rem] items-center px-6">
              <span aria-hidden className="w-5 h-5" />
              <span className="justify-self-center">
                {loading ? "Processando..." : mode === "annual" ? "Iniciar teste" : "Assinar"}
              </span>
              <svg aria-hidden className={`justify-self-end w-5 h-5 ${loading ? "opacity-100" : "opacity-0"} transition-opacity animate-spin`} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        )}

        <p className="text-[13px] text-gray-500 text-center">
          Ao confirmar a inscrição, o senhor concede permissão à Dalzzen para
          efetuar cobranças conforme as condições estipuladas, até que ocorra o cancelamento.
        </p>
      </div>
    </form>
  );
}

// --- topo do arquivo (fora do componente) ---
const N8N_BASE = import.meta.env.VITE_N8N_BASE || "https://n8n.dalzzen.com/webhook";
const N8N_KEY  = "ZT6^HNWHJ6$dV8n5T6V7tioSzZ!W9BxHz#YZu5Si%Y8QUzd%TREEVADN@KDU@Pmz55uF!kKNMjG&g7f^nVEMxUqahCozK7%yZgFoMvis&8wf8Zvyhw&7kguxteBhqbDM";
const ABANDON_PATH = "/checkout/abandon";

// dispara para o n8n (usa keepalive + redundância com sendBeacon)
function emitCheckoutExit(payload: Record<string, any>, reason: string) {
  try {
    const body = JSON.stringify({ ...payload, reason, ts: new Date().toISOString(), href: location.href });

    // 1) principal: fetch com keepalive (permite header x-api-key)
    fetch(`${N8N_BASE}${ABANDON_PATH}`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": N8N_KEY,
      },
      body,
    }).catch(() => { /* silencioso */ });

    // 2) redundância: sendBeacon (sem header → key na URL)
    if (navigator.sendBeacon) {
      const beaconUrl = `${N8N_BASE}${ABANDON_PATH}?k=${encodeURIComponent(N8N_KEY)}`;
      // string -> Content-Type "text/plain", o n8n deve parsear JSON do body
      navigator.sendBeacon(beaconUrl, body);
    }
  } catch { /* noop */ }
}

// Cupom
const CouponToggle = React.memo(React.forwardRef(function CouponToggle(
  {
    onApply,
  }: {
    onApply?: (c: string) => Promise<{ ok: boolean; message?: string }>;
  },
  ref: React.Ref<{ open: () => void; close: () => void }>
) {
  const [editing, setEditing] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const chipRef = React.useRef<HTMLButtonElement>(null);

  // mede a largura do chip só uma vez (na montagem)
  const [chipW, setChipW] = React.useState<number | null>(null);
  const [measured, setMeasured] = React.useState(false);

  React.useImperativeHandle(ref, () => ({
    open: () => {
      setError(null);
      setEditing(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    close: () => setEditing(false),
  }));

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  React.useLayoutEffect(() => {
    if (chipRef.current && chipW == null) {
      setChipW(Math.ceil(chipRef.current.scrollWidth));
      // habilita a transição só DEPOIS da primeira medição,
      // evitando animação “do nada” no primeiro paint
      requestAnimationFrame(() => setMeasured(true));
    }
  }, [chipW]);

  async function applyNow() {
    const trimmed = code.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const resp = await onApply?.(trimmed);
      if (resp && !resp.ok) {
        setError(resp.message || "Código inválido.");
        return;
      }
      setError(null);
      setEditing(false);
    } catch {
      setError("Erro ao validar o cupom.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(v: string) {
    setCode(v);
    if (error) setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") applyNow();
    if (e.key === "Escape") {
      setCode("");
      setError(null);
      setEditing(false);
    }
  }

  function handleBlur() {
    if (code.trim() === "") setEditing(false);
  }

  const chipWidth = chipW ?? 160;

  return (
    <div className="mt-3 col-start-2 col-end-4">
      <div
        className={[
          "relative overflow-hidden rounded-md origin-left",
          measured ? "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" : "transition-none",
          editing ? "w-full" : "w-[var(--chip-w)]",
          "h-10 max-w-full",
          editing
            ? (error
                ? "bg-white focus-within:ring-2 focus-within:ring-red-500/70 focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]"
                : "bg-white focus-within:ring-2 focus-within:ring-[#4c9ffe] focus-within:shadow-[0_0_0_3px_rgba(76,159,254,0.3)]")
            : "bg-white/10 hover:bg-white/20"
        ].join(" ")}
        style={{ ["--chip-w" as any]: `${chipWidth}px` }}
      >
        {!editing ? (
          <button
            ref={chipRef}
            onClick={() => { setEditing(true); setError(null); }}
            className="h-10 px-3 text-white font-medium text-[16px] md:text-sm inline-flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
          >
            Adicionar código promocional
          </button>
        ) : (
          <div className="flex items-center h-10 px-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Adicionar código promocional"
              value={code}
              onChange={(e) => handleChange(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={loading}
              className={`flex-1 h-full px-1 text-[16px] md:text-sm outline-none bg-transparent
                          ${error ? "text-red-600 placeholder-red-400" : "text-black placeholder-black/80"}
                          ${loading ? "opacity-70" : ""}`}
            />
            {code.trim() !== "" && !error && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyNow}
                disabled={loading}
                className={`ml-2 text-sm font-medium ${loading ? "cursor-default text-blue-600" : "text-blue-600 hover:text-blue-700"} pop-in inline-flex items-center gap-2`}
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  "Aplicar"
                )}
              </button>
            )}
            <style>{`
              @keyframes pop-in {
                0%   { opacity: 0; transform: translateY(4px) scale(0.9); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
              .pop-in { animation: pop-in 180ms cubic-bezier(0.22, 1, 0.36, 1); }
            `}</style>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-white">{error}</p>}
    </div>
  );
}));

function AnimatedErrors({ messages }: { messages: string[] }) {
  // slots fixos na mesma ordem do array: [name, email, phone]
  const slots = ["name", "email", "phone"] as const;

  type Phase = "enter" | "present" | "exit";
  type Item = { id: string; text: string; phase: Phase };

  const [items, setItems] = React.useState<Item[]>([]);
  const timers = React.useRef<Record<string, number>>({});

  // Durações
  const ENTER_MS = 420;
  const EXIT_MS = 360;
  const EASING = "cubic-bezier(0.22,1,0.36,1)";

  // Normaliza preservando posições (não use filter(Boolean) aqui!)
  const normalized = React.useMemo(() => {
    const arr: { slot: string; id: string; text: string }[] = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const text = messages[i] || ""; // pode vir vazio
      if (text) {
        // id estável por campo + texto atual (se o texto mudar, reanima)
        arr.push({ slot, id: `${slot}::${text}`, text });
      } else {
        // ainda adicionamos um marcador de “vazio” por slot para saída animada
        arr.push({ slot, id: `${slot}::`, text: "" });
      }
    }
    return arr;
  }, [messages]);

  // Recalcula fases
  React.useEffect(() => {
    setItems((prev) => {
      const prevBySlot = new Map<string, Item>();
      prev.forEach((p) => {
        const slot = p.id.split("::")[0]; // recupera o slot
        prevBySlot.set(slot, p);
      });

      const next: Item[] = [];

      for (const row of normalized) {
        const slot = row.slot;
        const prevItem = prevBySlot.get(slot);

        if (!prevItem) {
          // nunca existiu nesse slot
          if (row.text) {
            next.push({ id: row.id, text: row.text, phase: "enter" });
          }
          continue;
        }

        if (!row.text) {
          // agora está vazio -> precisamos marcar o anterior como "exit"
          if (prevItem.phase !== "exit") {
            next.push({ ...prevItem, phase: "exit" });
          } else {
            next.push(prevItem);
          }
        } else {
          // há texto atual
          if (prevItem.text !== row.text) {
            // novo texto no mesmo slot -> entra
            next.push({ id: row.id, text: row.text, phase: "enter" });
          } else {
            // mesmo texto -> present
            next.push({ ...prevItem, phase: "present" });
          }
        }
      }

      // Itens antigos que ficaram “sobrando” (sem slot correspondente com texto) permanecem como exit
      const nextIds = new Set(next.map((n) => n.id));
      prev.forEach((p) => {
        if (!nextIds.has(p.id) && p.phase !== "exit") {
          next.push({ ...p, phase: "exit" });
        }
      });

      return next;
    });
  }, [normalized]);

  // Timers para transição de enter→present e remoção após exit
  React.useEffect(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};

    items.forEach((i) => {
      if (i.phase === "enter") {
        timers.current[i.id] = window.setTimeout(() => {
          setItems((prev) =>
            prev.map((x) => (x.id === i.id ? { ...x, phase: "present" } : x))
          );
        }, ENTER_MS);
      }
      if (i.phase === "exit") {
        timers.current[i.id] = window.setTimeout(() => {
          setItems((prev) => prev.filter((x) => x.id !== i.id));
        }, EXIT_MS);
      }
    });

    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [items]);

  return (
    <div className="-mt-3 mb-6 -pl-[12px] space-y-1" role="alert" aria-live="polite">
      <style>{`
        @keyframes err-drop-in {
          0% { opacity: 0; transform: translateY(-6px) }
          100% { opacity: 1; transform: translateY(0) }
        }
        @keyframes err-lift-out {
          0% { opacity: 1; transform: translateY(0) }
          100% { opacity: 0; transform: translateY(6px) }
        }
      `}</style>

      {items
        .filter((i) => i.text || i.phase === "exit") // renderiza enquanto sai
        .map((i) => {
          const anim =
            i.phase === "enter"
              ? `err-drop-in ${ENTER_MS}ms ${EASING} forwards`
              : i.phase === "exit"
              ? `err-lift-out ${EXIT_MS}ms ${EASING} forwards`
              : undefined;

          return (
            <p
              key={i.id}
              className="text-sm text-red-600 will-change-transform"
              style={anim ? { animation: anim } : undefined}
            >
              {i.text}
            </p>
          );
        })}
    </div>
  );
}

function HeightTransition({
  children,
  duration = 320,
  easing = "cubic-bezier(0.22,1,0.36,1)",
}: {
  children: React.ReactNode;
  duration?: number;
  easing?: string;
}) {
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState(0);

  // ajuste fino do “respiro” da animação
  const PAD_TOP = 4;   // px – mude para 2 se quiser ainda mais perto
  const PAD_BOTTOM = 2;

  React.useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const measure = () => setHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      style={{
        height,
        transition: `height ${duration}ms ${easing}`,
        overflow: "hidden",
        // compensa visualmente o padding-top sem cortar a animação
        marginTop: -PAD_TOP,
      }}
      aria-live="polite"
    >
      <div ref={innerRef} style={{ paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM }}>
        {children}
      </div>
    </div>
  );
}

// fora do componente, uma única vez
(function patchHistoryOnce() {
  if ((window as any).__historyPatched) return;
  (window as any).__historyPatched = true;

  const { pushState, replaceState } = history;
  history.pushState = function(...args) {
    const ret = pushState.apply(this, args as any);
    window.dispatchEvent(new Event("locationchange"));
    return ret;
  } as any;
  history.replaceState = function(...args) {
    const ret = replaceState.apply(this, args as any);
    window.dispatchEvent(new Event("locationchange"));
    return ret;
  } as any;
  window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("locationchange"));
  });
})();

/* === 3) Seu CheckoutPage permanece, mas agora NÃO remonta o PaymentElement ao digitar === */
const CheckoutPage = () => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [chipEnter, setChipEnter] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [exiting, setExiting]   = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const couponRefMobile = React.useRef<{ open: () => void; close: () => void }>(null);

// no topo do componente
const mountedAtRef = React.useRef<number>(Date.now());

// === Lookup de cliente (n8n) ===
type LookupState = {
  checking: boolean;
  checkedEmail?: string;
  hasActive: boolean;
  portalUrl?: string;
  error?: string;
};

const [lookup, setLookup] = React.useState<LookupState>({
  checking: false,
  hasActive: false,
});

const couponLocked = lookup.hasActive;

// helper
const trimmedEmail = email.trim();
const isValidGmail = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(trimmedEmail);

// Dispara quando o e-mail fica válido e for diferente do último consultado
React.useEffect(() => {
  if (!isValidGmail) return;

  // evita refetch do mesmo email enquanto nada mudou
  if (lookup.checking || lookup.checkedEmail === trimmedEmail) return;

  let cancel = false;
  const base =
    import.meta.env.VITE_N8N_BASE || "https://n8n.dalzzen.com/webhook";

  // pequeno debounce para não bater no n8n a cada tecla
  const t = setTimeout(async () => {
    setLookup((s) => ({ ...s, checking: true, error: undefined }));

    try {
      const res = await fetch(`${base}/customer/lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // mesma API key em código que você já usa nos outros endpoints
          "x-api-key":
            "ZT6^HNWHJ6$dV8n5T6V7tioSzZ!W9BxHz#YZu5Si%Y8QUzd%TREEVADN@KDU@Pmz55uF!kKNMjG&g7f^nVEMxUqahCozK7%yZgFoMvis&8wf8Zvyhw&7kguxteBhqbDM",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const json: {
        ok?: boolean;
        hasActive?: boolean;
        portalUrl?: string;
        email?: string;
        customerId?: string;
      } = await res.json();

      if (cancel) return;

      if (res.ok && json?.ok && json?.hasActive) {
        setLookup({
          checking: false,
          checkedEmail: trimmedEmail,
          hasActive: true,
          portalUrl: json.portalUrl,
        });
      } else {
        setLookup({
          checking: false,
          checkedEmail: trimmedEmail,
          hasActive: false,
        });
      }
    } catch (e) {
      if (cancel) return;
      setLookup({
        checking: false,
        checkedEmail: trimmedEmail,
        hasActive: false,
        error: "Falha ao verificar assinatura.",
      });
    }
  }, 350);

  return () => {
    clearTimeout(t);
    cancel = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [trimmedEmail, isValidGmail]);

function resetLookupToCheckout() {
  // fecha a tela de "assinatura ativa"
  setLookup({ checking: false, hasActive: false });

  // zera os campos de contato
  setName("");
  setEmail("");
  setPhone("");
  prevDigitsRef.current = "";

  // zera estados de validação/foco
  setTouched({ name: false, email: false, phone: false });
  setFocused({ name: false, email: false, phone: false });

  // opcional: limpar cupom também
  // setApplied(null);
}

// Qual plano veio na URL?
const location = useLocation();
const [searchParams] = useSearchParams();

const planQ = (searchParams.get("plan") || "").toLowerCase(); // "annual" | "monthly"
const seg = location.pathname.split("/").pop()?.toLowerCase(); // .../checkout/mensal etc.

const plan =
  planQ === "monthly" || seg === "monthly" || seg === "mensal"
    ? "monthly"
    : "annual"; // default: annual

const isAnnual = plan === "annual";

const THEME_BG = isAnnual
  ? "bg-gradient-to-r from-blue-500 to-green-600" // anual
  : "bg-blue-600";                                  // mensal (mesmo azul do botão "Assinar")

{/* === CSS do recibo (coloque dentro do JSX da página) === */}
<style>{`
@keyframes check-draw { to { stroke-dashoffset: 0 } }
.check-path {
  /* técnica com pathLength = 1 -> independe do getTotalLength() */
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: check-draw 600ms cubic-bezier(0.22,1,0.36,1) 120ms forwards;
}
@keyframes success-pop { 0%{transform:scale(.96);opacity:.6} 100%{transform:scale(1);opacity:1} }
`}</style>

/* === COMPONENTE DO RECIBO (mesma página) === */
function SuccessReceipt({ brand, amountCents }: { brand: string; amountCents: number }) {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Ícone de sucesso */}
      <div className="mt-1 mb-3 mt-12 lg:mt-0 w-14 h-14 grid place-items-center animate-[success-pop_220ms_cubic-bezier(0.22,1,0.36,1)_both]">
        <svg viewBox="0 0 48 48" className="w-14 h-14" fill="none" aria-hidden>
          <circle cx="24" cy="24" r="20" stroke="#2ECC71" strokeWidth="2" />
          <path
            d="M16 24.5l6 6L34 18"
            stroke="#2ECC71"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="check-path"
          />
        </svg>
      </div>

      {/* Título */}
      <h2 className="text-[20px] font-semibold text-[#1A1A1AE6] mb-16">
        Agradecemos sua assinatura
      </h2>

      {/* ===== RECIBO COM SVG ===== */}
      <div className="relative mb-1">
<svg class="InlineSVG" focusable="false" width="100%" height="68" viewBox="0 0 384 68" fill="white"><path d="M0 3.923C0 1.756 2.686 0 6 0h372c3.314 0 6 1.756 6 3.923V68l-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23-8 5.23-8-5.23L96 68l-8-5.23L80 68l-8-5.23L64 68l-8-5.23L48 68l-8-5.23L32 68l-8-5.23L16 68l-8-5.23L0 68V3.923z" id="Path" fill-opacity=".03" fill="#000" fill-rule="nonzero"></path><path d="M375.646 62.538l-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5-.354-.231-.354.231-7.646 5-7.646-5L8 62.307l-.354.231L.5 67.211V3.923C.5 1.937 2.962.327 6 .327h372c3.038 0 5.5 1.61 5.5 3.596v63.288l-7.146-4.673-.354-.231-.354.231z" id="Path" stroke-opacity=".08" stroke="#000" stroke-width=".5"></path></svg>

        {/* Conteúdo do recibo (estilo da imagem) */}
        <div className="absolute inset-0 flex items-start pt-2">
          <div className="w-full px-5 pt-2.5">
            <div className="flex items-baseline">
              <span
                className="mr-1 uppercase"
                style={{
                  fontFamily: "monospace",
                  fontSize: "14px",
                  fontWeight: 600,     // regular
                  color: "#000",
                  opacity: 0.4,
                }}
              >
                {brand}
              </span>
        
              {/* Pontilhado: pontos pequenos, bem claros, colados à base */}
              <span className="relative flex-1 h-[1em]" aria-hidden>
                <i
                  className="absolute inset-x-0"
                  style={{
                    height: "1px",
                    bottom: "-0.10em",
                    backgroundImage:
                      "radial-gradient(#cbd5e1 1px, transparent 1.4px)",
                    backgroundSize: "5px 1px",
                    backgroundRepeat: "repeat-x",
                    opacity: 0.4,
                  }}
                />
              </span>
        
              {/* Valor: 13px, cinza um pouco mais escuro, com números tabulares */}
              <span
                className="ml-1 tabular-nums"
                style={{
                  fontFamily: "monospace",
                  fontSize: "14px",
                  fontWeight: 100,
                  color: "#000",
                  opacity: 0.4,
                }}
              >
                {formatBRL(subtotalAfterCents)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* helper para formatar BRL */
function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* UI State */
const [uiState, setUiState] = React.useState<"form" | "fading" | "success">("form");
const showRemoveCoupon = uiState !== "success";
const [receiptBrand, setReceiptBrand] = React.useState(BRAND_DEFAULT);
const [receiptAmountCents, setReceiptAmountCents] = React.useState(PRICE_CENTS_DEFAULT);

// chama isto quando o pagamento for confirmado:
function startSuccessTransition(amountCents?: number, brand?: string) {
  setReceiptAmountCents(amountCents ?? 11800);
  setReceiptBrand((brand ?? "DALZZEN").toUpperCase());
  setUiState("success");

  // Feche qualquer painel e limpe foco do Stripe (evita “voltar” pro meio da página)
  setShowDetails(false);
  (document.activeElement as HTMLElement | null)?.blur?.();

  // Role pro topo imediatamente (sem animação)
  // @ts-ignore – alguns browsers aceitam 'instant'
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Trava o scroll do body e ajusta a altura à viewport real (usa 100dvh)
  document.body.classList.add('lock-scroll');
}

// fora do JSX
const prevDigitsRef = React.useRef("");

const handlePhoneChange = React.useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Mantém só dígitos
    let digits = raw.replace(/\D/g, "");

    // Se veio com +55/0055 (autofill do iOS) ou passou de 11 e começa com 55, remove o país
    const startsIntl = /^\s*(\+|00)/.test(raw);
    if ((startsIntl || digits.length > 11) && digits.startsWith("55")) {
      digits = digits.slice(2);
    }

    // Limita a 11 (celular) — 10 se for fixo
    digits = digits.slice(0, 11);

    // Detecta se está apagando
    const deleting = digits.length < prevDigitsRef.current.length;
    prevDigitsRef.current = digits;

    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);

    let formatted = "";

    // ✅ Sem máscara enquanto houver até 2 dígitos (evita “guerra” com os parênteses)
    if (digits.length <= 2) {
      formatted = digits; // ex.: "3", "31"
    } else {
      // A partir de 3 dígitos, aplica máscara nacional
      const prefix = `(${ddd}) `;

      if (digits.length > 10) {
        // Celular: (DD) 9xxxx-xxxx
        const p1 = rest.slice(0, 5);
        const p2 = rest.slice(5, 9);
        formatted = prefix + (p2 ? `${p1}-${p2}` : p1);
      } else {
        // Fixo: (DD) xxxx-xxxx
        const p1 = rest.slice(0, 4);
        const p2 = rest.slice(4, 8);
        formatted = prefix + (p2 ? `${p1}-${p2}` : p1);
      }
    }

    setPhone(formatted);
  },
  []
);

  // quais campos já foram tocados (saíram com blur)
  const [touched, setTouched] = React.useState({
    name: false,
    email: false,
    phone: false,
  });

  const [focused, setFocused] = React.useState({
    name: false,
    email: false,
    phone: false,
  });
  
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
  
  function getNameError() {
    // Não mostra erro se não saiu do campo ainda OU enquanto está focado
    if (!touched.name || focused.name) return "";
    const v = name.trim();
    if (v.length === 0) return "";            // vazio: não mostra erro
    if (v.length < 3) return "Seu nome precisa de pelo menos três caracteres.";
    return "";
  }
  
  function getEmailError() {
    if (!touched.email || focused.email) return "";
    const v = email.trim();
    if (v.length === 0) return "";            // vazio: não mostra erro
    if (!v.includes("@")) return "Seu e-mail está incompleto.";
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    if (!gmailRegex.test(v)) return "Lembre-se de usar um Gmail.";
    return "";
  }
  
  function getPhoneError() {
    if (!touched.phone || focused.phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) return "";       // vazio: não mostra erro
    if (digits.length < 10) return "Seu telefone está incompleto.";
    return "";
  }
  
  const nameError  = getNameError();
  const emailError = getEmailError();
  const phoneError = getPhoneError();
  
  // (se quiser manter seu contactValid para o botão de pagar)
  const contactValid =
    !nameError && !emailError && !phoneError &&
    name.trim().length > 2 &&
    gmailRegex.test(email) &&
    phone.replace(/\D/g, "").length >= 10;

  // === novo: lista de erros empilhados ===
  const contactErrors = [nameError || "", emailError || "", phoneError || ""];

  // mesmas assinaturas que você já usa
  const rowClass = (hasError: boolean, where: "top" | "mid" | "bottom") => {
    const base  = "relative group bg-white transition-colors";
    const stack = hasError ? "z-[15] focus-within:z-[30]" : "focus-within:z-[30]";
    const color = hasError ? "border-red-300" : "border-gray-300";
  
    if (where === "top")    return `${base} ${stack} border ${color} rounded-t-lg`;
    if (where === "mid")    return `${base} ${stack} border-l border-r border-t ${color} -mt-px`;
    /* bottom */            return `${base} ${stack} border ${color} -mt-px rounded-b-lg`;
  };
  
  const ringClass = (hasError: boolean, where: "top" | "mid" | "bottom") =>
    [
      "pointer-events-none absolute -inset-[0px] ring-1 z-10",
      hasError
        // ERRO: igual antes, sem glow e sempre visível
        ? "ring-red-400 opacity-100"
        // NORMAL: borda azul + glow suave só quando focado
        : "ring-[#4c9ffe] opacity-0 group-focus-within:opacity-100 group-focus-within:shadow-[0_0_0_4px_rgba(76,159,254,0.2)]",
      "transition-[opacity,box-shadow] duration-0",
      where === "top" ? "rounded-t-lg" : where === "bottom" ? "rounded-b-lg" : "rounded-none",
    ].join(" ");

  // primeira mensagem (para mostrar abaixo do grupo)
  const groupError = emailError || nameError || phoneError;

  // 1) State para guardar o client_secret (mantém o seu)
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const setupInitTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    // zera o clientSecret quando trocar de plano (annual/monthly)
    setClientSecret(null);

    const IS_DEV =
      typeof import.meta !== "undefined" ? !!import.meta.env.DEV : process.env.NODE_ENV !== "production";
    const delayMs = IS_DEV ? 250 : 0;

    const ac = new AbortController();

    if (setupInitTimerRef.current) {
      clearTimeout(setupInitTimerRef.current);
      setupInitTimerRef.current = null;
    }

    setupInitTimerRef.current = window.setTimeout(async () => {
      try {
        const base = import.meta.env.VITE_N8N_BASE || "https://n8n.dalzzen.com/webhook";

        const res = await fetch(`${base}/billing/setup_init`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key":
              "ZT6^HNWHJ6$dV8n5T6V7tioSzZ!W9BxHz#YZu5Si%Y8QUzd%TREEVADN@KDU@Pmz55uF!kKNMjG&g7f^nVEMxUqahCozK7%yZgFoMvis&8wf8Zvyhw&7kguxteBhqbDM",
          },
          // ✅ envia o plano atual para o n8n
          body: JSON.stringify({
            usage: "off_session",
            plan, // "annual" | "monthly"
          }),
          signal: ac.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ac.signal.aborted) return;

        const cs: string | undefined = data?.client_secret;
        if (!cs) throw new Error("Resposta sem client_secret.");

        setClientSecret(cs);
        (window as any).__CLIENT_SECRET__ = cs; // opcional para debug
      } catch (err) {
        if (ac.signal.aborted) return;
        console.error("[Checkout] Erro no setup_init:", err);
      }
    }, delayMs);

    return () => {
      if (setupInitTimerRef.current) {
        clearTimeout(setupInitTimerRef.current);
        setupInitTimerRef.current = null;
      }
      ac.abort();
    };
  }, [plan]); // 👈 depende do plano selecionado

  // 3) Memoiza as opções do Elements (evita re-mount)
  const elementsOptions = React.useMemo<StripeElementsOptions>(() => {
  const appearance = {
    theme: 'stripe',
    labels: 'above',
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      fontFamily: 'Ideal Sans, system-ui, sans-serif',
      borderRadius: '8px',
    },
  };

  // ✅ Quando usamos client_secret, NÃO podemos passar mode/amount/currency
  return {
    clientSecret: clientSecret!,
    locale: "pt-BR",
    appearance,
   };
  }, [clientSecret]);

  React.useEffect(() => {
    if (lookup.hasActive && uiState !== "success") {
      window.scrollTo({ top: 0, behavior: "auto" });
      setShowDetails(false);
    }
  }, [lookup.hasActive, uiState]);

  const onApplyCoupon = React.useCallback(async (code: string) => {
    // Map dos produtos por plano
    const PRODUCT_ANNUAL  = "prod_T2PHY72W240SPT";
    const PRODUCT_MONTHLY = "prod_T2PFiGU2QtGzY4";

    // Decide o produto a partir do plano atual
    const productId = isAnnual ? PRODUCT_ANNUAL : PRODUCT_MONTHLY;

    try {
      const resp = await fetch("https://n8n.dalzzen.com/webhook/promo/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "ZT6^HNWHJ6$dV8n5T6V7tioSzZ!W9BxHz#YZu5Si%Y8QUzd%TREEVADN@KDU@Pmz55uF!kKNMjG&g7f^nVEMxUqahCozK7%yZgFoMvis&8wf8Zvyhw&7kguxteBhqbDM"
        },
        body: JSON.stringify({
          code,
          mode: "subscription",
          productId,
          plan: isAnnual ? "annual" : "monthly"
        })
      }).then(r => r.json());

      if (!resp.ok) return { ok: false, message: resp.message || "Código inválido." };

      const p = Number(resp.discount);
      setApplied(Number.isFinite(p) ? { code, percentOff: p } : { code });
      return { ok: true };
    } catch {
      return { ok: false, message: "Erro ao validar o cupom." };
    }
  }, [isAnnual]);

  // Pega data da cobrança
  const trialDays = isAnnual ? 7 : 0;
  const chargeDateStr = useMemo(() => {
    const tz = "America/Sao_Paulo";
    const now = new Date();
    const todayLocal = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    todayLocal.setDate(todayLocal.getDate() + trialDays);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz, day: "2-digit", month: "long", year: "numeric",
    }).format(todayLocal);
  }, [trialDays]);

  // preço cheio anual (em centavos) — fixo
  const FULL_PRICE = isAnnual ? 11880 : 1990; // valores em centavos
  const NEXT_INVOICE_MONTHLY_CENTS = 1990;

  type AppliedCoupon = {
    code: string;
    percentOff?: number;   // ex.: 20
    amountOff?: number;    // em centavos (se for valor fixo)
  };

  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const hasCouponApplied = Boolean(applied?.code);
  const fmtBRL = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const discountValueCents = useMemo(() => {
    if (!applied) return 0;
    if (applied.amountOff != null) return applied.amountOff;
    if (applied.percentOff != null) return Math.round(FULL_PRICE * (applied.percentOff / 100));
    return 0;
  }, [applied, FULL_PRICE]);

  const subtotalAfterCents = Math.max(FULL_PRICE - discountValueCents, 0);

// --- dentro do seu componente CheckoutPage ---
const exitFiredRef = React.useRef(false);

// monta o payload com os dados atuais do formulário/checkout
const buildExitPayload = React.useCallback(() => {
  const emailTrim = email.trim();
  const phoneDigits = phone.replace(/\D/g, "");

  const emailValid = gmailRegex.test(emailTrim);
  const phoneValid = phoneDigits.length >= 10; // 10+ dígitos (fixo) ou 11 (cel)

  return {
    plan,                             // "annual" | "monthly"
    name: name.trim() || undefined,   // manda se tiver
    email: emailValid ? emailTrim : undefined,
    phone: phoneValid ? phoneDigits : undefined,
    coupon: applied?.code ?? undefined,
    hasActive: lookup?.hasActive ?? false,
    uiState,
    userAgent: navigator.userAgent,
  };
}, [plan, name, email, phone, applied?.code, lookup?.hasActive, uiState, gmailRegex]);

const fireExitOnce = React.useCallback((reason: string) => {
  // 1) não envia nada após sucesso
  if (uiState === "success") return;

  // ignora visibilitychange no desktop
  const isIOS = /\b(iPad|iPhone|iPod)\b/i.test(navigator.userAgent);
  if (reason === "visibilitychange-hidden" && !isIOS) return;

  // 2) ignora o unmount “de teste” do StrictMode (dev)
  const aliveMs = Date.now() - mountedAtRef.current;
  if (reason === "unmount" && aliveMs < 2000) return;

  // 3) regra que você pediu:
  //    precisa ter AO MENOS e-mail VÁLIDO ou telefone VÁLIDO.
  //    se só nome estiver preenchido, NÃO envia.
  const emailTrim = email.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  const emailValid = gmailRegex.test(emailTrim);
  const phoneValid = phoneDigits.length >= 10;

  if (!emailValid && !phoneValid) {
    // nada válido pra identificar → não dispara
    return;
  }

  // 4) de-duplica
  if (exitFiredRef.current) return;

  emitCheckoutExit(buildExitPayload(), reason);
  exitFiredRef.current = true;
}, [uiState, email, phone, buildExitPayload, gmailRegex]);

// 1) se a rota desmontar (sair do /checkout), dispara
React.useEffect(() => {
  return () => {
    // roda só quando o componente REALMENTE desmonta
    fireExitOnceRef.current("unmount");
  };
}, []);

// 2) interações do navegador: voltar, fechar aba, trocar de app etc.
React.useEffect(() => {
  const onPageHide = () => fireExitOnceRef.current("pagehide");
  const onBeforeUnload = () => fireExitOnceRef.current("beforeunload");
  const onPopState = () => fireExitOnceRef.current("popstate");

  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("popstate", onPopState);

  return () => {
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("beforeunload", onBeforeUnload);
    window.removeEventListener("popstate", onPopState);
  };
}, []);

// ponteiro estável para a função mais recente
const fireExitOnceRef = React.useRef<(reason: string) => void>(() => {});
React.useEffect(() => {
  fireExitOnceRef.current = fireExitOnce;
}, [fireExitOnce]);

// dentro do componente (mais um listener)
React.useEffect(() => {
  const onLoc = () => fireExitOnceRef.current("spa-navigation");
  window.addEventListener("locationchange", onLoc);
  return () => window.removeEventListener("locationchange", onLoc);
}, []);

// ref para debounce do visibilitychange
const visTimerRef = React.useRef<number | null>(null);

// detecção simples de iOS (Safari mobile)
const IS_IOS = /\b(iPad|iPhone|iPod)\b/i.test(navigator.userAgent);

// iOS somente, com debounce
React.useEffect(() => {
  if (!IS_IOS) return;

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      if (visTimerRef.current) window.clearTimeout(visTimerRef.current);
      visTimerRef.current = window.setTimeout(() => {
        if (document.visibilityState === "hidden") {
          fireExitOnceRef.current("visibilitychange-hidden");
        }
      }, 900);
    } else if (visTimerRef.current) {
      window.clearTimeout(visTimerRef.current);
      visTimerRef.current = null;
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    if (visTimerRef.current) window.clearTimeout(visTimerRef.current);
  };
}, []);

  useEffect(() => {
    if (!applied) return;
    setChipEnter(false);
    const id = requestAnimationFrame(() => setChipEnter(true));
    return () => cancelAnimationFrame(id);
  }, [applied?.code]);

  useEffect(() => {
    if (!applied) return;
    setChipEnter(false);
    const id = requestAnimationFrame(() => setChipEnter(true));
    return () => cancelAnimationFrame(id);
  }, [applied?.code]);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent));
  }, []);

  return (
    <div className="min-h-screen font-sans">
      {/* BG fixo mobile — só antes de pagar */}
      {uiState !== "success" && (
        <div className={`md:hidden fixed inset-0 -z-10 ${THEME_BG}`} />
      )}

      {/* Header mobile */}
      <header
        className={`md:hidden fixed top-0 inset-x-0 z-50 ${THEME_BG}
                    text-white flex items-center justify-between px-4 h-14`}
      >
        <div className="flex items-baseline">
          <span style={{ fontFamily: '"Lily Script One", cursive' }} className="text-[28px] leading-none">D</span>
          <span style={{ fontFamily: '"Lobster", cursive' }} className="text-[28px] leading-none">alzzen</span>
        </div>
        <button type="button" onClick={() => setShowDetails(v => !v)} className="inline-flex items-center gap-2">
          <span className="relative grid place-items-center w-[56px] h-5 leading-none text-sm">
            <span className={["absolute","transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",showDetails ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"].join(" ")}>Detalhes</span>
            <span className={["absolute","transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",showDetails ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"].join(" ")}>Fechar</span>
          </span>
          <svg className={["w-5 h-5 transform-gpu translate-y-[0.5px]","transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",showDetails ? "rotate-180" : "rotate-0"].join(" ")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </header>

      {showDetails && (
        <div
          className="fixed inset-0 bg-black/30 z-30 transition-opacity duration-300"
          onClick={() => setShowDetails(false)}
        />
      )}

      {/* Painel de Detalhes — mobile */}
      <div
        className={`md:hidden fixed inset-x-0 z-40 transform-gpu transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showDetails ? "translate-y-0" : "-translate-y-full"
        } top-[calc(3.5rem-1px)]`}
      >
        <div className={`${THEME_BG} text-white`}>
          <div className="px-4 py-4">
            <div className="flex gap-3">
              <div className="col-start-1 row-start-1 row-span-2 w-10 h-10 bg-gradient-to-r from-blue-500 to-green-600 rounded-md flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
            
              <div className="flex-1 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium leading-tight">
                    {`Agenda AI - ${isAnnual ? "Anual" : "Mensal"}`}
                  </p>
                  {!isAnnual && (
                    <p className="text-xs text-[#FFFFFF80] mt-1">Cobrado mensalmente</p>
                  )}
                </div>
            
                <div className="text-right leading-tight self-start">
                  {isAnnual ? (
                    <>
                      <p className="text-sm font-semibold">7 dias grátis</p>
                      <p className="text-xs font-medium text-[#FFFFFF80]">
                        Depois {fmtBRL(subtotalAfterCents)}/ano
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium">{fmtBRL(subtotalAfterCents)}</p>
                  )}
                </div>
              </div>
            </div>
      
            <hr className="my-4 border-white/20 ml-[52px]" />
      
            <div className="pl-[52px]">
              {/* ===== Subtotal + Cupom + hr ===== */}
              {uiState !== "success" ? (
                <div className={uiState === "fading" ? "animate-fadeOut" : "animate-fadeIn"}>
                  {/* Subtotal (antes de pagar) */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subtotal</span>
                    <span className="text-sm font-medium">{fmtBRL(FULL_PRICE)}</span>
                  </div>
      
                  {/* Cupom (antes de pagar) */}
                  <div className={`mt-3 ${couponLocked ? "pointer-events-none opacity-60 select-none" : ""}`}>
                    {!applied ? (
                      <CouponToggle ref={couponRefMobile} onApply={onApplyCoupon} />
                    ) : (
                      <div
                        key={`applied-mobile-${applied.code}`}
                        className={`transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          exiting ? "opacity-0 translate-y-1.5" : "opacity-100 translate-y-0"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`inline-flex h-9 items-center gap-2 rounded-md bg-white/15 px-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              chipEnter ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-90"
                            }`}
                          >
                            <Tag className="w-3.5 h-3.5 text-white/90" />
                            <span className="text-white font-semibold text-sm tracking-wide mr-2">
                              {applied.code}
                            </span>
      
                            {/* botão remover SÓ no pré-sucesso */}
                            <button
                              type="button"
                              aria-label="Remover cupom"
                              disabled={removing}
                              onClick={() => {
                              if (couponLocked) return;                
                              setShowDetails(true);
                              setTimeout(() => couponRefMobile.current?.open(), 200);
                                if (removing) return;
                                setRemoving(true);
                                const REMOVE_TOTAL_MS = 1200;
                                const EXIT_MS = 300;
                                setTimeout(() => setExiting(true), REMOVE_TOTAL_MS - EXIT_MS);
                                setTimeout(() => {
                                  setApplied(null);
                                  setRemoving(false);
                                  setExiting(false);
                                }, REMOVE_TOTAL_MS);
                              }}
                              className="group flex items-center justify-center"
                            >
                              {removing ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
                                  <path
                                    className="opacity-80"
                                    d="M22 12a10 10 0 0 1-10 10"
                                    stroke="white"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              ) : (
                                <X className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
                              )}
                            </button>
                          </div>
      
                          {removing ? (
                            <div className="relative w-16 h-6 rounded-md overflow-hidden bg-white/20">
                              <div
                                key={`sheen-mobile-${applied.code}`}
                                className="absolute inset-y-0 -left-6 w-[140%] opacity-90"
                                style={{
                                  background:
                                    "linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0) 100%)",
                                  filter: "blur(1px)",
                                  mixBlendMode: "screen",
                                  animation: "stripe-sheen 0.55s linear infinite",
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className={`text-right font-medium text-sm text-[#ffffff80] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                chipEnter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                              }`}
                              style={{ transitionDelay: chipEnter ? "50ms" : "0ms" }}
                            >
                              -{fmtBRL(discountValueCents)}
                            </div>
                          )}
                        </div>
      
                        <p
                          className={`mt-1 text-xs text-[#ffffff80] transition-all duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            chipEnter ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-0.5"
                          }`}
                          style={{ transitionDelay: chipEnter ? "140ms" : "0ms" }}
                        >
                          {applied.percentOff != null
                            ? `${applied.percentOff}% de desconto`
                            : applied.amountOff != null
                            ? `${fmtBRL(applied.amountOff)} de desconto`
                            : `Cupom aplicado`}
                        </p>
                      </div>
                    )}
                  </div>
      
                  <hr className="my-4 border-white/20" />
                </div>
              ) : (
                /* === Tela de sucesso: mostra Subtotal + cupom (sem X) somente se houver cupom === */
                applied ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="text-sm font-medium">{fmtBRL(FULL_PRICE)}</span>
                    </div>
      
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <div className="inline-flex h-9 items-center gap-2 rounded-md bg-white/15 px-3">
                          <Tag className="w-3.5 h-3.5 text-white/90" />
                          <span className="text-white font-semibold text-sm tracking-wide mr-2">
                            {applied.code}
                          </span>
                          {/* sem botão de remover na confirmação */}
                        </div>
      
                        <div className="text-right font-medium text-sm text-[#ffffff80]">
                          -{fmtBRL(discountValueCents)}
                        </div>
                      </div>
      
                      <p className="mt-1 text-xs text-[#ffffff80]">
                        {applied.percentOff != null
                          ? `${applied.percentOff}% de desconto`
                          : applied.amountOff != null
                          ? `${fmtBRL(applied.amountOff)} de desconto`
                          : `Cupom aplicado`}
                      </p>
                    </div>
      
                    <hr className="my-4 border-white/20" />
                  </div>
                ) : null
              )}
              {/* ===== /Subtotal + Cupom + hr ===== */}
      
              {/* Totais — SEMPRE visíveis */}
              {isAnnual ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total após período de avaliação</span>
                  <span className="text-sm font-medium">{fmtBRL(subtotalAfterCents)}</span>
                </div>
              ) : (
                hasCouponApplied && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Próxima fatura</span>
                    <span className="text-sm font-medium">{fmtBRL(NEXT_INVOICE_MONTHLY_CENTS)}</span>
                  </div>
                )
              )}
      
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold">Total devido hoje</span>
                <span className="text-base font-semibold">
                  {isAnnual ? "R$ 0,00" : fmtBRL(subtotalAfterCents)}
                </span>
              </div>
            </div>
      
            <div className="pb-[max(env(safe-area-inset-bottom),16px)]" />
          </div>
        </div>
      </div>

      {/* Layout em duas colunas */}
      <main
        className={`flex flex-col lg:flex-row ${
          uiState === "success"
            ? "min-h-[100dvh] pt-0 md:pt-0"
            : "min-h-screen pt-14 md:pt-0"
        }`}
        >
        {/* COLUNA ESQUERDA */}
        <aside
          className={`w-full lg:w-1/2 px-6 lg:px-10 flex text-white
            ${uiState === "success" ? "py-2 lg:py-8" : "py-8"}
            ${THEME_BG}`}
        >
          <style>{`@keyframes stripe-sheen { 
            0% { transform: translateX(-120%) skewX(18deg);}  
            100% { transform: translateX(120%) skewX(18deg);} 
          }`}</style>
        
          {/* MOBILE — some após pagamento confirmado */}
          {uiState !== "success" && (
            <div
              className={`lg:hidden relative w-full max-w-[420px] mx-auto pt-0 mb-0 ${
                uiState === "fading" ? "animate-fadeOut" : "animate-fadeIn"
              }`}
            >
              <div className="mb-4 flex justify-center">
                <div className="w-32 h-32 rounded-lg bg-gradient-to-r from-blue-500 to-green-600 flex items-center justify-center shadow-md shadow-black/10">
                  <Calendar className="w-16 h-16 text-white" />
                </div>
              </div>
        
              <div className="text-center mb-0 pt-0">
                <p className="text-[#ffffff99] text-base mb-0 font-medium">
                  {isAnnual ? "Testar Agenda AI - Anual" : "Assinar Agenda AI - Mensal"}
                </p>
              
                {isAnnual ? (
                  <>
                    <h1 className="text-[30px] font-bold mb-0">7 dias grátis</h1>
                    <p className="text-[#ffffff99] text-sm font-medium leading-snug">
                      Depois, <span className="font-bold">{fmtBRL(subtotalAfterCents)}</span> por ano começando em {chargeDateStr}
                    </p>
                  </>
                ) : (
                  <>
                    {/* R$ 19,90 com “por / mês” quebrado ao lado */}
                    <h1 className="text-[30px] font-semibold mb-0">
                      <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap align-top">
                        <span>{fmtBRL(subtotalAfterCents)}</span>
                        <span className="text-[14px] font-semibold leading-none text-[#ffffff99] -translate-y-[2px]">
                          {"por\u00A0mês"}
                        </span>
                      </span>
                    </h1>
                    {/* no mensal não mostra a linha “Depois…” */}
                  </>
                )}
              </div>
        
              <div className="flex justify-center mt-2">
              <button
                type="button"
                disabled={couponLocked}
                onClick={() => {
                  setShowDetails(true);
                  if (!couponLocked) {
                    setTimeout(() => couponRefMobile.current?.open(), 200); // só abre o campo se não estiver bloqueado
                  }
                }}
                className={`w-40 h-10 px-3 text-white text-sm font-medium inline-flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-md ${
                  couponLocked ? "opacity-50 cursor-default pointer-events-none" : ""
                }`}
              >
                <span>Adicionar código</span>
                <svg className="w-5 h-5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              </div>
            </div>
          )}
        
          {/* DESKTOP */}
          <div className="hidden lg:block w-full lg:max-w-[420px] lg:ml-auto">
            <div className="mb-6 mt-4">
              <div className="flex items-baseline group cursor-default">
                <span
                  style={{ fontFamily: '"Lily Script One", cursive' }}
                  className="text-white text-3xl leading-none"
                >
                  D
                </span>
                <span
                  style={{ fontFamily: '"Lobster", cursive' }}
                  className="text-white text-3xl leading-none"
                >
                  alzzen
                </span>
              </div>
            </div>
          
            <div className="mb-6">
              <p className="text-[#ffffff99] text-base mb-1 font-semibold">
                {isAnnual ? "Testar Agenda AI - Anual" : "Assinar Agenda AI - Mensal"}
              </p>
            
              {isAnnual ? (
                <>
                  <h1 className="text-4xl font-bold mb-2">7 dias grátis</h1>
                  <p className="text-[#ffffff99] text-sm font-semibold">
                    Depois, <span className="text-sm font-bold">{fmtBRL(subtotalAfterCents)}</span> por ano começando em {chargeDateStr}
                  </p>
                </>
              ) : (
              <h1 className="text-4xl font-semibold mb-2">
                <span className="inline-flex items-start align-top">
                  <span>{fmtBRL(subtotalAfterCents)}</span>
                  <span className="ml-2 grid grid-rows-2 text-3xl font-semibold text-[#ffffff99] leading-none">
                    <span className="text-[0.5em] leading-[1.5]">por</span>
                    <span className="text-[0.5em] leading-[1]">mês</span>
                  </span>
                </span>
              </h1>
              )}
            </div>
          
            <div className="bg-white/0 backdrop-blur-sm rounded-lg pl-0 pr-4 py-4 mb-6">
              <div className="grid grid-cols-[2.5rem_1fr_auto] gap-x-3 items-start">
                <div className="col-start-1 row-start-1 row-span-2 w-10 h-10 bg-gradient-to-r from-blue-500 to-green-600 rounded-md flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
          
                <p className="col-start-2 text-sm font-medium leading-tight">
                  {`Agenda AI - ${isAnnual ? "Anual" : "Mensal"}`}
                </p>
                {!isAnnual && (
                  <p className="col-start-2 text-xs text-[#FFFFFF80] mt-1">Cobrado mensalmente</p>
                )}
                <div className="col-start-3 row-start-1 self-start text-right">
                  {isAnnual ? (
                    <>
                      <p className="text-sm font-medium">7 dias grátis</p>
                      <p className="text-xs text-[#ffffff80]">Depois {fmtBRL(subtotalAfterCents)}/ano</p>
                    </>
                  ) : (
                    <p className="text-sm font-semibold">{fmtBRL(subtotalAfterCents)}</p>
                  )}
                </div>
                          
                <hr className="col-start-2 col-span-2 my-4 border-white/20" />
          
                {/* ===== Subtotal + Cupom + hr ===== */}
                {uiState !== "success" ? (
                  <>
                    {/* Subtotal (antes de pagar) */}
                    <p
                      className={`col-start-2 text-white font-medium text-sm ${
                        uiState === "fading" ? "animate-fadeOut" : "animate-fadeIn"
                      }`}
                    >
                      Subtotal
                    </p>
                    <p
                      className={`col-start-3 text-right font-medium text-sm ${
                        uiState === "fading" ? "animate-fadeOut" : "animate-fadeIn"
                      }`}
                    >
                      {fmtBRL(FULL_PRICE)}
                    </p>
          
                    {/* Cupom (antes de pagar) */}
                    <div className={`col-start-2 col-end-4 ${couponLocked ? "pointer-events-none opacity-60 select-none" : ""}`}>
                      {!applied ? (
                        <CouponToggle onApply={onApplyCoupon} />
                      ) : (
                        <div
                          key={`applied-desktop-${applied.code}`}
                          className={`mt-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                            exiting ? "opacity-0 translate-y-1.5" : "opacity-100 translate-y-0"
                          } ${uiState === "fading" ? "animate-fadeOut" : "animate-fadeIn"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`inline-flex h-9 items-center gap-2 rounded-md bg-white/15 px-3 will-change-transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                chipEnter ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-90"
                              }`}
                            >
                              <Tag className="w-3.5 h-3.5 text-white/90" />
                              <span className="text-white font-semibold text-sm tracking-wide mr-2">
                                {applied.code}
                              </span>
                    
                              {/* Botão remover SÓ no pré-sucesso */}
                              <button
                                type="button"
                                aria-label="Remover cupom"
                                disabled={removing || couponLocked}
                                onClick={() => {
                                  if (removing || couponLocked) return;     // <-- trava aqui
                                  setRemoving(true);
                                  const REMOVE_TOTAL_MS = 1200;
                                  const EXIT_MS = 300;
                                  setTimeout(() => setExiting(true), REMOVE_TOTAL_MS - EXIT_MS);
                                  setTimeout(() => {
                                    setApplied(null);
                                    setRemoving(false);
                                    setExiting(false);
                                  }, REMOVE_TOTAL_MS);
                                }}
                                className={`group flex items-center justify-center ${couponLocked ? "opacity-60" : ""}`}
                              >
                                {removing ? (
                                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
                                    <path className="opacity-80" d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                  </svg>
                                ) : (
                                  <X className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
                                )}
                              </button>
                            </div>
                    
                            {removing ? (
                              <div className="relative w-16 h-6 rounded-md overflow-hidden bg-white/20">
                                <div
                                  key={`sheen-desktop-${applied.code}`}
                                  className="absolute inset-y-0 -left-6 w-[140%] opacity-90"
                                  style={{
                                    background:
                                      "linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0) 100%)",
                                    filter: "blur(1px)",
                                    mixBlendMode: "screen",
                                    animation: "stripe-sheen 0.55s linear infinite",
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className={`text-right font-medium text-sm text-[#ffffff80] will-change-transform transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                  chipEnter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                                }`}
                                style={{ transitionDelay: chipEnter ? "50ms" : "0ms" }}
                              >
                                -{fmtBRL(discountValueCents)}
                              </div>
                            )}
                          </div>
                    
                          <p
                            className={`mt-1 text-xs text-[#ffffff80] will-change-transform transition-all duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              chipEnter ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-0.5"
                            }`}
                            style={{ transitionDelay: chipEnter ? "140ms" : "0ms" }}
                          >
                            {applied.percentOff != null
                              ? `${applied.percentOff}% de desconto`
                              : applied.amountOff != null
                              ? `${fmtBRL(applied.amountOff)} de desconto`
                              : `Cupom aplicado`}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <hr
                      className={`col-start-2 col-span-2 my-4 border-white/20 ${
                        uiState === "fading" ? "animate-fadeOut" : "animate-fadeIn"
                      }`}
                    />
                  </>
                ) : (
                  /* === Tela de sucesso: mostra Subtotal + cupom (sem X) somente se houver cupom === */
                  applied ? (
                    <>
                      <p className="col-start-2 text-white font-medium text-sm">Subtotal</p>
                      <p className="col-start-3 text-right font-medium text-sm">{fmtBRL(FULL_PRICE)}</p>
          
                      <div className="col-start-2 col-end-4 mt-4">
                        <div className="flex items-center justify-between">
                          <div className="inline-flex h-9 items-center gap-2 rounded-md bg-white/15 px-3">
                            <Tag className="w-3.5 h-3.5 text-white/90" />
                            <span className="text-white font-semibold text-sm tracking-wide mr-2">
                              {applied.code}
                            </span>
                            {/* sem botão de remover na confirmação */}
                          </div>
          
                          <div className="text-right font-medium text-sm text-[#ffffff80]">
                            -{fmtBRL(discountValueCents)}
                          </div>
                        </div>
          
                        <p className="mt-1 text-xs text-[#ffffff80]">
                          {applied.percentOff != null
                            ? `${applied.percentOff}% de desconto`
                            : applied.amountOff != null
                            ? `${fmtBRL(applied.amountOff)} de desconto`
                            : `Cupom aplicado`}
                        </p>
                      </div>
          
                      <hr className="col-start-2 col-span-2 my-4 border-white/20" />
                    </>
                  ) : null
                )}
                
                {/* ===== /Subtotal + Cupom + hr ===== */}
                {isAnnual ? (
                  <>
                    <p className="col-start-2 text-white font-medium text-sm">
                      Total após período de avaliação
                    </p>
                    <p className="col-start-3 text-right font-medium text-sm">
                      {fmtBRL(subtotalAfterCents)}
                    </p>
                  </>
                ) : (
                  hasCouponApplied && (
                    <>
                      <p className="col-start-2 text-white font-medium text-sm">
                        Próxima fatura
                      </p>
                      <p className="col-start-3 text-right font-medium text-sm">
                        {fmtBRL(NEXT_INVOICE_MONTHLY_CENTS)}
                      </p>
                    </>
                  )
                )}
                
                <p className="col-start-2 text-white font-semibold text-sm">Total devido hoje</p>
                <p className="col-start-3 text-right font-semibold text-base">
                  {isAnnual ? "R$ 0,00" : fmtBRL(subtotalAfterCents)}
                </p>
                
              </div>
            </div>
          </div>
        </aside>

        {/* COLUNA DIREITA */}
        <section
          className={`w-full lg:w-1/2 bg-white px-3 md:px-6 lg:px-10 py-8 flex items-start justify-start ${
            (uiState === "success" || lookup.hasActive) ? "min-h-0" : "min-h-screen"
          }`}
        >
          <div className="w-full md:max-w-sm mx-3 md:mx-auto lg:mx-0 lg:ml-10 rounded-lg p-0">
        
            {/* >>> Forms <<< */}
            {uiState !== "success" ? (
              lookup.hasActive ? (
                <section
                  aria-live="polite"
                  // removi: bg-white + border + rounded + shadow
                  className="w-full max-w-[520px] -ml-2 lg:ml-0 mx-auto p-0 md:p-0 mt-0 lg:mt-4 mb-12 md:mb-12"
                >
                  <h2 className="text-[20px] font-semibold text-[#1A1A1AE6]">
                    Você já tem uma assinatura conosco
                  </h2>
                  <p className="text-[14px] text-[#1A1A1AB2] -mt-1">
                    Você também pode gerenciar sua assinatura.
                  </p>
              
                  <label htmlFor="existing-email" className="block text-[13px] font-medium text-[#1A1A1AB2] mt-6">
                    E-mail
                  </label>
                  <input
                    id="existing-email"
                    type="email"
                    value={trimmedEmail}
                    disabled
                    readOnly
                    className="mt-1 w-[358px] h-[48px] md:h-[38px] lg:w-[380px] px-3 rounded-md
                               border border-gray-300 border-[1px]
                               bg-[#E7E7E7]
                               text-[16px] md:text-[14px] text-gray-500 disabled:text-gray-400
                               placeholder:text-gray-500
                               disabled:opacity-100
                               shadow-[0_4px_10px_-8px_rgba(0,0,0,0.16)]"
                  />
              
                  <div className="mt-9 space-y-5 md:space-y-5">
                    <a
                      href={lookup.portalUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-[358px] md:w-[380px] h-[44px] md:h-11 rounded-md text-white font-medium transition
                                 bg-[#2563EB] hover:bg-[#1D4ED8]          
                                 shadow-[0_10px_18px_-14px_rgba(99,91,255,0.35)]" 
                    >
                      Gerenciar assinatura
                    </a>
              
                    <button
                      type="button"
                      onClick={resetLookupToCheckout}
                      className="inline-flex items-center justify-center w-[358px] lg:w-[380px] h-[40px] md:h-10 rounded-md border border-gray-300 border-[1px] bg-white text-[14px] text-[#1A1A1AE6] font-xs hover:bg-gray-50 transition
                                 shadow-[0_4px_10px_-8px_rgba(0,0,0,0.16)]"         // sombra MAIS FRACA
                    >
                      Fazer checkout com um e-mail diferente
                    </button>
                  </div>
                </section>
              ) : (
                /* ====== FLUXO NORMAL: SEUS CAMPOS + PAGAMENTO ====== */
                <div className={uiState === "fading" ? "animate-fadeOut" : "animate-fadeIn"}>
                  <h2 className="hidden md:block text-xl font-medium text-gray-900 md:mb-4 md:mt-4 -mx-2 lg:mx-0">
                    Inserir detalhes de pagamento
                  </h2>
        
                  {/* Dados de cadastro */}
                  <div
                    className="mb-4 transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]
                               opacity-100 translate-y-0 relative z-[10]"
                  >
                    <h3 className="text-[13px] font-medium text-gray-500 mb-1 -ml-2 lg:ml-0">
                      Dados de cadastro
                    </h3>
        
                    {/* mobile: aproxima um pouco das laterais; desktop normal */}
                    <div className="-mx-[9px] lg:mx-0 lg:w-[calc(412px-32px)]">
                      {/* container sem overflow-hidden para o ring “sair” */}
                      <div className="rounded-lg bg-white isolate">
                        {/* NOME */}
                        <div className="p-0">
                          <div className={rowClass(!!nameError, "top")}>
                            <div className="flex items-center px-3 md:px-2 py-2 md:py-1.5">
                              <div className="w-[18px] h-[18px] md:w-4 md:h-4 flex-shrink-0 text-gray-400">
                                <div>
                                  <UserRound className="w-4 h-4 md:w-4 md:h-4" strokeWidth={2.4} />
                                </div>
                              </div>
        
                              <input
                                type="text"
                                placeholder="Nome"
                                value={name}
                                maxLength={50}
                                onChange={(e) => setName(e.target.value)}
                                onFocus={() => setFocused((f) => ({ ...f, name: true }))}
                                onBlur={() => {
                                  setFocused((f) => ({ ...f, name: false }));
                                  setTouched((t) => ({ ...t, name: true }));
                                }}
                                className={[
                                  "w-full bg-transparent ml-2 outline-none",
                                  "h-7 md:h-[26px] text-[16px] md:text-sm leading-tight",
                                  nameError
                                    ? "text-red-700 placeholder-red-400 caret-red-600"
                                    : "text-gray-900 placeholder-gray-400 caret-blue-600",
                                ].join(" ")}
                              />
        
                              {/* trigger/tooltip — abre só no “i” */}
                              <div className="relative flex-shrink-0 ml-2">
                                <button
                                  type="button"
                                  aria-describedby="tip-name"
                                  className={[
                                    "ml-2 text-[14px] lg:text-[16px] leading-none select-none focus:outline-none peer cursor-default",
                                    nameError ? "text-red-500" : "text-gray-400",
                                  ].join(" ")}
                                >
                                  ⓘ
                                </button>
        
                                <div
                                  id="tip-name"
                                  role="tooltip"
                                  className={`absolute right-0 w-56 bg-white text-gray-700 text-sm rounded-lg shadow-lg px-3 py-2
                                              opacity-0 transition-opacity pointer-events-none z-50${
                                                !nameError
                                                  ? " peer-hover:opacity-100 peer-focus-visible:opacity-100"
                                                  : ""
                                              }`}
                                >
                                  Nome que o agente vai usar pra conversar com você.
                                </div>
                              </div>
                            </div>
        
                            {/* ring por cima (último filho) */}
                            <span aria-hidden className={ringClass(!!nameError, "top")} />
                          </div>
                        </div>
        
                        {/* EMAIL */}
                        <div className="p-0">
                          <div className={rowClass(!!emailError, "mid")}>
                            <div className="flex items-center px-3 md:px-2 py-2 md:py-1.5">
                              <div className="w-[18px] h-[18px] md:w-4 md:h-4 flex-shrink-0 text-gray-400">
                                <div>
                                  <Mail className="w-4 h-4 md:w-4 md:h-4" strokeWidth={2.4} />
                                </div>
                              </div>
        
                              <input
                                type="email"
                                placeholder="email@gmail.com"
                                value={email}
                                maxLength={50}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocused((f) => ({ ...f, email: true }))}
                                onBlur={() => {
                                  setFocused((f) => ({ ...f, email: false }));
                                  setTouched((t) => ({ ...t, email: true }));
                                }}
                                className={[
                                  "w-full bg-transparent ml-2 outline-none",
                                  "h-7 md:h-[26px] text-[16px] md:text-sm leading-tight",
                                  emailError
                                    ? "text-red-700 placeholder-red-400 caret-red-600"
                                    : "text-gray-900 placeholder-gray-400 caret-blue-600",
                                ].join(" ")}
                              />
        
                              {/* trigger/tooltip — abre só no “i” */}
                              <div className="relative flex-shrink-0 ml-2">
                                <button
                                  type="button"
                                  aria-describedby="tip-email"
                                  className={[
                                    "ml-2 text-[14px] lg:text-[16px] leading-none select-none focus:outline-none peer cursor-default",
                                    emailError ? "text-red-500" : "text-gray-400",
                                  ].join(" ")}
                                >
                                  ⓘ
                                </button>
        
                                <div
                                  id="tip-email"
                                  role="tooltip"
                                  className={`absolute right-0 w-56 bg-white text-gray-700 text-sm rounded-lg shadow-lg px-3 py-2
                                              opacity-0 transition-opacity pointer-events-none z-50${
                                                !emailError
                                                  ? " peer-hover:opacity-100 peer-focus-visible:opacity-100"
                                                  : ""
                                              }`}
                                >
                                  Usamos o Gmail para vincular com o Calendar.
                                </div>
                              </div>
                            </div>
        
                            {/* ring por cima */}
                            <span aria-hidden className={ringClass(!!emailError, "mid")} />
                          </div>
                        </div>
        
                        {/* TELEFONE */}
                        <div className="p-0">
                          <div className={rowClass(!!phoneError, "bottom")}>
                            <div className="flex items-center px-3 md:px-2 py-2 md:py-1.5">
                              <div className="w-[20px] h-[16px] flex items-center justify-center">
                                <img
                                  src="https://js.stripe.com/v3/fingerprinted/img/FlagIcon-BR-36784f2b8710431a9b536b7224da0eba.svg"
                                  alt="Brasil"
                                  className="w-full h-full object-contain -mr-[0px]"
                                />
                              </div>
        
                              <input
                                type="tel"
                                placeholder="(11) 99123-4567"
                                value={phone}
                                inputMode="tel"
                                autoComplete="tel"
                                onChange={handlePhoneChange}
                                onFocus={() => setFocused((f) => ({ ...f, phone: true }))}
                                onBlur={() => {
                                  setFocused((f) => ({ ...f, phone: false }));
                                  setTouched((t) => ({ ...t, phone: true }));
                                }}
                                className={[
                                  "w-full bg-transparent ml-2 outline-none",
                                  "h-7 md:h-[26px] text-[16px] md:text-sm leading-tight",
                                  phoneError
                                    ? "text-red-700 placeholder-red-400 caret-red-600"
                                    : "text-gray-900 placeholder-gray-400 caret-blue-600",
                                ].join(" ")}
                              />
        
                              {/* trigger/tooltip — abre só no “i” */}
                              <div className="relative flex-shrink-0 ml-2">
                                <button
                                  type="button"
                                  aria-describedby="tip-phone"
                                  className={[
                                    "ml-2 text-[14px] lg:text-[16px] leading-none select-none focus:outline-none peer cursor-default",
                                    phoneError ? "text-red-500" : "text-gray-400",
                                  ].join(" ")}
                                >
                                  ⓘ
                                </button>
        
                                <div
                                  id="tip-phone"
                                  role="tooltip"
                                  className={`absolute right-0 w-56 bg-white text-gray-700 text-sm rounded-lg shadow-lg px-3 py-2
                                              opacity-0 transition-opacity pointer-events-none z-50${
                                                !phoneError
                                                  ? " peer-hover:opacity-100 peer-focus-visible:opacity-100"
                                                  : ""
                                              }`}
                                >
                                  Número que será utilizado para conversar com o agente.
                                </div>
                              </div>
                            </div>
        
                            {/* ring por cima */}
                            <span aria-hidden className={ringClass(!!phoneError, "bottom")} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
        
                  <HeightTransition>
                    <AnimatedErrors messages={contactErrors} />
                  </HeightTransition>
        
                  {/* Forma de pagamento */}
                  <div className="mb-4 -mx-[8px] lg:mx-0 lg:w-[calc(412px-32px)] transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-100 translate-y-0">
                    <h3 className="text-x2 font-medium text-gray-700 mb-2">Forma de pagamento</h3>
                    {clientSecret ? (
                      <Elements stripe={stripePromise} options={elementsOptions}>
                        <StripePaymentForm
                          contactValid={contactValid}
                          name={name}
                          email={email}
                          phone={phone}
                          onSuccess={(amt, br) => startSuccessTransition(amt, br)}
                          couponCode={applied?.code ?? null}
                          mode={isAnnual ? "annual" : "monthly"}
                        />
                      </Elements>
                    ) : (
                      <div className="p-4 border rounded-md text-sm text-gray-500">
                        Carregando formulário de pagamento…
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : null}
        
            {/* === SUCESSO === */}
            {uiState === "success" ? (
              <div className="mt-2 animate-fadeIn will-change-transform">
                <SuccessReceipt brand={receiptBrand} amountCents={receiptAmountCents} />
              </div>
            ) : null}
        
            {/* Rodapé */}
            <div className="flex justify-center items-center text-xs text-gray-400 mt-6 space-x-4">
              <span className="flex items-center space-x-1">
                <span>Powered by</span>
                <span className="flex items-baseline group cursor-default">
                  <span style={{ fontFamily: '"Lily Script One", cursive' }} className="text-gray-400 text-sm leading-none">D</span>
                  <span style={{ fontFamily: '"Lobster", cursive' }} className="text-gray-400 text-sm leading-none">alzzen</span>
                </span>
              </span>
              <span className="w-px h-4 bg-gray-300"></span>
              <a href="#" className="hover:underline">Termos</a>
              <a href="#" className="hover:underline">Privacidade</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CheckoutPage