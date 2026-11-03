"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { Logo } from "../ui/Logo";
import { NavButton } from "../ui/nav/NavButton";
import { CreditsModal } from "../modals/CreditsModal";

interface NavItem { id: string; icon: string; label: string; action?: () => void; }
interface VerticalNavbarProps {
  className?: string; items: NavItem[]; activeItem?: string;
  onItemClick?: (id: string) => void; version?: string;
}

export function VerticalNavbar({ className, items, activeItem, onItemClick }: VerticalNavbarProps) {
  const [credits, setCredits] = useState(false);
  const active = activeItem?.startsWith("profiles") ? "profiles" : activeItem === "capes" ? "skins" : activeItem?.split("/")[0];
  return <>
    <aside className={cn("pixel-sidebar font-minecraft-ten flex flex-col shrink-0", className)}>
      <button type="button" onClick={() => setCredits(true)} className="pixel-brand flex items-center gap-3 text-left" aria-label="Acerca de Pixel Play">
        <Logo size="sm" className="shrink-0" />
        <div className="pixel-nav-label"><span className="block text-white text-base font-normal">Pixel Play</span><span className="block text-[10px] text-white/40 tracking-[0.14em] mt-1">LAUNCHER</span></div>
      </button>
      <div className="pixel-nav-label px-4 mb-3 text-[10px] font-semibold tracking-[0.16em] text-white/30">BIBLIOTECA</div>
      <nav className="flex-1 flex flex-col gap-2 px-3" aria-label="Navegación principal">
        {items.map(item => <NavButton key={item.id} className="pixel-nav-button" icon={<Icon icon={item.icon} className="w-5 h-5" />} isActive={active === item.id} aria-current={active === item.id ? "page" : undefined} aria-label={item.label} title={item.label} onClick={() => item.action ? item.action() : onItemClick?.(item.id)}>
          <span className="pixel-nav-label font-minecraft-ten text-sm">{item.label}</span>
        </NavButton>)}
      </nav>
      <button type="button" onClick={() => setCredits(true)} className="pixel-about flex items-center gap-2 mx-4 my-5 text-xs text-white/35 hover:text-white/75">
        <Icon icon="solar:code-square-linear" className="w-4 h-4 shrink-0"/><span className="pixel-nav-label">Acerca del proyecto</span>
      </button>
    </aside>
    <CreditsModal isOpen={credits} onClose={() => setCredits(false)} />
  </>;
}
