import { useLayoutEffect, useRef, useState } from 'react';

const reduce = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Transisi 3D: ganti halaman = panel berayun seperti pintu (sambil kamera wayang bergeser), ganti pilihan/filter = kartu membalik.
export default function Stage({ k, kind = 'flip', dir = 1, children }) {
  const last = useRef({ k, node: children });
  const first = useRef(true);
  const [leave, setLeave] = useState(null);
  const timer = useRef(null);

  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (last.current.k === k || reduce()) return;
    setLeave({ node: last.current.node, kind, dir, id: Math.random() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLeave(null), kind === 'swing' ? 560 : 520);
  }, [k]);

  useLayoutEffect(() => { last.current = { k, node: children }; });

  const swing = leave?.kind === 'swing';
  const side = leave?.dir >= 0 ? 'n' : 'p';
  const curCls = leave ? (swing ? `swing-in-${side}` : 'flip-in') : '';
  const outCls = leave ? (swing ? `swing-out-${side}` : 'flip-out') : '';

  return (
    <div className={'stage' + (leave ? ' run' : '')}>
      <div className={curCls} key="cur">{children}</div>
      {leave && (
        <div className={'leave ' + outCls} aria-hidden="true" key={leave.id}>
          {leave.node}
        </div>
      )}
    </div>
  );
}
