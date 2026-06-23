import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      
      <div className="text-center max-w-2xl mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
          Process Engineering <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Optimization Suite</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed">
          Advanced tools for Heat Exchanger Network Synthesis (HENS) and Hydrogen Network Pinch Analysis. 
          Select a module to begin your engineering simulation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* كارت الـ HENS */}
        <Link to="/hens" className="group block p-1 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-orange-500 hover:to-rose-600 transition-all duration-300 shadow-xl hover:shadow-orange-500/20 active:scale-[0.98]">
          <div className="h-full bg-slate-900 rounded-xl p-8 flex flex-col items-center text-center border border-slate-800 group-hover:border-transparent transition-all">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.4)] mb-6 transition-transform hover:scale-110">
  <i className="fa-solid fa-fire text-3xl text-white"></i>
</div>
            <h2 className="text-xl font-bold text-white mb-3">HENS Optimizer</h2>
            <p className="text-slate-400 text-sm mb-6 flex-1">
              Design and retrofit Heat Exchanger Networks using MINLP algorithms to minimize utility consumption and calculate precise payback periods.
            </p>
            <span className="text-orange-400 font-bold text-sm flex items-center gap-2 group-hover:translate-x-2 transition-transform">
              Launch Module <i className="fa-solid fa-arrow-right"></i>
            </span>
          </div>
        </Link>

        {/* كارت الـ H2 Pinch */}
        <Link to="/h2" className="group block p-1 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-blue-500 hover:to-cyan-400 transition-all duration-300 shadow-xl hover:shadow-blue-500/20 active:scale-[0.98]">
          <div className="h-full bg-slate-900 rounded-xl p-8 flex flex-col items-center text-center border border-slate-800 group-hover:border-transparent transition-all">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.4)] mb-6 transition-transform hover:scale-110">
  <i className="fa-solid fa-code-branch text-3xl text-white"></i>
</div>
            <h2 className="text-xl font-bold text-white mb-3">H2 Pinch Analyzer</h2>
            <p className="text-slate-400 text-sm mb-6 flex-1">
              Optimize refinery hydrogen networks, calculate pinch targets, and compare Purification technologies (Membrane vs PSA) economically.
            </p>
            <span className="text-blue-400 font-bold text-sm flex items-center gap-2 group-hover:translate-x-2 transition-transform">
              Launch Module <i className="fa-solid fa-arrow-right"></i>
            </span>
          </div>
        </Link>

      </div>
      
    </div>
    
  );
}