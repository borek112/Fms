import * as React from 'react';
const MOBILE = '(max-width: 767px)';
export function useIsMobile() { const [isMobile, setIsMobile] = React.useState(false); React.useEffect(() => { const m = window.matchMedia(MOBILE); const update = () => setIsMobile(m.matches); update(); m.addEventListener?.('change', update); return () => m.removeEventListener?.('change', update); }, []); return isMobile; }
