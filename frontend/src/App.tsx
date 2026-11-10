import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, BookOpen, ChartNoAxesCombined, ChevronRight, Compass, FlaskConical, Layers3, Menu, Moon, Orbit, Sun, X } from 'lucide-react';
import { useTheme } from './theme';
import Assistant from './components/Assistant';
const routes = [
  { id: 'overview', label: 'Overview', icon: Compass, page: lazy(() => import('./pages/Overview')) },
  { id: 'explorer', label: 'Disaster Explorer', icon: Layers3, page: lazy(() => import('./pages/Explorer')) },
  { id: 'time-machine', label: 'Climate Time Machine', icon: Orbit, page: lazy(() => import('./pages/TimeMachine')) },
  { id: 'comparison', label: 'State Comparison', icon: ChartNoAxesCombined, page: lazy(() => import('./pages/Comparison')) },
  { id: 'insights', label: 'NIElytics Insights', icon: FlaskConical, page: lazy(() => import('./pages/Insights')) },
  { id: 'sources', label: 'Sources & Methodology', icon: BookOpen, page: lazy(() => import('./pages/Sources')) },
];
class ErrorBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <section className="panel" role="alert"><h2>This view could not render</h2><p>Your data has not been changed. Reload to try again.</p><button className="button" onClick={() => window.location.reload()}>Reload application</button></section> : this.props.children; }
}
export default function App() {
  const {theme, toggleTheme} = useTheme();
  const [hash, setHash] = useState(window.location.hash);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null);
  const initial = useRef(true);
  const routeId = hash.slice(1).split('?')[0] || '/overview';
  const route = routes.find(r => `/${r.id}` === routeId);
  const current = route ?? routes[0];
  const Page = current.page;
  useEffect(() => {
    const change = () => { setHash(window.location.hash); setOpen(false); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => { document.title = `${current.label} · ClimateLens India`; if (!initial.current) main.current?.focus(); initial.current = false; }, [current.label]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const links = drawer.current?.querySelectorAll<HTMLElement>('a, button');
    links?.[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menu.current?.focus(); }
      if (event.key === 'Tab' && links?.length) {
        const first = links[0], last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', trap); };
  }, [open]);
  function link(id: string) { const query = hash.includes('?') ? hash.slice(hash.indexOf('?')) : ''; return `#/${id}${query}`; }
  return <div className="app-shell">
    <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); main.current?.focus(); }}>Skip to content</a>
    {open && <div className="drawer-backdrop" onClick={() => { setOpen(false); menu.current?.focus(); }} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`} ref={drawer} aria-label="Primary navigation" {...(open ? { role: 'dialog', 'aria-modal': true } : {})}>
      <a className="brand" href={link('overview')}><span className="brand-mark"><Compass size={27}/></span><span>ClimateLens<span className="brand-country">India</span></span></a>
      <button className="drawer-close button" aria-label="Close navigation" onClick={() => { setOpen(false); menu.current?.focus(); }}><X size={18}/></button>
      <nav aria-label="Primary">{routes.map(({id,label,icon: Icon}) => <a key={id} href={link(id)} className={`nav-link ${current.id === id ? 'active' : ''}`} aria-current={current.id === id ? 'page' : undefined}><Icon size={19}/><span>{label}</span>{current.id === id && <ChevronRight size={15}/>}</a>)}</nav>
    </aside>
    <div className="workspace"><header className="topbar">
      <div className="breadcrumb"><button ref={menu} className="button mobile-menu" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20}/></button><strong>{current.label}</strong></div>
      <div className="topbar-actions">
        <button className="theme-toggle" type="button" role="switch" aria-label="Dark mode" aria-checked={theme==='dark'} onClick={toggleTheme} title={`Switch to ${theme==='light'?'dark':'light'} mode`}>
          {theme==='light'?<Sun size={17} aria-hidden="true"/>:<Moon size={17} aria-hidden="true"/>}
          <span>{theme==='light'?'Light mode':'Dark mode'}</span>
          <i className="theme-switch-track" aria-hidden="true"><i/></i>
        </button>
      </div>
    </header>
      <main id="main" tabIndex={-1} ref={main}>
        {!route && routeId !== '/overview' && <p className="route-notice" role="status">Page not found. Showing Overview.</p>}
        <ErrorBoundary key={current.id}><Suspense fallback={<div role="status" className="panel skeleton">Loading view…</div>}><Page/></Suspense></ErrorBoundary>
      </main>
    </div>
    <Assistant />
  </div>;
}
