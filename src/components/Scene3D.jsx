import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Latar 3D (Arjuna & Bima, malam sakura). Dimuat belakangan supaya halaman cepat muncul.
const Scene3D = forwardRef(function Scene3D({ char, shot }, ref) {
  const canvas = useRef(null);
  const world = useRef(null);
  const want = useRef({ char, shot });

  useEffect(() => {
    let alive = true;
    import('../scene/world.js').then(({ createWorld }) => {
      if (!alive || !canvas.current) return;
      const mobile = window.matchMedia('(max-width: 700px)').matches || /Mobi|Android/i.test(navigator.userAgent);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const w = createWorld(canvas.current, { mobile, reduce });
      world.current = w;
      if (w) w.go(want.current.char, want.current.shot, { instant: true, act: false });
    }).catch(() => {});
    return () => { alive = false; world.current?.dispose(); world.current = null; };
  }, []);

  useEffect(() => {
    want.current = { char, shot };
    world.current?.go(char, shot);
  }, [char, shot]);

  useImperativeHandle(ref, () => ({ snapshot: (c) => world.current?.snapshot(c) || null }));

  return (
    <div className="world" aria-hidden="true">
      <canvas ref={canvas} className="world-canvas" />
      <div className="world-vig" />
    </div>
  );
});
export default Scene3D;
