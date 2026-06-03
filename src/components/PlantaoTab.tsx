import React, { useState, useEffect, useMemo } from 'react';
import { Doctor, ShiftConfig, UserSession, DailyPresence } from '../types';
import {
  Clock,
  UserCheck,
  ShieldAlert,
  Save,
  Award,
  Calendar,
  UserPlus,
  Trash2,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Clock3,
  Sun,
  Sunset
} from 'lucide-react';
import { logSystemEvent } from '../utils';
import UnitaLogo from './UnitaLogo';

interface PlantaoTabProps {
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
  session: UserSession;
  dailyPresences: DailyPresence[];
  setDailyPresences: React.Dispatch<React.SetStateAction<DailyPresence[]>>;
}

export default function PlantaoTab({
  doctors,
  setDoctors,
  session,
  dailyPresences,
  setDailyPresences
}: PlantaoTabProps) {
  // 1. Core Shift bounds & Coordinator States (Existing config)
  const [shiftStart, setShiftStart] = useState('07:00');
  const [shiftEnd, setShiftEnd] = useState('19:00');
  const [selectedCoords, setSelectedCoords] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 2. New Daily Roster States (Date-specific planner)
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedShiftType, setSelectedShiftType] = useState<'12h' | '6h-manha' | '6h-tarde'>('12h');
  const [rosterError, setRosterError] = useState('');
  const [rosterSuccess, setRosterSuccess] = useState(false);

  // Load standard shift configuration on mount
  useEffect(() => {
    const shift: ShiftConfig = JSON.parse(
      localStorage.getItem('unita_shift') || '{"coordenadores":["d20"],"inicio":"07:00","fim":"19:00"}'
    );
    setShiftStart(shift.inicio);
    setShiftEnd(shift.fim);
    setSelectedCoords(shift.coordenadores);
  }, []);

  // Filter roster for the selected date
  const rosterForSelectedDate = useMemo(() => {
    return dailyPresences.filter(p => p.date === selectedDate);
  }, [dailyPresences, selectedDate]);

  // List of doctors that are NOT in the roster for the selected date
  const availableDoctorsToRoster = useMemo(() => {
    return doctors.filter(doc => !rosterForSelectedDate.some(p => p.doctorID === doc.id));
  }, [doctors, rosterForSelectedDate]);

  // Existing presets handler
  const handleApplyPreset = (start: string, end: string) => {
    if (session.perfil !== 'administrador') {
      alert('Somente Administradores podem redefinir o período ou presets do plantão.');
      return;
    }
    setShiftStart(start);
    setShiftEnd(end);
  };

  // Existing coordinator toggle
  const handleCoordinatorToggle = (docId: string) => {
    if (session.perfil !== 'administrador') {
      alert('Somente Administradores podem definir os coordenadores do plantão do dia.');
      return;
    }

    if (selectedCoords.includes(docId)) {
      setSelectedCoords(selectedCoords.filter(id => id !== docId));
    } else {
      if (selectedCoords.length >= 2) {
        alert('O expediente operacional permite no máximo 2 Coordenadores ativos em paralelo.');
        return;
      }
      setSelectedCoords([...selectedCoords, docId]);
    }
  };

  // Existing shift limit details saving
  const handleSaveConfig = () => {
    if (session.perfil !== 'administrador') {
      alert('Apenas Administradores têm permissão para gravar mudanças de escala geral.');
      return;
    }

    const newConf: ShiftConfig = {
      coordenadores: selectedCoords,
      inicio: shiftStart,
      fim: shiftEnd
    };

    localStorage.setItem('unita_shift', JSON.stringify(newConf));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    const coordNames = doctors
      .filter(d => selectedCoords.includes(d.id))
      .map(d => d.nome)
      .join(', ') || 'Nenhum';

    logSystemEvent(
      session.usuario,
      session.perfil,
      'Alteração de coordenador',
      `Configuração salva. Horário: ${shiftStart} às ${shiftEnd}. Coordenadores: ${coordNames}`
    );
  };

  // New Roster Action: Add Doctor with custom shift type
  const handleAddDoctorToRoster = (e: React.FormEvent) => {
    e.preventDefault();
    setRosterError('');
    setRosterSuccess(false);

    if (session.perfil !== 'administrador') {
      setRosterError('Apenas Administradores podem modificar a lista e regras do plantão.');
      return;
    }

    if (!selectedDoctorId) {
      setRosterError('Por favor, selecione um médico do cadastro.');
      return;
    }

    const targetDoc = doctors.find(d => d.id === selectedDoctorId);
    if (!targetDoc) return;

    const newPresence: DailyPresence = {
      id: `pres-${selectedDoctorId}-${selectedDate}-${Date.now()}`,
      date: selectedDate,
      doctorID: selectedDoctorId,
      shiftType: selectedShiftType
    };

    const updatedPresences = [...dailyPresences, newPresence];
    setDailyPresences(updatedPresences);
    localStorage.setItem('unita_daily_presences', JSON.stringify(updatedPresences));

    // Audit log
    const shiftLabel =
      selectedShiftType === '12h'
        ? 'Completo 12h (07h-19h)'
        : selectedShiftType === '6h-manha'
        ? 'Parcial Manhã 6h (07h-13h)'
        : 'Parcial Tarde 6h (13h-19h)';

    logSystemEvent(
      session.usuario,
      session.perfil,
      'Entrada no plantão',
      `Cadastrou Dr(a). ${targetDoc.nome} no plantão de ${selectedDate} com carga horária de: ${shiftLabel}.`
    );

    // Clear and success
    setSelectedDoctorId('');
    setRosterSuccess(true);
    setTimeout(() => setRosterSuccess(false), 3000);
  };

  // New Roster Action: Remove Doctor from date-specific roster
  const handleRemoveDoctorFromRoster = (docId: string) => {
    if (session.perfil !== 'administrador') {
      alert('Somente Administradores podem excluir médicos do roteiro planejado do plantão.');
      return;
    }

    const targetDoc = doctors.find(d => d.id === docId);
    if (!targetDoc) return;

    if (
      confirm(
        `Tem certeza que deseja remover Dr(a). ${targetDoc.nome} do plantão do dia ${selectedDate}?`
      )
    ) {
      const updatedPresences = dailyPresences.filter(
        p => !(p.doctorID === docId && p.date === selectedDate)
      );
      setDailyPresences(updatedPresences);
      localStorage.setItem('unita_daily_presences', JSON.stringify(updatedPresences));

      logSystemEvent(
        session.usuario,
        session.perfil,
        'Saída do plantão',
        `Removeu Dr(a). ${targetDoc.nome} do roteiro planejado para o dia ${selectedDate}.`
      );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="plantao-tab-container">
      
      {/* Title with metadata info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <UnitaLogo size={32} className="p-1 rounded-lg bg-slate-50 border border-slate-100 shadow-3xs" />
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 font-display">Operação & Roteiro do Plantão</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Planejamento diário de médicos presentes, horas de escala e atribuição de coordenação operacional.
            </p>
          </div>
        </div>

        {/* Dynamic Date Selection Field */}
        <div className="flex items-center gap-2 font-sans text-xs">
          <label htmlFor="roster-active-date" className="font-extrabold text-slate-700 uppercase tracking-widest text-[10px]">
            Data do Plantão:
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
            </span>
            <input
              id="roster-active-date"
              type="date"
              className="pl-8 pr-3 py-1.5 font-bold border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden text-slate-800 bg-slate-50 cursor-pointer shadow-3xs"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setRosterError('');
                setRosterSuccess(false);
              }}
            />
          </div>
        </div>
      </div>

      {session.perfil !== 'administrador' && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100/80 flex items-start gap-3 text-xs leading-relaxed text-amber-800">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Modo de Apenas Leitura:</span> Você está logado como Coordenador do Plantão. Apenas Administradores do sistema podem planejar a presença de anestesistas no roteiro do dia ou definir a equipe de coordenação.
          </div>
        </div>
      )}

      {/* Roster Planning Block (Core Request) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-3xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-800 font-display flex items-center gap-2 uppercase tracking-wide">
            <UserCheck className="h-4 w-4 text-blue-500" />
            Lista de Presença do Dia ({selectedDate.split('-').reverse().join('/')})
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
            Data Selecionada: {selectedDate}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Add Doctor form (Left - 5 Cols) */}
          <div className="lg:col-span-5 space-y-4 border-r border-slate-100 pr-0 lg:pr-6">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Adicionar Médico ao Roteiro
            </h4>

            <form onSubmit={handleAddDoctorToRoster} className="space-y-4">
              {/* Doctor Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Médico Anestesista
                </label>
                {availableDoctorsToRoster.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-150">
                    Nenhum médico livre encontrado para inclusão neste dia.
                  </p>
                ) : (
                  <select
                    id="roster-doctor-select"
                    disabled={session.perfil !== 'administrador'}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-600 text-slate-800 bg-white"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    <option value="">Selecione um médico...</option>
                    {availableDoctorsToRoster.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.nome} ({doc.crm})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Shift hours setting (12h, 6h manha, 6h tarde) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Período / Carga Horária do Plantonista
                </label>
                <select
                  id="roster-shift-select"
                  disabled={session.perfil !== 'administrador'}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-600 text-slate-800 bg-white font-sans"
                  value={selectedShiftType}
                  onChange={(e) => setSelectedShiftType(e.target.value as any)}
                >
                  <option value="12h">Plantão Integral - 12h (07:00 às 19:00)</option>
                  <option value="6h-manha">Plantonista Parcial - 6h Manhã (07:00 às 13:00)</option>
                  <option value="6h-tarde">Plantonista Parcial - 6h Tarde (13:00 às 19:00)</option>
                </select>
              </div>

              {session.perfil === 'administrador' && availableDoctorsToRoster.length > 0 && (
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 uppercase hover:tracking-wider"
                >
                  <UserPlus className="h-4 w-4" /> Registrar no Plantão
                </button>
              )}

              {rosterError && (
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-100">
                  ⚠️ {rosterError}
                </p>
              )}

              {rosterSuccess && (
                <p className="text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Médico adicionado de forma planejada!
                </p>
              )}
            </form>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-250 text-[10px] leading-relaxed text-slate-500 space-y-1.5 shadow-3xs">
              <span className="font-extrabold text-slate-600 uppercase flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-blue-500" /> Sobre a Parcialidade de Horas:
              </span>
              <p>
                <strong>Manhã (07-13h)</strong>: Disponível nas alocações apenas no turno matutino.
              </p>
              <p>
                <strong>Tarde (13-19h)</strong>: Disponível nas alocações apenas no turno vespertino.
              </p>
              <p>
                <strong>Garantia de Disponibilidade</strong>: Fora do período formal do anestesista escalado, o sistema oculta no painel instantâneo para evitar escalas sobrepostas e inconsistências clínicas.
              </p>
            </div>
          </div>

          {/* Roster registered list (Right - 7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Profissionais Ativos no Roteiro</span>
              <span className="text-[10px] text-slate-400 bg-slate-100 border px-1.5 font-mono rounded">
                Total: {rosterForSelectedDate.length} médico(s)
              </span>
            </h4>

            {rosterForSelectedDate.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                Nenhum anestesista escalado para a clínica no dia {selectedDate.split('-').reverse().join('/')}.
                <br />
                Utilize o formulário de inclusão à esquerda para programar a presença diária.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {rosterForSelectedDate.map(presence => {
                  const doc = doctors.find(d => d.id === presence.doctorID);
                  if (!doc) return null;

                  return (
                    <div
                      key={presence.id}
                      className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-all flex items-center justify-between gap-4 shadow-3xs"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">{doc.nome}</p>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-slate-500">
                          <span>{doc.crm}</span>
                          <span>•</span>
                          <span>{doc.celular || 'Sem celular'}</span>
                        </div>
                        {doc.afinidade && (
                          <p className="text-[9px] text-slate-400">
                            Afinidade: <span className="font-medium text-slate-500">{doc.afinidade}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Dynamic Shift Badges with icons */}
                        {presence.shiftType === '12h' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-emerald-700 bg-emerald-50 rounded px-2.5 py-1 border border-emerald-100 uppercase">
                            <Clock3 className="h-3 w-3 text-emerald-600" />
                            12h (07h - 19h)
                          </span>
                        )}
                        {presence.shiftType === '6h-manha' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-amber-700 bg-amber-50 rounded px-2.5 py-1 border border-amber-100 uppercase">
                            <Sun className="h-3 w-3 text-amber-600" />
                            6h (07h - 13h)
                          </span>
                        )}
                        {presence.shiftType === '6h-tarde' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-indigo-700 bg-indigo-50 rounded px-2.5 py-1 border border-indigo-100 uppercase">
                            <Sunset className="h-3 w-3 text-indigo-600" />
                            6h (13h - 19h)
                          </span>
                        )}

                        {session.perfil === 'administrador' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDoctorFromRoster(presence.doctorID)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded transition-all cursor-pointer"
                            title="Remover do plantão do dia"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Existing Operating details block */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Timing parameters (5 cols) */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 md:col-span-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" /> Horários de Referência Geral
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Abertura</label>
                <input
                  id="shift-start-input"
                  type="time"
                  disabled={session.perfil !== 'administrador'}
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-blue-600 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase font-mono">Encerramento</label>
                <input
                  id="shift-end-input"
                  type="time"
                  disabled={session.perfil !== 'administrador'}
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-blue-600 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Atalhos de Turnos Gerais</span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  id="preset-diurno-completo"
                  onClick={() => handleApplyPreset('07:00', '19:00')}
                  disabled={session.perfil !== 'administrador'}
                  className="text-left px-3 py-2 border border-slate-100 rounded-lg text-xs hover:bg-slate-50 transition-all font-medium text-slate-700 flex justify-between items-center bg-slate-50/50 disabled:opacity-50 cursor-pointer"
                >
                  <span className="font-semibold">Plantão Diurno Completo</span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">12h (07h-19h)</span>
                </button>

                <button
                  type="button"
                  id="preset-diurno-manha"
                  onClick={() => handleApplyPreset('07:00', '13:00')}
                  disabled={session.perfil !== 'administrador'}
                  className="text-left px-3 py-2 border border-slate-100 rounded-lg text-xs hover:bg-slate-50 transition-all font-medium text-slate-700 flex justify-between items-center bg-slate-50/50 disabled:opacity-50 cursor-pointer"
                >
                  <span className="font-semibold">Plantão Parcial - Manhã</span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">6h (07h-13h)</span>
                </button>

                <button
                  type="button"
                  id="preset-diurno-tarde"
                  onClick={() => handleApplyPreset('13:00', '19:00')}
                  disabled={session.perfil !== 'administrador'}
                  className="text-left px-3 py-2 border border-slate-100 rounded-lg text-xs hover:bg-slate-50 transition-all font-medium text-slate-700 flex justify-between items-center bg-slate-50/50 disabled:opacity-50 cursor-pointer"
                >
                  <span className="font-semibold">Plantão Parcial - Tarde</span>
                  <span className="font-mono text-[10px] text-slate-405 bg-slate-200 px-1.5 py-0.5 rounded">6h (13h-19h)</span>
                </button>
              </div>
            </div>
          </div>

          {session.perfil === 'administrador' && (
            <div className="pt-4 border-t border-slate-100/80 mt-auto">
              <button
                type="button"
                id="save-shift-settings-btn"
                onClick={handleSaveConfig}
                className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Configuração de Referência</span>
              </button>
              {saveSuccess && (
                <p className="text-[10px] text-emerald-600 text-center font-mono font-medium mt-2">
                  ✓ Configurações de expediente diário salvas!
                </p>
              )}
            </div>
          )}
        </section>

        {/* Coordenadores Configuration (7 cols) */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 md:col-span-7 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
              <Award className="h-4 w-4 text-slate-400" /> Líderes de Coordenação do Dia (Máx 2)
            </h3>
            <p className="text-xs text-slate-500">
              Coordenadores selecionados gozam de autonomia de supervisão no plantão diurno, e continuam escaláveis nas salas normais.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {doctors.map(doc => {
                const isSelected = selectedCoords.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleCoordinatorToggle(doc.id)}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? 'bg-blue-50/45 border-blue-250 font-semibold'
                        : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                    } ${session.perfil === 'administrador' ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div>
                      <div className="text-slate-800 font-bold">{doc.nome}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{doc.crm}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="text-[10px] text-blue-700 font-mono bg-blue-100/90 px-2 py-0.5 rounded font-bold flex items-center gap-1 shrink-0">
                          <UserCheck className="h-3 w-3" /> Coordenador Ativo
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Escalável</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
