export default function FaceGuideOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-72 w-72 overflow-hidden rounded-full border-2 border-white/30 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)]">
        <div className="absolute inset-0 rounded-full border border-white/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-60 w-60 rounded-full border-2 border-cyan-400/70 shadow-[0_0_30px_rgba(56,189,248,0.3)]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 rounded-full border border-white/10" />
        </div>
        <div className="scan-line" />
      </div>
    </div>
  );
}
