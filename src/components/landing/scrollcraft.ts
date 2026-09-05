export function mountLandingScroll(
  root: HTMLElement,
  onStageChange: (stage: number) => void,
) {
  const stages = Array.from(root.querySelectorAll<HTMLElement>("[data-landing-stage]"));
  const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-landing-reveal]"));
  let frame = 0;
  root.setAttribute("data-motion-ready", "");

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

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).setAttribute("data-visible", "");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  reveals.forEach((element) => revealObserver.observe(element));
  update();

  return () => {
    root.removeAttribute("data-motion-ready");
    revealObserver.disconnect();
    window.removeEventListener("scroll", scheduleUpdate);
    window.removeEventListener("resize", scheduleUpdate);
    if (frame) window.cancelAnimationFrame(frame);
  };
}
