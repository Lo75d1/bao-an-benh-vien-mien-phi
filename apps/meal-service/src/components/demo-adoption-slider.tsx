"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type AdoptionScreen = {
  src: string;
  title: string;
  description: string;
};

export function DemoAdoptionSlider({ screens }: { screens: readonly AdoptionScreen[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    const slide = track?.children.item(index) as HTMLElement | null;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
    setActive(index);
  }, []);

  const goBy = useCallback((delta: number) => {
    goTo((active + delta + screens.length) % screens.length);
  }, [active, goTo, screens.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const handleScroll = () => {
      const slides = Array.from(track.children) as HTMLElement[];
      const nearest = slides.reduce((best, slide, index) => {
        const distance = Math.abs(slide.offsetLeft - track.offsetLeft - track.scrollLeft);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Number.POSITIVE_INFINITY });
      setActive(nearest.index);
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (paused || screens.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const interval = window.setInterval(() => goBy(1), 4500);
    return () => window.clearInterval(interval);
  }, [goBy, paused, screens.length]);

  return (
    <div className="demo-adoption-slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div ref={trackRef} className="demo-adoption-gallery" aria-label="Slide ảnh minh họa các màn hình DEMO">
        {screens.map((screen) => (
          <figure key={screen.src}>
            <Image src={screen.src} alt={`${screen.title} trong bản DEMO suất ăn bệnh viện`} width={1920} height={1080} sizes="(max-width: 900px) 82vw, 660px" />
            <figcaption><strong>{screen.title}</strong><span>{screen.description}</span></figcaption>
          </figure>
        ))}
      </div>
      <div className="demo-adoption-controls">
        <button type="button" aria-label="Ảnh trước" onClick={() => goBy(-1)}><ChevronLeft aria-hidden="true" /></button>
        <div className="demo-adoption-dots" aria-label="Chọn ảnh minh họa">
          {screens.map((screen, index) => (
            <button key={screen.src} type="button" aria-label={`Xem ảnh: ${screen.title}`} aria-current={active === index} onClick={() => goTo(index)} />
          ))}
        </div>
        <button type="button" aria-label="Ảnh tiếp theo" onClick={() => goBy(1)}><ChevronRight aria-hidden="true" /></button>
      </div>
    </div>
  );
}
