import { UserSession } from '../types';
import { LogOut, User } from 'lucide-react';
import UnitaLogo from './UnitaLogo';

interface HeaderProps {
  session: UserSession;
  onLogout: () => void;
}

export default function Header({ session, onLogout }: HeaderProps) {
  return (
    <header className="bg-white text-slate-800 shadow-sm border-b border-slate-200 no-print" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo & Clinical Branding */}
          <div className="flex items-center gap-4">
            <UnitaLogo variant="horizontal" size={40} className="hover:opacity-90 transition-opacity" />
            <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase mb-0.5">
                Gestão de Escalas
              </h2>
              {/* User Metadata directly under the title as specified */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Usuário:</span>
                <span className="font-semibold text-slate-700">{session.usuario}</span>
                <span className="text-slate-300">|</span>
                <span>Perfil:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold ${
                   session.perfil === 'administrador' 
                     ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                     : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {session.perfil === 'administrador' ? 'Administrador' : 'Coordenador'}
                </span>
              </div>
            </div>
          </div>

          {/* Sair Button (Logout) */}
          <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-100 sm:border-t-0 pt-3 sm:pt-0">
            <div className="text-right hidden md:block">
              <div className="text-[11px] text-slate-400 font-mono tracking-wider uppercase">Controle Operacional Diurno</div>
              <div className="text-[10px] text-slate-500 font-mono">07:00 às 19:00</div>
            </div>
            <button
              id="logout-button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
              <span>Sair</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
