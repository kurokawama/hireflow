interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  showSubtext?: boolean;
}

const sizeMap = {
  sm: { main: "text-lg", sub: "text-[9px]", gap: "gap-0" },
  md: { main: "text-xl", sub: "text-[10px]", gap: "gap-0.5" },
  lg: { main: "text-2xl", sub: "text-xs", gap: "gap-1" },
};

export function Logo({ size = "md", variant = "dark", showSubtext = true }: LogoProps) {
  const s = sizeMap[size];
  const mainColor = variant === "light" ? "text-white" : "text-[#1D3557]";
  const accentColor = "text-[#E63946]";
  const subColor = variant === "light" ? "text-white/60" : "text-neutral-400";

  return (
    <div className={`flex flex-col ${s.gap}`}>
      <div className={`${s.main} font-bold leading-tight tracking-tight`}>
        <span className={accentColor}>の</span>
        <span className={mainColor}>びてる</span>
      </div>
      {showSubtext && (
        <span className={`${s.sub} font-medium uppercase tracking-widest ${subColor}`}>
          NOBITEL
        </span>
      )}
    </div>
  );
}
