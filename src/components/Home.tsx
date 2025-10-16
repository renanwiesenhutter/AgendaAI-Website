import React, { useState, useEffect, useRef } from 'react';
import { SiYoutube, SiWhatsapp, SiInstagram } from "react-icons/si";
import { Calendar, MessageCircle, CheckCircle, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, ChevronLeft, ChevronRight, ChevronDown, X, Menu } from 'lucide-react';
import { Link, useLocation } from "react-router-dom";

function Home() {
  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: 'image' | 'video', src: string } | null>(null);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const groupPlaying: Record<string, string | null> = {};
  const IS_IOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Scroll Para a Seção Correta
  const HEADER_OFFSET = 20; // ajuste conforme a altura real do seu header
  const location = useLocation();
  
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo(0, top); // <- teleporta direto, sem animação
      }
    }
  }, [location.hash]);

  // Loading Spinner
  function YTSpinner({ size = 44, stroke = 4, className = "" }: { size?: number; stroke?: number; className?: string }) {
    return (
      <>
        <style>{`
          @keyframes yt-rotate { 100% { transform: rotate(360deg); } }
          @keyframes yt-dash {
            0%   { stroke-dasharray: 1, 200;  stroke-dashoffset: 0; }
            50%  { stroke-dasharray: 100, 200; stroke-dashoffset: -15; }
            100% { stroke-dasharray: 100, 200; stroke-dashoffset: -125; }
          }
        `}</style>
  
        <svg
          width={size}
          height={size}
          viewBox="0 0 50 50"
          className={`animate-[yt-rotate_1.4s_linear_infinite] ${className}`}
          aria-label="Carregando"
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="animate-[yt-dash_1.4s_ease-in-out_infinite]"
          />
        </svg>
      </>
    );
  }

  // Native Video Player
  const openNativeFullscreenPlayer = React.useCallback(async (opts: { src: string; poster?: string }) => {
  const { src, poster } = opts;

  // overlay do spinner
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'black', display: 'grid',
    placeItems: 'center', zIndex: '2147483646'
  });
  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    width: '42px', height: '42px', border: '4px solid rgba(255,255,255,.25)',
    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
  });
  overlay.appendChild(spinner);
  document.body.appendChild(overlay);

  // estilo do spinner
  const style = document.createElement('style');
  style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  const v = document.createElement('video');
  v.src = src.replace(/#t=.*$/, '');       // evita fragmento de tempo na URL
  if (poster) v.poster = poster;
  v.muted = true;                           // ajuda autoplay em alguns devices
  v.controls = true; v.setAttribute('controls', '');
  v.preload = 'auto';                   // puxa duração mais cedo
  (v as any).controlsList = 'nodownload noplaybackrate noremoteplayback';
  (v as any).disablePictureInPicture = true;
  (v as any).playsInline = false;           // iOS: queremos o player nativo de tela cheia
  v.addEventListener('contextmenu', (e) => e.preventDefault());

  // ocupa a tela (fallback caso FS falhe)
  Object.assign(v.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
    background: 'black', zIndex: '2147483647', objectFit: 'contain', opacity: '0'
  });
  document.body.appendChild(v);

  const isIOSFS = typeof (v as any).webkitEnterFullscreen === 'function';

  const cleanup = () => {
    try { v.pause(); } catch {}
    try { v.remove(); } catch {}
    try { overlay.remove(); } catch {}
    try { style.remove(); } catch {}
    document.removeEventListener('fullscreenchange', onFsChange);
    (v as any).removeEventListener?.('webkitendfullscreen', onIosEndFs as any);
  };
  const onFsChange = () => { if (document.fullscreenElement !== v) cleanup(); };
  const onIosEndFs = () => cleanup();

  // 1) espere metadata (timeline pronta)
  await new Promise<void>((resolve) => {
    const ready = () => resolve();
    v.addEventListener('loadedmetadata', ready, { once: true });
    // fallback: se já veio muito rápido
    if (v.readyState >= 1) resolve();
  });

  // 2) tente reproduzir um pouquinho para já ter frame
  try { await v.play(); } catch {}

  // 3) só agora entre em fullscreen
  try {
    if (isIOSFS) {
      (v as any).addEventListener?.('webkitendfullscreen', onIosEndFs, { once: true } as any);
      try { (v as any).webkitEnterFullscreen(); } catch {}
    } else if (v.requestFullscreen) {
      await v.requestFullscreen();
      document.addEventListener('fullscreenchange', onFsChange);
    }
  } catch {}

  // 4) remova o overlay e revele o vídeo
  overlay.remove();
  v.style.opacity = '1';

  // 5) garanta playback após entrar em FS (alguns devices pausam)
  try { await v.play(); } catch {}
}, []);

// Image Player
function openFullscreen(type: "image", src: string) {
  setFullscreenMedia({ type, src });
}

