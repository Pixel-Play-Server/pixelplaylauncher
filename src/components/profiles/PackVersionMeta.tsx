import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { usePackUpdaterStore } from "../../store/pack-updater-store";

type PackVersionMetaProps = {
  packId?: string | null;
  size?: "sm" | "md";
};

export function PackVersionMeta({ packId, size = "sm" }: PackVersionMetaProps) {
  const id = (packId || "").trim();
  const status = usePackUpdaterStore((s) => (id ? s.byId[id] : undefined));
  const ensure = usePackUpdaterStore((s) => s.ensure);

  useEffect(() => {
    if (id) {
      void ensure(id);
    }
  }, [id, ensure]);

  if (!id || !status?.has_updater || !status.current) {
    return null;
  }

  const iconClass = size === "md" ? "w-4 h-4" : "w-3 h-3";
  const ruleClass = size === "md" ? "w-px h-4 bg-white/30" : "w-px h-3 bg-white/30";
  const updated = status.updated;
  const label =
    updated === false && status.remote && status.remote !== status.current
      ? `nueva ${status.remote}`
      : updated === true
        ? "al día"
        : null;
  const title =
    updated === false && status.remote
      ? `Pack ${status.current} · hay ${status.remote} en el updater`
      : updated === true
        ? `Pack ${status.current} · al día`
        : `Pack ${status.current}`;

  return (
    <>
      <div className={ruleClass} />
      <div
        className="text-white/70 flex items-center gap-1 min-w-0"
        title={title}
      >
        <Icon icon="solar:box-bold" className={`${iconClass} text-white/55 flex-shrink-0`} />
        <span className="truncate">{status.current}</span>
        {label && (
          <span
            className={
              updated === false
                ? "text-amber-300 truncate"
                : "text-emerald-400 truncate"
            }
          >
            {label}
          </span>
        )}
      </div>
    </>
  );
}
