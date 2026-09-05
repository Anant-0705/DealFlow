export function mountLandingScroll(
  root: HTMLElement,
  onStageChange: (stage: number) => void,
) {
  const stages = Array.from(root.querySelectorAll<HTMLElement>("[data-landing-stage]"));
  let frame = 0;

  const update = () => {
    frame = 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    root.style.setProperty("--landing-progress", progress.toFixed(3));

    const target = window.innerHeight * 0.48;
    const active = stages.reduce(
      (best, stage, index) => {
        const distance = Math.abs(stage.getBoundingClientRect().top - target);
        return distance < best.distance ? { distance, index } : best;
      },
      { distance: Number.POSITIVE_INFINITY, index: 0 },
    );

    stages.forEach((stage, index) => stage.toggleAttribute("data-active", index === active.index));
    onStageChange(active.index);
  };

  const scheduleUpdate = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  update();

  return () => {
    window.removeEventListener("scroll", scheduleUpdate);
    window.removeEventListener("resize", scheduleUpdate);
    if (frame) window.cancelAnimationFrame(frame);
  };
}