// Steps Autoplay
function AutoPlayVideo({
  id,
  group = "steps",
  src,
  className = "",
  playThreshold = 0.65,
  margin = "-25% 0px -25% 0px",
  poster,
  preload = "metadata",
}: {
  id: string;
  group?: string;
  src: string;
  className?: string;
  playThreshold?: number;
  margin?: string;
  poster?: string;
  preload?: "none" | "metadata" | "auto";
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const [userPaused, setUserPaused] = React.useState(false);
  const [showOverlayIcon, setShowOverlayIcon] = React.useState(true);
  const [isReady, setIsReady] = React.useState(false);

  const claimingRef = React.useRef(false);
  const destroyedRef = React.useRef(false);

  // Preload do arquivo
  React.useEffect(() => {
    if (!src) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    // @ts-ignore
    link.fetchPriority = "high";
    link.href = src;
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch {}
    };
  }, [src]);

  // Pipeline inicial do <video>
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    destroyedRef.current = false;

    el.preload = "auto";
    el.muted = true;
    (el as any).playsInline = true;

    const onMeta = () => { !destroyedRef.current && setIsReady(true); };
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("loadeddata", onMeta);
    el.addEventListener("canplay", onMeta);
    try { el.load(); } catch {}

    return () => {
      destroyedRef.current = true;
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("loadeddata", onMeta);
      el.removeEventListener("canplay", onMeta);
    };
  }, [src]);

  // Pause quando outro do mesmo grupo tocar
  React.useEffect(() => {
    const onOtherPlay = (e: any) => {
      const d = e.detail || {};
      if (d.group === group && d.id !== id) {
        const el = videoRef.current;
        if (!el) return;
        el.pause();
        setShowOverlayIcon(true);
      }
    };
    window.addEventListener("autoplay-group-play", onOtherPlay as any);
    return () => window.removeEventListener("autoplay-group-play", onOtherPlay as any);
  }, [group, id]);

  // Helpers
  const waitUntil = (el: HTMLVideoElement, cond: () => boolean, ev: string) =>
    new Promise<void>((resolve) => {
      if (cond()) return resolve();
      const on = () => { if (cond()) { el.removeEventListener(ev, on); resolve(); } };
      el.addEventListener(ev, on);
    });

  const safePlayFromZero = async (el: HTMLVideoElement) => {
    if (!isReady || el.readyState < 3) {
      await waitUntil(el, () => el.readyState >= 3, "canplay");
    }
    try {
      if (el.currentTime !== 0) el.currentTime = 0;
    } catch {}
    await Promise.race([
      waitUntil(el, () => Math.abs(el.currentTime - 0) < 0.001, "seeked"),
      new Promise<void>(r => setTimeout(r, 120)),
    ]);
    await new Promise(r => requestAnimationFrame(() => r(null as any)));
    try { await el.play(); } catch {}
  };

  const claimAndPlayFromStart = async () => {
    const el = videoRef.current;
    if (!el || claimingRef.current) return;
    claimingRef.current = true;

    // @ts-ignore
    groupPlaying[group] = id;
    window.dispatchEvent(new CustomEvent("autoplay-group-play", { detail: { group, id } } as any));

    await safePlayFromZero(el);
    if (!destroyedRef.current) setShowOverlayIcon(false);

    claimingRef.current = false;
  };

  // Autoplay com IntersectionObserver
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      async ([entry]) => {
        const enough = entry.isIntersecting && entry.intersectionRatio >= playThreshold;

        if (enough && !userPaused) {
          if (!isReady) return;
          // @ts-ignore
          if (groupPlaying[group] !== id) {
            await claimAndPlayFromStart();
          } else {
            await safePlayFromZero(el);
            if (!destroyedRef.current) setShowOverlayIcon(false);
          }
        } else {
          el.pause();
          if (!destroyedRef.current) setShowOverlayIcon(true);
          // @ts-ignore
          if (groupPlaying[group] === id) groupPlaying[group] = null;
        }
      },
      { root: null, rootMargin: margin, threshold: [0, playThreshold, 0.99] }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      // @ts-ignore
      if (groupPlaying[group] === id) groupPlaying[group] = null;
    };
  }, [group, id, playThreshold, margin, userPaused, isReady]);

  const handleClick = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      setUserPaused(false);
      await claimAndPlayFromStart();
    } else {
      el.pause();
      setUserPaused(true);
      setShowOverlayIcon(true);
      // @ts-ignore
      if (groupPlaying[group] === id) groupPlaying[group] = null;
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Poster fixo até carregar */}
      {poster && (
        <img
          id={`poster-${id}`}
          src={poster}
          alt="Poster do vídeo"
          className="absolute inset-0 w-full h-full object-cover rounded-2xl z-10 select-none pointer-events-none"
          draggable={false}
        />
      )}

      {/* Loader */}
      <div
        id={`loader-${id}`}
        className="absolute inset-0 flex items-center justify-center z-20 bg-black/40"
      >
        <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black rounded-2xl opacity-0 transition-opacity duration-150"
        muted
        loop
        playsInline
        preload={preload}
        poster={poster}
        onLoadedData={() => {
          setIsReady(true);
          const v = videoRef.current;
          if (v) v.style.opacity = "1";
          document.getElementById(`poster-${id}`)?.classList.add("hidden");
          document.getElementById(`loader-${id}`)?.classList.add("hidden");
        }}
        onError={() => {
          setIsReady(true);
          document.getElementById(`loader-${id}`)?.classList.add("hidden");
        }}
        onPause={() => setShowOverlayIcon(true)}
        onPlay={() => setShowOverlayIcon(false)}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Overlay botão play/pause */}
      <button
        onClick={handleClick}
        className={`absolute inset-0 z-[30] flex items-center justify-center transition ${
          showOverlayIcon ? "bg-black/55 hover:bg-black/45" : "bg-transparent"
        }`}
        aria-label={showOverlayIcon ? "Reproduzir vídeo" : "Pausar vídeo"}
      >
        {showOverlayIcon && (
          <span className="bg-white/95 rounded-full p-6 shadow-lg">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
              <path d="M8 5v14l11-7-11-7z" fill="black" />
            </svg>
          </span>
        )}
      </button>
    </div>
  );
}

// ===== Depoimentos (carrossel) =====
const depoItems = [
  {
    id: "t1",
    type: "video" as const,
    src: "https://dl.dropboxusercontent.com/scl/fi/s1j0ytva5ffmeu49t2ap9/Mockup-Video.mp4?rlkey=1wvspc4mvrvmxocloediz5pwh&st=tofpmi8p",
    poster: "https://www.dropbox.com/scl/fi/ku1zvvw7ird9y4klnyput/Mockup-Cover.webp?rlkey=tq6txw6dahhio75ivh870t0c8&st=b9bj6alr&raw=1"
  },
  {
    id: "t2",
    type: "video" as const,
    src: "https://dl.dropboxusercontent.com/scl/fi/ydhta8ez80pe40zscxld0/02-Video.mp4?rlkey=hv3xim9grqju3ov77bpvo5uod&st=83p8rvce",
    poster: "https://www.dropbox.com/scl/fi/j38tvhdrig3hcag49fyx2/02-Cover.webp?rlkey=x41qx2cgobvr23txggrwm2ovk&st=kl4qzrkk&raw=1"
  },
  {
    id: "t3",
    type: "video" as const,
    src: "https://dl.dropboxusercontent.com/scl/fi/hyvngtp0bik0qhjl2r5a6/03-Video.mp4?rlkey=toc1p10pboahgnoiu5xyi398d&st=k8eske51",
    poster: "https://www.dropbox.com/scl/fi/zavay6564o3eh8ec1l3rc/03-Cover.webp?rlkey=8gfbqg11wt6dg985k4b88nlot&st=2e7bqbaz&raw=1"
  },
  {
    id: "t4",
    type: "video" as const,
    src: "https://dl.dropboxusercontent.com/scl/fi/4qqo8l3ehrhanjf4spezh/04-Video.mp4?rlkey=tqekzdg2abffhisux0o3nqojp&st=vetom8jj",
    poster: "https://www.dropbox.com/scl/fi/2t39nmeee4ijaib0vhcko/04-Cover.webp?rlkey=ieeew0yjsy2p9606hfr0ouqjc&st=yvksscxh&raw=1"
  },
  {
    id: "i1",
    type: "image" as const,
    src: "https://www.dropbox.com/scl/fi/i727omye7ybujgug7ztvy/01-Wallpaper.png?rlkey=ywags5skl0xzkotjkds41u064&st=gp6rfwdn&raw=1"
  },
  {
    id: "i2",
    type: "image" as const,
    src: "https://www.dropbox.com/scl/fi/vqdmtyrirjggnt8oovb8i/02-Wallpaper.png?rlkey=jog3jsgdhkwy04af5w0c6uppv&st=sut2vll5&raw=1"
  },
  {
    id: "i3",
    type: "image" as const,
    src: "https://www.dropbox.com/scl/fi/8kodh7lddwotjtqqc844i/03-Wallpaper.png?rlkey=a63nd6oyexpvpzp73a1avg6in&st=ubfrz7ux&raw=1"
  },
  {
    id: "i4",
    type: "image" as const,
    src: "https://www.dropbox.com/scl/fi/glhp3tnm5rbkro5aod6vb/04-Wallpaper.png?rlkey=gxd21sqo5xa4uzhiyvp6btc78&st=masufxsy&raw=1"
  },
];

