import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* الشريط العلوي - يعرض اللوجو فقط للرجوع للرئيسية */}
      <header className="h-[60px] bg-slate-900 border-b border-slate-800 flex items-center px-5 shrink-0 sticky top-0 z-50 shadow-md">
        
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-[34px] h-[34px] bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <i className="fa-solid fa-code-branch"></i>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-base tracking-wide">Network Optimizer</span>
            <span className="text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold">PRO Suite</span>
          </div>
        </Link>

      </header>

      {/* محتوى الصفحات */}
      <main className="flex-1 overflow-auto relative bg-slate-950">
        <Outlet />
      </main>
      {/* بصمة الفريق الفنية */}
    <div style={{ display: 'flex',justifyContent:'space-between'}}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: 'var(--text-2)', letterSpacing: '0.5px', fontSize: '12px' }}>
        <i className="fa-solid fa-hands-holding-circle" style={{ color: 'var(--green)', animation: 'pulse 2s infinite' }}></i>
        <span>Developed by <span style={{     color: '#007bff',fontSize: '15px' }}>Free Palestene Team</span> © 2026</span>
    </div>
    <div style={{ marginRight:'15px',color:'#f97316 ',fontWeight:'bold'}}>Mahmoud Fathy & Soliman Atallah</div>
    </div>
    </div>
  );
}