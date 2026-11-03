"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/buttons/Button";
import { RankTag } from "./RankTag";
import { rankInfo } from "../../lib/pixel-rank";
import { accountCapeUrl, accountSkinUrl } from "../../lib/pixelplayCdn";
import { DEFAULT_STEVE_SKIN_URL, SkinView3DWrapper } from "../common/SkinView3DWrapper";

export type RankUpgradeInfo = {
  from: string;
  to: string;
  username?: string;
  uuid?: string;
  perks?: string[];
};

type Phase = "cinematic" | "message" | "perks";

function probeImage(url: string, timeoutMs = 2200): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    const img = new Image();
    const done = (ok: boolean) => {
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    const timer = window.setTimeout(() => done(false), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      done(true);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      done(false);
    };
    img.src = url;
  });
}

export function RankUpgradeOverlay({
  info,
  onClose,
}: {
  info: RankUpgradeInfo;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("cinematic");
  const [skinUrl, setSkinUrl] = useState<string | null>(null);
  const [capeUrl, setCapeUrl] = useState("");
  const from = rankInfo(info.from, true);
  const to = rankInfo(info.to, true);
  const perks = useMemo(
    () => (info.perks && info.perks.length > 0 ? info.perks : to?.perks || []),
    [info.perks, to?.perks],
  );
  const fromColor = from?.color || "#6b7280";
  const toColor = to?.color || "#059669";
  const phraseKey = `rankUp.phrase.${to?.key || "usuario"}`;
  const phrase = t(phraseKey, {
    defaultValue: t("rankUp.changed", {
      from: from?.label || info.from,
      to: to?.label || info.to,
    }),
  });

  useEffect(() => {
    let cancelled = false;
    const candidates = [
      accountSkinUrl(info.uuid, info.username),
      info.username ? `https://mc-heads.net/skin/${encodeURIComponent(info.username)}` : "",
    ].filter(Boolean);
    void (async () => {
      let next = DEFAULT_STEVE_SKIN_URL;
      for (const url of candidates) {
        if (await probeImage(url)) {
          next = url;
          break;
        }
      }
      const cape = accountCapeUrl(info.uuid);
      const hasCape = Boolean(cape && (await probeImage(cape)));
      if (!cancelled) {
        setCapeUrl(hasCape ? cape : "");
        setSkinUrl(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [info.uuid, info.username]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (phase !== "cinematic" || !skinUrl) {
      return;
    }
    const timer = window.setTimeout(() => setPhase("message"), 4200);
    return () => window.clearTimeout(timer);
  }, [phase, skinUrl]);

  useEffect(() => {
    if (phase !== "cinematic" || !skinUrl) {
      return;
    }
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".rank-skin-lift",
        { y: 80, opacity: 0 },
        { y: -12, opacity: 1, duration: 3.2, ease: "power2.out" },
      );
      gsap.fromTo(
        ".rank-aura-from",
        { opacity: 0.9 },
        { opacity: 0, duration: 2.4, delay: 0.9, ease: "power2.inOut" },
      );
      gsap.fromTo(
        ".rank-aura-to",
        { opacity: 0 },
        { opacity: 1, duration: 2.2, delay: 1.1, ease: "power2.inOut" },
      );
      gsap.fromTo(
        ".rank-beam-from",
        { opacity: 0.65 },
        { opacity: 0, duration: 2.3, delay: 0.85, ease: "power2.inOut" },
      );
      gsap.fromTo(
        ".rank-beam-to",
        { opacity: 0 },
        { opacity: 0.85, duration: 2.3, delay: 1.05, ease: "power2.inOut" },
      );
      gsap.fromTo(
        ".rank-cinematic-meta",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, delay: 2.6, ease: "power2.out" },
      );
      gsap.to(".rank-mote", {
        y: "-=520",
        opacity: 0,
        scale: "random(0.2, 1.1)",
        duration: "random(2.2, 4)",
        stagger: 0.05,
        ease: "power1.out",
      });
    }, root);
    return () => ctx.revert();
  }, [phase, skinUrl]);

  useEffect(() => {
    if (phase === "cinematic") {
      return;
    }
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        stage,
        { opacity: 0, y: 28, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" },
      );
      if (phase === "message") {
        gsap.fromTo(".rank-phrase", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 });
      }
      if (phase === "perks") {
        gsap.fromTo(
          ".rank-perk",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, stagger: 0.08 },
        );
      }
    }, stage);
    return () => ctx.revert();
  }, [phase]);

  return (
    <div ref={rootRef} className="fixed inset-0 z-[320] overflow-hidden">
      <div className="absolute inset-0 bg-[#05070b]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% 100%, #0b1220 0%, transparent 70%), linear-gradient(180deg, #020308 0%, #07101c 55%, #020308 100%)",
        }}
      />
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={`star-${i}`}
          className="pointer-events-none absolute rounded-full bg-white/60"
          style={{
            width: 1,
            height: 1,
            left: `${8 + ((i * 19) % 84)}%`,
            top: `${8 + ((i * 13) % 40)}%`,
            opacity: 0.35,
          }}
        />
      ))}

      {phase === "cinematic" && (
        <>
          <div
            className="rank-beam-from pointer-events-none absolute left-1/2 bottom-0 h-[110%] w-16 -translate-x-1/2 origin-bottom"
            style={{
              background: `linear-gradient(to top, ${fromColor}00, ${fromColor}66, ${fromColor}10)`,
            }}
          />
          <div
            className="rank-beam-to pointer-events-none absolute left-1/2 bottom-0 h-[110%] w-16 -translate-x-1/2 origin-bottom"
            style={{
              background: `linear-gradient(to top, ${toColor}00, ${toColor}88, ${toColor}18)`,
            }}
          />
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={`mote-${i}`}
              className="rank-mote pointer-events-none absolute h-1 w-1 rounded-full"
              style={{
                left: `${48 + ((i * 7) % 10) - 5}%`,
                top: `${68 + ((i * 4) % 12)}%`,
                backgroundColor: i % 2 === 0 ? fromColor : toColor,
              }}
            />
          ))}

          <div className="absolute inset-0 flex items-center justify-center pb-20">
            <div className="rank-skin-lift relative flex items-center justify-center" style={{ width: 560, height: 420 }}>
              <div
                className="rank-aura-from pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: `radial-gradient(circle, ${fromColor}88 0%, transparent 70%)` }}
              />
              <div
                className="rank-aura-to pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: `radial-gradient(circle, ${toColor}99 0%, transparent 70%)` }}
              />
              {skinUrl ? (
                <SkinView3DWrapper
                  skinUrl={skinUrl}
                  capeUrl={capeUrl || undefined}
                  width={560}
                  height={420}
                  zoom={0.62}
                  enableAutoRotate
                  autoRotateSpeed={0.45}
                  animation="fly"
                  transparent
                  pixelRatio={1}
                  fxaa={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div
                    className="h-14 w-14 rounded-full border-2 border-white/20"
                    style={{ boxShadow: `0 0 28px ${fromColor}` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rank-cinematic-meta pointer-events-none absolute inset-x-0 bottom-10 text-center">
            <p className="font-minecraft-ten text-xs uppercase tracking-[0.28em] text-white/55 mb-2">
              {t("rankUp.kicker")}
            </p>
            {info.username && (
              <p className="font-minecraft text-4xl text-white normal-case">{info.username}</p>
            )}
            <div className="mt-3 flex items-center justify-center gap-3">
              <RankTag rank={info.from} pixelAccount />
              <Icon icon="solar:arrow-right-bold" className="w-5 h-5 text-white/50" />
              <RankTag rank={info.to} pixelAccount className="text-sm px-3 py-1" />
            </div>
          </div>
        </>
      )}

      {phase !== "cinematic" && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 70% 50% at 50% 45%, ${toColor}33 0%, transparent 70%)`,
            }}
          />
          <div
            ref={stageRef}
            className="relative w-full max-w-2xl border-2 border-b-4 p-7 text-center"
            style={{
              backgroundColor: "rgba(8, 10, 12, 0.97)",
              borderColor: `${toColor}cc`,
              boxShadow: `0 12px 0 rgba(0,0,0,0.35), 0 28px 70px rgba(0,0,0,0.6), 0 0 50px ${toColor}40`,
            }}
          >
            {phase === "message" && (
              <div className="space-y-6">
                <p className="font-minecraft-ten text-xs uppercase tracking-[0.25em] text-white/55">
                  {t("rankUp.kicker")}
                </p>
                <h2 className="font-minecraft text-4xl text-white normal-case">
                  {t("rankUp.title", { rank: to?.label || info.to })}
                </h2>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <RankTag rank={info.from} pixelAccount />
                    <span className="text-[10px] font-minecraft-ten uppercase text-white/40">
                      {t("rankUp.before")}
                    </span>
                  </div>
                  <Icon icon="solar:arrow-right-bold" className="w-7 h-7 text-white/70" />
                  <div className="flex flex-col items-center gap-2">
                    <RankTag rank={info.to} pixelAccount className="text-sm px-3 py-1" />
                    <span className="text-[10px] font-minecraft-ten uppercase" style={{ color: toColor }}>
                      {t("rankUp.now")}
                    </span>
                  </div>
                </div>
                <p className="rank-phrase font-minecraft-ten text-base text-white/85 leading-relaxed">
                  {phrase}
                </p>
                <Button variant="success" className="w-full" onClick={() => setPhase("perks")}>
                  {t("rankUp.continue")}
                </Button>
              </div>
            )}

            {phase === "perks" && (
              <div>
                <p className="font-minecraft-ten text-xs uppercase tracking-[0.25em] text-white/55 mb-2">
                  {t("rankUp.perksTitle")}
                </p>
                <h2 className="font-minecraft text-4xl text-white normal-case mb-5">
                  {t("rankUp.title", { rank: to?.label || info.to })}
                </h2>
                <p className="font-minecraft-ten text-sm text-white/70 mb-4">{t("rankUp.subtitle")}</p>
                <ul className="space-y-2 text-left mb-6">
                  {perks.map((perk) => (
                    <li
                      key={perk}
                      className="rank-perk flex items-center gap-2 px-3 py-2 rounded-sm border"
                      style={{ borderColor: `${toColor}44`, backgroundColor: `${toColor}14` }}
                    >
                      <Icon icon="solar:check-circle-bold" className="w-4 h-4 shrink-0" style={{ color: toColor }} />
                      <span className="font-minecraft-ten text-sm text-white">{perk}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="success" className="w-full" onClick={onClose}>
                  {t("rankUp.close")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