const trackRef = React.useRef<HTMLDivElement>(null);
const [currentIdx, setCurrentIdx] = React.useState(0);

// centraliza o card de índice "idx" (no array expandido) dentro do trilho
const centerByIndex = React.useCallback((idx: number, smooth: boolean) => {
  const track = trackRef.current;
  if (!track) return;
  const cards = track.querySelectorAll<HTMLElement>(".card");
  const el = cards[idx];
  if (!el) return;
  const left = el.offsetLeft - (track.clientWidth - el.clientWidth) / 2;
  track.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" });
}, []);

// inicia já centralizado (inclusive no desktop)
React.useEffect(() => {
  centerByIndex(currentIdx, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// navegação FINITA (com limites nas pontas)
const go = React.useCallback(
  (delta: number) => {
    const n = depoItems.length;
    let next = currentIdx + delta;
    if (next < 0) next = 0;
    if (next > n - 1) next = n - 1;

    centerByIndex(next, true);
    setCurrentIdx(next);
  },
  [currentIdx, centerByIndex, depoItems.length]
);

const nextDepo = () => go(1);
const prevDepo = () => go(-1);

const openFromItem = (item: (typeof depoItems)[number]) => {
  if (item.type === "image") {
    openFullscreen("image", item.src);  // imagens: seu modal atual
  } else {
    // vídeos: abrem no modal customizado
    setFullscreenMedia({ type: "video", src: item.src, poster: (item as any).poster });
  }
};

// Trava scroll enquanto a midia estiver aberta
useEffect(() => {
  if (fullscreenMedia) {
    // trava scroll
    document.body.style.overflow = "hidden";
  } else {
    // libera scroll
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [fullscreenMedia]);

// --- Travar no card mais próximo após o scroll terminar (SEM loop) ---
useEffect(() => {
  const track = trackRef.current;
  if (!track) return;

  let raf = 0;
  let idleTimer: number | null = null;

  const nearestIndex = () => {
    const cards = track.querySelectorAll<HTMLElement>(".card");
    if (!cards.length) return currentIdx;

    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    let best = { i: currentIdx, d: Number.POSITIVE_INFINITY };

    cards.forEach((el, i) => {
      const elCenter = el.offsetLeft + el.clientWidth / 2;
      const d = Math.abs(elCenter - trackCenter);
      if (d < best.d) best = { i, d };
    });

    return best.i;
  };

  const snapToNearest = () => {
    const i = nearestIndex();
    centerByIndex(i, true);
    setCurrentIdx(i);
  };

  const onScroll = () => {
    // atualiza o "ativo" em tempo real (sem esperar parar de rolar)
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        const i = nearestIndex();
        if (i !== currentIdx) setCurrentIdx(i);
      });
    }

    // snap suave quando o usuário para de interagir
    if (idleTimer) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }
    idleTimer = window.setTimeout(() => {
      snapToNearest();
    }, 120) as unknown as number;
  };

  const onPointerDown = () => {
    if (idleTimer) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  track.addEventListener("scroll", onScroll, { passive: true });
  track.addEventListener("pointerdown", onPointerDown, { passive: true });

  return () => {
    track.removeEventListener("scroll", onScroll as any);
    track.removeEventListener("pointerdown", onPointerDown as any);
    if (idleTimer) window.clearTimeout(idleTimer);
    if (raf) cancelAnimationFrame(raf);
  };
}, [centerByIndex, currentIdx]);

// --- Tap vs Drag (evita abrir/centralizar quando o usuário está arrastando) ---
const drag = useRef({ startX: 0, startY: 0, moved: false, scrolling: false });

const onCardPointerDown = (e: React.PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  drag.current.startX = e.clientX;
  drag.current.startY = e.clientY;
  drag.current.moved = false;
  drag.current.scrolling = true;

  // só captura no mouse; em touch deixe o browser decidir (para scroll vertical funcionar)
  if (e.pointerType !== 'touch') {
    try { el.setPointerCapture(e.pointerId); } catch {}
  }
};

const onCardPointerMove = (e: React.PointerEvent) => {
  if (!drag.current.scrolling) return;

  const dx = Math.abs(e.clientX - drag.current.startX);
  const dy = Math.abs(e.clientY - drag.current.startY);

  // Se o gesto for predominantemente vertical, solta e deixa a página rolar
  if (dy > dx + 4) {
    const el = e.currentTarget as HTMLElement;
    try { el.releasePointerCapture?.(e.pointerId); } catch {}
    drag.current.scrolling = false;
    return;
  }

  if (dx > 8) {
    drag.current.moved = true; // swipe horizontal
  }
};

const onCardPointerUp = (e: React.PointerEvent, i: number, item: (typeof depoItems)[number]) => {
  drag.current.scrolling = false;
  const wasDrag = drag.current.moved;
  drag.current.moved = false;

  if (wasDrag) return; // ignorar clique após arrasto
  // ... seu comportamento de "tap" (centralizar/abrir) permanece igual

  if (i !== currentIdx) {
    centerByIndex(i, true);
    setCurrentIdx(i);
    return;
  }
  openFromItem(item);
};

  // FAQ functionality
  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqData = [
    {
      question: "Como funciona o Agenda AI?",
      answer: "O Agenda AI transforma a forma de organizar seus compromissos, utilizando Inteligência Artificial integrada ao WhatsApp para oferecer uma experiência prática e simplificada. Diferente de aplicativos tradicionais de agenda, o Agenda AI elimina a necessidade de abrir aplicativos complexos e permite que você registre compromissos de forma natural e rápida.\n\nBasta enviar uma mensagem de texto, um áudio ou até mesmo uma imagem (como um cartão de embarque, receita médica, comprovante de consulta ou avaliação acadêmica). A IA do Agenda AI processa automaticamente essas informações e adiciona ao seu calendário. Além disso, você recebe lembretes personalizados no WhatsApp, pode sincronizar com o Google Calendar e ter acesso a resumos diários para nunca esquecer um compromisso."
    },
    {
    question: "Preciso instalar algum aplicativo?",
    answer: "Não! O Agenda AI funciona diretamente pelo WhatsApp que você já utiliza no seu celular, sem necessidade de instalar nada novo. Basta iniciar a conversa com o assistente e você já pode começar a registrar seus compromissos enviando uma mensagem pra ele.\n\nIsso garante praticidade, rapidez e acesso em qualquer dispositivo que tenha o WhatsApp instalado."
    },
    {
    question: "Posso adicionar lembretes recorrentes?",
    answer: "Sim! Com o Agenda AI você pode configurar lembretes recorrentes de forma simples e rápida. Basta enviar uma mensagem no WhatsApp dizendo, por exemplo: \"Me lembre de tomar meu remédio todos os dias às 20h\" ou \"Agende minha aula de inglês toda segunda às 19h\".\n\nA inteligência artificial entende a recorrência e cria os eventos automaticamente no seu calendário, enviando notificações no WhatsApp sempre no horário definido."
    },
    {
      question: "Como faço para integrar com o Google Calendar?",
      answer: "É bem simples! Assim que a sua conta for ativada após a compra, você receberá no WhatsApp uma mensagem com um link para conectar ao Google Calendar.\n\nBasta abrir o link, entrar na sua conta Google e clicar em adicionar agenda. Depois disso, seus compromissos passam a ser sincronizados automaticamente.\n\nE se no futuro você precisar reconectar, é só enviar o comando /Agenda no WhatsApp que o link será enviado novamente."
    },
    {
    question: "Como funciona o cancelamento?",
    answer: "É bem simples! Basta acessar o site, clicar em Login e entrar com o mesmo e-mail usado na sua assinatura. Lá você terá acesso ao painel da sua conta e poderá gerenciar tudo, inclusive o cancelamento.\n\nO processo é rápido e você pode cancelar quando quiser, sem burocracia. E se mudar de ideia, basta assinar novamente: sua conta será reativada e todos os seus compromissos estarão lá, sem perder nada."
    },
    {
    question: "Tem algum plano para testar como funciona?",
    answer: "Sim! No plano anual você tem 7 dias gratuitos para experimentar o Agenda AI sem nenhum compromisso. Durante esse período pode usar todos os recursos normalmente, como registrar compromissos por texto, áudio ou imagem, receber lembretes no WhatsApp e integrar com o Google Calendar.\n\nSe não gostar ou achar que não é para você, basta cancelar dentro do período de teste e nada será cobrado."
    }
  ];

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when clicking on a link
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Fixed */}
      <header className="bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] border-b border-gray-100 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Agenda AI</span>
            </a>

            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <nav className="flex space-x-6">
                <a href="#como-funciona" className="text-gray-600 hover:text-blue-600 transition-colors">Como Funciona</a>
                <a href="#depoimentos" className="text-gray-600 hover:text-blue-600 transition-colors">Avaliações</a>
                <a href="#precos" className="text-gray-600 hover:text-blue-600 transition-colors">Planos</a>
              </nav>
              <a
                href="https://billing.stripe.com/p/login/dRm4gy9hC2DGd8cgVA5ZC00"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Minha Conta
              </a>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center space-x-1">
              <a 
              href="https://billing.stripe.com/p/login/dRm4gy9hC2DGd8cgVA5ZC00"
              className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Login
              </a>
              <button
                onClick={toggleMobileMenu}
                className="text-gray-600 hover:text-gray-900 transition-colors p-2"
              >
                <Menu className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-2 space-y-1">
              <a 
                href="#como-funciona" 
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                Como Funciona
              </a>
              <a 
                href="#depoimentos" 
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                Avaliações
              </a>
              <a 
                href="#precos" 
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                Planos
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Add padding to account for fixed header */}
      <div className="pt-5">
        {/* Hero Section */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center text-center lg:text-left">
              {/* Left Content */}
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                  Agende compromissos pelo
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500"> WhatsApp</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 mb-8">
                  Envie mensagens de texto ou áudio e a nossa IA agenda automaticamente no seu Calendário. 
                  Receba lembretes direto no WhatsApp.
                </p>
                <div className="mb-8">
                  <a 
                  href="#precos" 
                  className="
                    bg-blue-600 text-white px-20 py-4 rounded-full 
                    shadow-lg font-medium text-lg
                    transition-all duration-300 ease-in-out 
                    hover:bg-blue-700 hover:shadow-xl hover:-translate-y-1
                  "
                >
                  Quero Começar
                  </a>
                </div>
                
                {/* Trust Indicators */}
                <div className="flex flex-col items-center justify-center space-y-4 text-sm text-gray-600 md:flex-row md:justify-start md:items-center md:space-x-6 md:space-y-0">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>IA entende áudio e texto</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Funciona 24 horas</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Sem instalar nada</span>
                  </div>
                </div>
              </div>

              {/* Right Content - Phone Mockup */}
              <div className="flex justify-center lg:justify-end relative">
                <div className="relative">
                  {/* Phone Frame */}
                  <div className="relative w-[300px] h-[640px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                    {/* Screen */}
                    <div className="w-full h-full bg-black rounded-[2.5rem] overflow-hidden relative">
                      
                      {/* Poster (imagem por cima até o vídeo carregar) */}
                      <img
                        id="mockup-poster"
                        src="https://www.dropbox.com/scl/fi/ku1zvvw7ird9y4klnyput/Mockup-Cover.webp?rlkey=tq6txw6dahhio75ivh870t0c8&st=8mlpfhcq&raw=1"
                        alt="Poster do vídeo"
                        className="absolute inset-0 w-full h-full object-cover rounded-[2.5rem] z-10 select-none pointer-events-none"
                        loading="lazy"
                        fetchPriority="high"
                        draggable={false}
                      />
              
                      {/* Loader (Spinner) */}
                      <div 
                        id="mockup-loader"
                        className="absolute inset-0 grid place-items-center z-20"   // sem bg escuro
                      >
                        <YTSpinner size={44} stroke={4} className="text-white" />
                      </div>

                      {/* Video */}
                      <video
                        id="mockup-video"
                        className="absolute inset-0 w-full h-full object-cover rounded-[2.5rem] opacity-0 transition-opacity duration-150"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        onLoadedData={() => {
                          const v = document.getElementById("mockup-video") as HTMLVideoElement;
                          if (v) v.style.opacity = "1"; // revela vídeo
                          document.getElementById("mockup-poster")?.classList.add("hidden"); // esconde poster
                          document.getElementById("mockup-loader")?.classList.add("hidden"); // esconde loader
                        }}
                        onError={() => {
                          // se erro: mantém poster, esconde só loader
                          document.getElementById("mockup-loader")?.classList.add("hidden");
                        }}
                      >
                        <source src="https://dl.dropboxusercontent.com/scl/fi/s1j0ytva5ffmeu49t2ap9/Mockup-Video.mp4?rlkey=1wvspc4mvrvmxocloediz5pwh&st=4sgpqjo2"/>
                        Seu navegador não suporta vídeo.
                      </video>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Blue Card Section */}
        <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Sua vida organizada,
                <br />
                <span className="text-blue-200">sem esforço</span>
              </h2>
              
              <div className="max-w-4xl mx-auto mb-12">
                <p className="text-xl md:text-2xl text-blue-100 mb-6 leading-relaxed">
                  Você já se viu perdido com tantas tarefas no seu dia a dia? Esqueceu compromissos importantes ou se 
                  assustou ao ver a bagunça na sua agenda?
                </p>
                
                <p className="text-lg md:text-xl text-blue-200 mb-6 leading-relaxed">
                  Sabemos como isso pode ser frustrante. Agendas, aplicativos complicados... Infelizmente, nada disso é 
                  prático e eficiente.
                </p>
                
                <p className="text-lg md:text-xl text-blue-100 leading-relaxed">
                  Foi por isso que criamos o <span className="font-semibold text-white">Agenda AI</span>, uma ferramenta inteligente que combina o melhor da{' '}
                  <span className="font-semibold text-white">organização</span> com a{' '}
                  <span className="font-semibold text-white">gestão da sua agenda</span>, tudo de forma simples e direta pelo WhatsApp.
                </p>
              </div>
              
              <a href="#precos" className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                Começar Agora
              </a>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section id="como-funciona" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-600 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                Agenda Inteligente
              </h3>
            </div>

        {/* Video Player */}
        <div className="max-w-6xl mx-auto mb-12">
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            controls
            controlsList="nodownload"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            playsInline
            poster="https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217">  
      <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
      Seu navegador não suporta vídeo.
    </video>
  </div>
</div>

            {/* Text Content */}
            <div className="max-w-4xl mx-auto text-left mb-32">
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Com o Agenda AI, você organiza sua agenda 
                diretamente pelo WhatsApp. Basta enviar mensagens como 
                "Minha reunião amanhã é as 14h" ou "Me lembre de tomar meu remedio todos os dias as 20:00" e a nossa IA já registra e categoriza automaticamente todos os seus compromissos.
              </p>
              
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Ele envia lembretes, resumos diários e mantém tudo 
                organizado dentro do seu calendário de forma inteligente.
              </p>
              
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Simples, eficiente e sempre disponível para garantir que você 
                nunca perca um compromisso.
              </p>
              
              <div className="flex justify-start">
                <a href="#precos" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2">
                  <span>Comprar agora</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* Steps - Alternating Layout */}
            <div className="space-y-20 md:space-y-20 lg:space-y-20">
              {/* Step 1 - Left Content, Right Video */}
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-1">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mr-6">
                      01
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6">Agende tudo pelo WhatsApp</h3>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    Agende compromissos e receba lembretes diretamente pelo WhatsApp. 
                    Basta enviar uma mensagem e o nosso assistente virtual registra automaticamente tudo no seu calendário.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Agendamento rápido por mensagem de texto ou áudio</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Interpretação automática de datas e horários</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Praticidade e comodidade</span>
                    </li>
                  </ul>
                </div>
                <div className="order-2">
                  <div className="mx-auto w-full max-w-[360px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px]
                                  aspect-square bg-transparent rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                <AutoPlayVideo
                id="v1"
                group="steps"
                src="https://dl.dropboxusercontent.com/scl/fi/l2898pyua9ry1mtxypxpe/01-Video.mp4?rlkey=6rrt1hzt6528y8g0ec7f5ejpg&st=zv4axuyg"
                playThreshold={0.4}
                margin="-30% 0px -30% 0px"
                preload="metadata"
                poster="https://www.dropbox.com/scl/fi/1kwzzryskicc1qezahnut/01-Cover.webp?rlkey=mjipk1tx3pxyr8tvil8iun38t&st=riw8my4n&raw=1"
                className="mx-auto w-full max-w-[360px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl"/>
                  </div>
                </div>
              </div>

              {/* Step 2 - Right Content, Left Video */}
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-2 lg:order-1">
                  <div className="mx-auto w-full
                                  max-w-[360px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px]
                                  aspect-square bg-transparent rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                <AutoPlayVideo
                id="v2"
                group="steps"
                src="https://dl.dropboxusercontent.com/scl/fi/ydhta8ez80pe40zscxld0/02-Video.mp4?rlkey=hv3xim9grqju3ov77bpvo5uod&st=83p8rvce"
                playThreshold={0.4}
                margin="-30% 0px -30% 0px"
                preload="metadata"
                poster="https://www.dropbox.com/scl/fi/j38tvhdrig3hcag49fyx2/02-Cover.webp?rlkey=x41qx2cgobvr23txggrwm2ovk&st=kl4qzrkk&raw=1"
                className="mx-auto w-full max-w-[360px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl"/>
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mr-6">
                      02
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6">Sincronização direta com o Calendário</h3>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    Todos os seus compromissos são automaticamente sincronizados com seu Google Calendar. 
                    Tenha acesso fácil e imediato aos seus eventos em qualquer dispositivo, em tempo real.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Sincronização automática com Google Calendar</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Acesso em todos os dispositivos</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Experiência prática e acessível</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 3 - Left Content, Right Video */}
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-1">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mr-6">
                      03
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6">Personalize seus lembretes</h3>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    Você escolhe como e quando quer ser lembrado. 
                    Defina facilmente o tempo de antecedência dos lembretes e receba avisos personalizados diretamente no WhatsApp, 
                    do jeito que você preferir.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Lembretes adaptados à sua rotina</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Escolha quando deseja ser avisado</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Controle total sobre suas notificações</span>
                    </li>
                  </ul>
                </div>
                <div className="order-2">
                  <div className="mx-auto w-full
                                  max-w-[360px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px]
                                  aspect-square bg-transparent rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                <AutoPlayVideo
                id="v3"
                group="steps"
                src="https://dl.dropboxusercontent.com/scl/fi/hyvngtp0bik0qhjl2r5a6/03-Video.mp4?rlkey=toc1p10pboahgnoiu5xyi398d&st=k8eske51"
                playThreshold={0.4}
                margin="-30% 0px -30% 0px"
                preload="metadata"
                poster="https://www.dropbox.com/scl/fi/zavay6564o3eh8ec1l3rc/03-Cover.webp?rlkey=8gfbqg11wt6dg985k4b88nlot&st=2e7bqbaz&raw=1"
                className="mx-auto w-full max-w-[360px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl"/>
                  </div>
                </div>
              </div>

              {/* Step 4 - Right Content, Left Video */}
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="order-2 lg:order-1">
                  <div className="mx-auto w-full
                                  max-w-[360px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px]
                                  aspect-square bg-transparent rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                <AutoPlayVideo
                id="v4"
                group="steps"
                src="https://dl.dropboxusercontent.com/scl/fi/4qqo8l3ehrhanjf4spezh/04-Video.mp4?rlkey=tqekzdg2abffhisux0o3nqojp&st=vetom8jj"
                playThreshold={0.4}
                margin="-30% 0px -30% 0px"
                preload="metadata"
                poster="https://www.dropbox.com/scl/fi/2t39nmeee4ijaib0vhcko/04-Cover.webp?rlkey=ieeew0yjsy2p9606hfr0ouqjc&st=yvksscxh&raw=1"
                className="mx-auto w-full max-w-[360px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl"/>
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mr-6">
                      04
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-6">Resumo diário </h3>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    Receba toda manhã um resumo completo dos seus compromissos e afazeres do dia, 
                    diretamente no WhatsApp. Comece o dia sabendo exatamente o que precisa ser feito.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Resumo diário automático</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Sem surpresas durante o dia</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Mais controle e produtividade na sua rotina</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interaja com a sua agenda 24h por dia */}
        <section className="py-20 bg-white-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Interaja com o Agenda AI 24h por dia
              </h2>
              <p className="text-xl text-gray-600">
                Pergunte o que quiser e como quiser sobre os seus compromissos e lembretes. Veja alguns exemplos abaixo.
              </p>
            </div>

            {/* Animated Questions */}
            <div className="space-y-6 mb-12">
              
              {/* Row 1 - Esquerda */}
              <div className="marquee">
                <div className="marquee-track animate-marquee">
                  <div className="marquee-group">
                    {[
                      "Consulta amanhã às 15h",
                      "Marcar reunião hoje às 14h",
                      "Agendar dentista terça às 9h",
                      "Almoço com a Ana sexta às 12h",
                      "O que eu tenho hoje?",
                      "Lembrete amanhã às 8h para levar os exames",
                      "Aula de inglês quinta às 19h",
                      "Agendar call com cliente às 11h",
                      "Marcar pediatra da Júlia dia 10 às 9h",
                      "Tenho compromisso sexta?",
                      "Agendar retorno daqui 15 dias às 10h",
                      "Marcar revisão do carro sábado às 10h"
                    ].map((question, index) => (
                      <div
                        key={index}
                        className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap ${
                          index === 4 ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border border-gray-200'
                        }`}
                      >
                        {question}
                      </div>
                    ))}
                  </div>
              
                  {/* duplicação para loop perfeito */}
                  <div className="marquee-group" aria-hidden="true">
                    {[
                      "Consulta amanhã às 15h",
                      "Marcar reunião hoje às 14h",
                      "Agendar dentista terça às 9h",
                      "Almoço com a Ana sexta às 12h",
                      "O que eu tenho hoje?",
                      "Lembrete amanhã às 8h para levar os exames",
                      "Aula de inglês quinta às 19h",
                      "Agendar call com cliente às 11h",
                      "Marcar pediatra da Júlia dia 10 às 9h",
                      "Tenho compromisso sexta?",
                      "Agendar retorno daqui 15 dias às 10h",
                      "Marcar revisão do carro sábado às 10h"
                    ].map((question, index) => (
                      <div
                        key={`dup-1-${index}`}
                        className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap ${
                          index === 4 ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border border-gray-200'
                        }`}
                      >
                        {question}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Row 2 - Direita */}
              <div className="marquee">
                <div className="marquee-track animate-marquee-right">
                  <div className="marquee-group">
                    {[
                      "O que eu tenho essa semana?",
                      "Tenho algo no sábado?",
                      "Estou livre amanhã às 16h?",
                      "Quais horários livres na sexta?",
                      "Quando é o aniversário da Lari?",
                      "Remarcar a reunião de hoje para 18h",
                      "Cancelar o compromisso das 17h",
                      "Me lembra do treino amanhã às 6h",
                      "Lembrar de coletar os exames quinta às 7h",
                      "Reunião com o Paulo às 17h",
                      "Agendar entrega terça às 10h",
                      "Consulta de retorno dia 25 às 15h"
                    ].map((question, index) => (
                      <div
                        key={index}
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-full text-sm font-medium whitespace-nowrap"
                      >
                        {question}
                      </div>
                    ))}
                  </div>
              
                  <div className="marquee-group" aria-hidden="true">
                    {[
                      "O que eu tenho essa semana?",
                      "Tenho algo no sábado?",
                      "Estou livre amanhã às 16h?",
                      "Quais horários livres na sexta?",
                      "Quando é o aniversário da Lari?",
                      "Remarcar a reunião de hoje para 18h",
                      "Cancelar o compromisso das 17h",
                      "Me lembra do treino amanhã às 6h",
                      "Lembrar de coletar os exames quinta às 7h",
                      "Reunião com o Paulo às 17h",
                      "Agendar entrega terça às 10h",
                      "Consulta de retorno dia 25 às 15h"
                    ].map((question, index) => (
                      <div
                        key={`dup-2-${index}`}
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-full text-sm font-medium whitespace-nowrap"
                      >
                        {question}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Row 3 - Esquerda */}
              <div className="marquee">
                <div className="marquee-track animate-marquee">
                  <div className="marquee-group">
                    {[
                      "Agendar médico dia 20 às 8h",
                      "Marcar consulta às 16h hoje",
                      "Estou livre às 15h?",
                      "Quais compromissos tenho hoje?",
                      "Viagem 12 de outubro às 6h",
                      "Barbearia sábado às 9h",
                      "Reunião mensal toda segunda às 10h",
                      "Adiciona um lembrete de pagar as contas dia 5 às 9h",
                      "Agendar aula de pilates quarta às 18h",
                      "Quais compromissos tenho amanhã?",
                      "Agendar prova dia 30 às 14h",
                      "Marca o voo dia 20 às 6h"
                    ].map((question, index) => (
                      <div
                        key={index}
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-full text-sm font-medium whitespace-nowrap"
                      >
                        {question}
                      </div>
                    ))}
                  </div>
              
                  <div className="marquee-group" aria-hidden="true">
                    {[
                      "Agendar médico dia 20 às 8h",
                      "Marcar consulta às 16h hoje",
                      "Estou livre às 15h?",
                      "Quais compromissos tenho hoje?",
                      "Viagem 12 de outubro às 6h",
                      "Barbearia sábado às 9h",
                      "Reunião mensal toda segunda às 10h",
                      "Adiciona um lembrete de pagar as contas dia 5 às 9h",
                      "Agendar aula de pilates quarta às 18h",
                      "Quais compromissos tenho amanhã?",
                      "Agendar prova dia 30 às 14h",
                      "Marca o voo dia 20 às 6h"
                    ].map((question, index) => (
                      <div
                        key={`dup-3-${index}`}
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-full text-sm font-medium whitespace-nowrap"
                      >
                        {question}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Row 4 - Direita */}
              <div className="marquee">
                <div className="marquee-track animate-marquee-right">
                  <div className="marquee-group">
                    {[
                      "Agendar reunião amanhã às 9h",
                      "Como está a minha agenda hoje?",
                      "Agendar pagamento do aluguel dia 6 às 10h",
                      "Quais são meus compromissos fixos?",
                      "Agendar médico para a Sofia terça às 9h",
                      "O que eu tenho no sábado?",
                      "Agendar lembrete: ligar para o banco às 16h",
                      "Me avisa do aniversário da Júlia amanhã às 8h",
                      "Tenho compromisso no domingo?",
                      "Agendar surpresa sexta às 20h",
                      "Me acorde amanhã às 7h",
                      "Agendar limpeza da casa terça às 14h"
                    ].map((question, index) => (
                      <div
                        key={index}
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-full text-sm font-medium whitespace-nowrap"
                      >
                        {question}
                      </div>
                    ))}
                  </div>
              
                  <div className="marquee-group" aria-hidden="true">
                    {[
                      "Agendar reunião amanhã às 9h",
                      "Como está a minha agenda hoje?",
                      "Agendar pagamento do aluguel dia 6 às 10h",
                      "Quais são meus compromissos fixos?",
                      "Agendar médico para a Sofia terça às 9h",
                      "O que eu tenho no sábado?",
                      "Agendar lembrete: ligar para o banco às 16h",
                      "Me avisa do aniversário da Júlia amanhã às 8h",
                      "Tenho compromisso no domingo?",
                      "Agendar surpresa sexta às 20h",
                      "Me acorde amanhã às 7h",
                      "Agendar limpeza da casa terça às 14h"
                    ].map((question, index) => (
                      <div
                        key={`dup-4-${index}`}
                        className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-full text-sm font-medium whitespace-nowrap"
                      >
                        {question}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <a 
                href="#precos" 
                className="
                  bg-blue-500 text-white px-8 py-4 rounded-lg 
                  font-medium text-lg shadow-md inline-flex items-center space-x-2
                  transition-all duration-500 ease-out
                  hover:bg-blue-600 hover:shadow-lg
                "
              >
                <span>Quero utilizar</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </section>

        {/* Não acredite apenas nas nossas palavras */}
        <section id="depoimentos" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Não acredite apenas nas nossas palavras
              </h2>
              <p className="text-xl text-gray-600">
                Veja alguns de nossos clientes incríveis que estão tendo resultados
              </p>
            </div>

            {/* Carousel (infinito) */}
            <div className="relative max-w-7xl mx-auto">
              {/* trilho com snap “friendly” no mobile */}
              <div
                id="depo-track"
                ref={trackRef}
                className="
                  flex gap-4 overflow-x-auto hide-scrollbar
                  pl-4 -mx-4 md:mx-0 md:pl-0
                  scroll-smooth snap-x snap-mandatory   /* <- antes era proximity */
                  md:overflow-hidden
                "
                aria-label="Carrossel de depoimentos"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-x pan-y pinch-zoom',
                  overscrollBehaviorX: 'contain'
                }}
                >
                {depoItems.map((item, i) => (
                  <div
                    key={`${item.id}-${i}`}
                    data-active={i === currentIdx}
                    className="
                      card shrink-0 snap-center snap-always
                      w-[70%] xs:w-[65%] sm:w-[60%] md:w-1/4
                      transition-all duration-300 will-change-transform
                      data-[active=true]:opacity-100 data-[active=true]:scale-100 data-[active=true]:shadow-xl
                      data-[active=false]:opacity-60 data-[active=false]:scale-95
                    "
                  >
                    <button
                      type="button"
                      onPointerDown={(e) => onCardPointerDown(e)}
                      onPointerMove={(e) => onCardPointerMove(e)}
                      onPointerUp={(e) => onCardPointerUp(e, i, item)}
                      className="relative block aspect-[9/16] w-full rounded-2xl overflow-hidden focus:outline-none bg-transparent"
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.src}
                          alt=""
                          className="w-full h-full object-cover select-none"
                          draggable={false}
                        />
                      ) : (
                        <img
                          src={item.poster}
                          alt=""
                          className="w-full h-full object-cover select-none"
                          draggable={false}
                        />
                      )}
                
                      {item.type === "video" && (
                        <span className="absolute inset-0 grid place-items-center pointer-events-none">
                          <span className="bg-white/95 rounded-full p-5 shadow-lg transition-opacity duration-200">
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                              <path d="M8 5v14l11-7-11-7z" fill="black" />
                            </svg>
                          </span>
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Modal de video fullscreen */}
              {fullscreenMedia && fullscreenMedia.type === "video" && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">
                  {/* X fixo na viewport (fora do quadro) */}
                  <button
                    onClick={() => setFullscreenMedia(null)}
                    className="fixed z-[10000] text-white text-5xl font-light hover:opacity-80 transition"
                    style={{
                      top: 'max(0.75rem, env(safe-area-inset-top))',
                      right: 'max(0.75rem, env(safe-area-inset-right))'
                    }}
                    aria-label="Fechar"
                  >
                    ×
                  </button>
              
                  {/* Centraliza o quadro */}
                  <div className="h-full w-full flex items-center justify-center">
                    {/* QUADRO PRETO */}
                    <div
                      className="
                        relative bg-black overflow-hidden
                        w-screen h-[82svh] rounded-none       /* mobile: largura total, altura ~92% da tela */
                        md:w-[70vw] md:max-w-[1100px] md:aspect-video  /* DESKTOP: define largura para o aspect-video calcular a altura */
                        shadow-2xl
                      "
                    >
                      <video
                        src={fullscreenMedia.src}
                        poster={fullscreenMedia.poster}
                        className="absolute inset-0 w-full h-full object-contain"
                        controls
                        autoPlay
                        playsInline
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de imagem fullscreen */}
              {fullscreenMedia && fullscreenMedia.type === "image" && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center">
                  <button
                    className="absolute top-6 right-6 text-white text-5xl font-light hover:opacity-80 transition"
                    onClick={() => setFullscreenMedia(null)}
                  >
                    ×
                  </button>
                  <img
                    src={fullscreenMedia.src}
                    alt="Imagem em fullscreen"
                    className="max-w-[90%] max-h-[90%] rounded-lg shadow-sm"
                  />
                </div>
              )}
              
              {/* Navegação */}
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={prevDepo}
                  disabled={currentIdx === 0}
                  className={`w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center transition-colors
                              ${currentIdx === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}
                  aria-label="Anterior">
                  <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                
                <button
                  onClick={nextDepo}
                  disabled={currentIdx === depoItems.length - 1}
                  className={`w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center transition-colors
                              ${currentIdx === depoItems.length - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}
                  aria-label="Próximo">
                  <ChevronRight className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="precos" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Escolha seu Plano
              </h2>
              <p className="text-xl text-gray-600">
                Comece agora mesmo a organizar sua rotina
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

              
              {/* Plano Mensal */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-shadow relative">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Plano Mensal
                  </h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">R$19</span>
                    <span className="text-2xl text-gray-600">,90</span>
                    <span className="text-gray-600 block">por mês</span>
                  </div>
                  <ul className="space-y-4 mb-8 text-left">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Agendamentos ilimitados</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Integração Google Calendar</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Lembretes no WhatsApp</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Suporte por chat</span>
                    </li>
                  </ul>
                  <Link
                    to="/checkout?plan=monthly"
                    className="w-full block bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Começar Agora
                  </Link>
                </div>
              </div>

              {/* Plano Anual */}
              <div className="bg-white border-2 border-blue-200 rounded-2xl p-8 hover:shadow-xl transition-shadow relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-full text-sm font-medium">
                    Mais Popular
                  </span>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Plano Anual
                  </h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">R$9</span>
                    <span className="text-2xl text-gray-600">,90</span>
                    <span className="text-gray-600 block">por mês</span>
                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full inline-block mt-2">
                      R$118,80/ano
                    </span>
                  </div>
                  <ul className="space-y-4 mb-8 text-left">
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Agendamentos ilimitados</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Integração Google Calendar</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Lembretes no WhatsApp</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Suporte prioritário</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 font-medium">
                        Economize 50%
                      </span>
                    </li>
                  </ul>
                  <Link
                    to="/checkout?plan=annual"
                    className="w-full block bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 rounded-lg hover:from-blue-700 hover:to-green-600 transition-all font-medium">
                    Economizar no Anual
                  </Link>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-gray-600">
                💳 Cancele a qualquer momento
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2>
              <p className="text-xl text-gray-600">Tire suas dúvidas sobre o Agenda AI</p>
            </div>

            <div className="space-y-4">
              {faqData.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        openFAQ === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFAQ === index && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ainda tem dúvidas? Section */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ainda tem dúvidas?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Nossa equipe está pronta para ajudar e responder a todas as suas perguntas.
            </p>
            <a href="https://wa.me/5545988251919?text=Ol%C3%A1%21%20Gostaria%20de%20ajuda%20com%20o%20Agenda.ai" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center space-x-3 bg-green-500 text-white px-8 py-4 rounded-lg hover:bg-green-600 hover:shadow-lg transition-all duration-300 ease-out font-medium text-lg shadow-md">
              <SiWhatsapp className="w-6 h-6" />
              <span>Fale com nossa equipe</span>
            </a>
          </div>
        </section>
        
        {/* Footer Section */}
        <footer className="bg-white border-t border-gray-200 mt-20">
          <div className="max-w-7xl mx-auto px-8 sm:px-10 lg:px-12 py-12">
        
            {/* LINHA DO LOGO (Agenda AI + powered by Dalzzen) */}
            <div className="flex flex-col items-center mb-12 md:mb-16">
              {/* Agenda AI (igual header) */}
              <a
                href="/"
                className="inline-flex flex-col items-center gap-1 group transition hover:opacity-90"
                aria-label="Agenda AI"
              >
                {/* Linha principal - Agenda AI */}
                <div className="inline-flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span
                    className="
                      text-2xl font-bold
                      text-transparent bg-clip-text
                      bg-gradient-to-r from-gray-900 to-gray-900
                      transition-all duration-200
                      group-hover:from-blue-600 group-hover:to-green-500
                      group-hover:opacity-80
                    "
                  >
                    Agenda AI
                  </span>
                </div>
              </a>
            
              {/* Powered by Dalzzen */}
              <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                <span>Created by</span>
                <span className="flex items-baseline group cursor-default">
                  <span
                    style={{ fontFamily: '"Lily Script One", cursive' }}
                    className="text-gray-900 text-sm leading-none group-hover:text-[#6C63FF]"
                  >
                    D
                  </span>
                  <span
                    style={{ fontFamily: '"Lobster", cursive' }}
                    className="text-gray-900 text-sm leading-none group-hover:text-[#6C63FF]"
                  >
                    alzzen
                  </span>
                </span>
              </div>

              {/* Ícones sociais */}
              <div className="mt-3 flex items-center gap-4">
                {/* WhatsApp */}
                <a
                  href="https://wa.me/5545988251919"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="text-gray-900 hover:text-[#25D366] transition-colors duration-200"
                >
                  <SiWhatsapp className="w-5 h-5" />
                </a>
              
                {/* Instagram */}
                <a
                  href="https://instagram.com/agenda.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-gray-900 hover:text-[#E1306C] transition-colors duration-200"
                >
                  <SiInstagram className="w-5 h-5" />
                </a>
              </div>
            </div>
        
            {/* CATEGORIAS */}
            <div className="md:max-w-4xl md:mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        
              {/* Idioma */}
              <div className="text-left">
                <h4 className="text-[#687280] text-xl font-semibold mb-3">Idioma</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="/"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Português
                    </a>
                  </li>
                </ul>
              </div>
        
              {/* Produto */}
              <div className="text-left">
                <h4 className="text-[#687280] text-xl font-semibold mb-3">Produto</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#como-funciona"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Como usar
                    </a>
                  </li>
                  <li>
                    <a
                      href="#precos"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Assinar agora
                    </a>
                  </li>
                  <li>
                    <a
                      href="#depoimentos"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Avaliações
                    </a>
                  </li>
                </ul>
              </div>
        
              {/* Termos */}
              <div className="text-left">
                <h4 className="text-[#687280] text-xl font-semibold mb-3">Termos</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="/"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Termos de uso
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Política de privacidade
                    </a>
                  </li>
                </ul>
              </div>
        
              {/* Suporte */}
              <div className="text-left">
                <h4 className="text-[#687280] text-xl font-semibold mb-3">Suporte</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://wa.me/5545988251919?text=Ol%C3%A1%21%20Gostaria%20de%20ajuda%20com%20o%20Agenda.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://instagram.com/agenda.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="font-medium transition-all duration-200 text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 hover:from-blue-600 hover:to-green-500"
                    >
                      Central de ajuda
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        
          {/* Copyright */}
          <div className="border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
              <p className="py-6 text-center text-sm text-gray-500">
                Copyright © {new Date().getFullYear()} Dalzzen. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }

        /* esconder scrollbar no WebKit e Firefox */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* efeito de troca suave entre cards */
        .card {
          transform: scale(.94);
          opacity: .55;
          transition:
            transform .45s cubic-bezier(.22,.61,.36,1),
            opacity .45s cubic-bezier(.22,.61,.36,1),
            filter .45s cubic-bezier(.22,.61,.36,1);
          will-change: transform, opacity, filter;
        }
        
        .card.active {
          transform: scale(1);
          opacity: 1;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.12));
        }
        
        /* faz o scroll-snap parar sempre no item */
        .snap-always { scroll-snap-stop: always; }

        /* melhorar rolagem no iOS + travar overscroll lateral */
        #depo-track {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          touch-action: pan-x pinch-zoom;
        }
        
        /* cards animam suave sem “jump” */
        .card {
          transform: scale(.94);
          opacity: .55;
          transition:
            transform .45s cubic-bezier(.22,.61,.36,1),
            opacity .45s cubic-bezier(.22,.61,.36,1),
            filter .45s cubic-bezier(.22,.61,.36,1);
          will-change: transform, opacity, filter;
        }
        .card.active {
          transform: scale(1);
          opacity: 1;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.12));
        }

        @keyframes loadingbar {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(300%); }
        }
        .animate-loadingbar { animation: loadingbar 1.1s ease-in-out infinite; }

        .osd-bubble{
        background: rgba(0,0,0,.65);
        color: white;
        width: 84px;
        height: 84px;
        border-radius: 9999px;
        display: grid;
        place-items: center;
        animation: osd-pop .45s ease-out forwards;
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
      }
      
        @keyframes osd-pop{
        0%   { transform: scale(.85); opacity: 0; }
        20%  { opacity: 1; }
        100% { transform: scale(1); opacity: 0; }
      }

        /* ============================
           MARQUEE CONTÍNUO (SEM SALTO)
        ============================ */

        .marquee {
          overflow: hidden;
        }

        .marquee-track {
          display: flex;
          will-change: transform;
          width: max-content;                 /* trilho cresce conforme conteúdo */
        }

        .marquee-group {
          display: flex;
          gap: 1rem;                          /* espaçamento entre “pílulas” */
          padding-right: 1rem;     /* NOVO: espaço entre um grupo e o próximo */
          white-space: nowrap;
          flex-shrink: 0;                      /* não encolher */
        }

        /* Anima de 0 até a largura EXATA do 1º grupo (definida em --marquee-distance via JS) */
        @keyframes marquee-var {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-1 * var(--marquee-distance, 50%))); }
        }

        /* Padrão (desktop): esquerda */
        .animate-marquee {
          animation: marquee-var var(--speed, 50s) linear infinite;
        }
        /* Direita (usa reverse) */
        .animate-marquee-right {
          animation: marquee-var var(--speed, 60s) linear infinite reverse;
        }

        /* Velocidade no mobile */
        @media (max-width: 768px) {
          .animate-marquee,
          .animate-marquee-right {
            --speed: 40s;  /* ajuste aqui a velocidade no celular */
          }
        }
      `}</style>
    </div>
  );
}

export default Home;