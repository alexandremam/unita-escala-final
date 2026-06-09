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
  Users,
  Trash2,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Clock3,
  Sun,
  Sunset,
  Search,
  Crown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Filter,
  Check,
  User,
  ListTodo,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Repeat
} from 'lucide-react';
import { logSystemEvent } from '../utils';
import UnitaLogo from './UnitaLogo';

interface PlantaoTabProps {
  doctors: Doctor[];
  setDoctors: React.Dispatch<React.SetStateAction<Doctor[]>>;
  session: UserSession;
  setSession?: React.Dispatch<React.SetStateAction<UserSession | null>>;
  dailyPresences: DailyPresence[];
  setDailyPresences: React.Dispatch<React.SetStateAction<DailyPresence[]>>;
  subTab?: 'calendario' | 'escalas';
  setSubTab?: (subTab: 'calendario' | 'escalas') => void;
}

export default function PlantaoTab({
  doctors,
  setDoctors,
  session,
  setSession,
  dailyPresences,
  setDailyPresences,
  subTab: propSubTab,
  setSubTab: propSetSubTab
}: PlantaoTabProps) {
  // 1. Calculate Tomorrow's Date for Preselection as default
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA'); // e.g. "YYYY-MM-DD"
  }, []);

  // 2. Active Wizard Routing State
  const [activeStep, setActiveStep] = useState<number>(1); // Step 1, 2, or 3
  const [selectedDate, setSelectedDate] = useState(tomorrowStr);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [rosterError, setRosterError] = useState('');

  // 3. Temporary state structures representing pending scale edits under selectedDate
  const [tempSelectedDoctorIds, setTempSelectedDoctorIds] = useState<string[]>([]);
  const [tempShiftTypes, setTempShiftTypes] = useState<Record<string, string>>({});
  const [tempCoordinatorIds, setTempCoordinatorIds] = useState<string[]>([]);

  // 4. Persistence Registry for Daily Coordinators
  const [dateCoordinators, setDateCoordinators] = useState<Record<string, string[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('unita_date_coordinators') || '{}');
    } catch (e) {
      return {};
    }
  });

  // Calendar month/year navigation state
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  // Sub-categories and Hover state
  const [localSubTab, localSetSubTab] = useState<'calendario' | 'escalas'>('calendario');
  const subTab = propSubTab !== undefined ? propSubTab : localSubTab;
  const setSubTab = propSetSubTab !== undefined ? propSetSubTab : localSetSubTab;

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // States to facilitate copy-paste and weekly schedule replication
  const [showCopyFromDateDiv, setShowCopyFromDateDiv] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState('');
  const [replicateWeekly, setReplicateWeekly] = useState(false);
  const [replicateWeeksCount, setReplicateWeeksCount] = useState<number>(4);
  const [replicateSpecificDates, setReplicateSpecificDates] = useState(false);
  const [specificDestDates, setSpecificDestDates] = useState<string[]>([]);

  // Automatically load the saved state for selectedDate upon change
  useEffect(() => {
    // A. Detect existing presences for selectedDate
    const preExisting = dailyPresences.filter(p => p.date === selectedDate);
    setTempSelectedDoctorIds(preExisting.map(p => p.doctorID));

    // Map their respective shift configurations
    const preShifts: Record<string, string> = {};
    preExisting.forEach(p => {
      preShifts[p.doctorID] = p.shiftType;
    });
    setTempShiftTypes(preShifts);

    // B. Detect coordinators designated for selectedDate
    const coordsForDate = dateCoordinators[selectedDate] || [];
    setTempCoordinatorIds(coordsForDate);

    // Reset error contexts, success status, and return to Step 1
    setRosterError('');
    setSaveSuccess(false);
    setActiveStep(1);
    
    // Reset replication states for fresh configurations
    setReplicateWeekly(false);
    setReplicateSpecificDates(false);
    setSpecificDestDates([]);
    setShowCopyFromDateDiv(false);
  }, [selectedDate, dailyPresences, dateCoordinators]);

  // Compute filtered search list inside Doctor Picker
  const filteredDoctors = useMemo(() => {
    const term = doctorSearch.toLowerCase().trim();
    if (!term) return doctors;
    return doctors.filter(
      d =>
        d.nome.toLowerCase().includes(term) ||
        d.crm.toLowerCase().includes(term)
    );
  }, [doctors, doctorSearch]);

  // Handle toggling check-status of doctor in Step 1
  const handleToggleDoctorSelection = (docId: string) => {
    if (session.perfil !== 'administrador') {
      alert('Apenas Administradores podem atualizar a equipe de plantonistas.');
      return;
    }

    if (tempSelectedDoctorIds.includes(docId)) {
      setTempSelectedDoctorIds(prev => prev.filter(id => id !== docId));
      // if this doctor was designated as coordinator, remove them from coordinator list as well
      setTempCoordinatorIds(prev => prev.filter(id => id !== docId));
    } else {
      if (tempSelectedDoctorIds.length >= 22) {
        setRosterError('Limite máximo de 22 plantonistas por plantão diário atingido.');
        return;
      }
      setTempSelectedDoctorIds(prev => [...prev, docId]);
      // set general 12h shifts by default if left unassigned
      if (!tempShiftTypes[docId]) {
        setTempShiftTypes(prev => ({ ...prev, [docId]: '12h' }));
      }
      setRosterError('');
    }
  };

  // Process shift change for general doctors
  const handleChangeShiftType = (docId: string, type: string) => {
    setTempShiftTypes(prev => ({
      ...prev,
      [docId]: type
    }));
  };

  // Toggle Coordinator Designation in Step 2 (Restricted to selected list in Step 1, max 2)
  const handleToggleCoordinator = (docId: string) => {
    if (session.perfil !== 'administrador') {
      alert('Apenas Administradores podem definir coordenadores.');
      return;
    }

    if (tempCoordinatorIds.includes(docId)) {
      setTempCoordinatorIds(prev => prev.filter(id => id !== docId));
    } else {
      if (tempCoordinatorIds.length >= 2) {
        setRosterError('É permitido configurar no máximo 2 coordenadores em cada plantão.');
        return;
      }
      setTempCoordinatorIds(prev => [...prev, docId]);
      setRosterError('');
    }
  };

  // Save changes to database (DailyPresence state) inside Step 3
  const handleFinalizeAndConfirmRoster = () => {
    if (session.perfil !== 'administrador') {
      alert('Apenas Administradores têm permissão para salvar escalas de plantão.');
      return;
    }

    // 1. Bulk map DailyPresence records for selected date
    const updatedPresRecords = tempSelectedDoctorIds.map(docId => ({
      id: `pres-${docId}-${selectedDate}`,
      date: selectedDate,
      doctorID: docId,
      shiftType: tempShiftTypes[docId] || '12h'
    }));

    // Filter out previous records for this date and push updated batch
    const remainingPres = dailyPresences.filter(p => p.date !== selectedDate);
    let finalizedPres = [...remainingPres, ...updatedPresRecords];

    // 2. Save Daily assigned Coordinators
    let updatedDateCoords = {
      ...dateCoordinators,
      [selectedDate]: tempCoordinatorIds
    };

    // 2.5 Apply replication logic
    const datesToCopy: string[] = [];
    if (replicateWeekly) {
      for (let w = 1; w <= replicateWeeksCount; w++) {
        const parts = selectedDate.split('-');
        const targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        targetDate.setDate(targetDate.getDate() + w * 7);
        const targetDateStr = targetDate.toLocaleDateString('en-CA');
        datesToCopy.push(targetDateStr);
      }
    } else if (replicateSpecificDates && specificDestDates.length > 0) {
      datesToCopy.push(...specificDestDates);
    }

    if (datesToCopy.length > 0) {
      datesToCopy.forEach(destDate => {
        // Strip previous presences for destDate
        finalizedPres = finalizedPres.filter(p => p.date !== destDate);
        
        // Add duplicate presence records
        tempSelectedDoctorIds.forEach(docId => {
          finalizedPres.push({
            id: `pres-${docId}-${destDate}`,
            date: destDate,
            doctorID: docId,
            shiftType: tempShiftTypes[docId] || '12h'
          });
        });
        
        // Add duplicate coordinator record
        updatedDateCoords[destDate] = tempCoordinatorIds;
      });
    }

    setDailyPresences(finalizedPres);
    localStorage.setItem('unita_daily_presences', JSON.stringify(finalizedPres));

    setDateCoordinators(updatedDateCoords);
    localStorage.setItem('unita_date_coordinators', JSON.stringify(updatedDateCoords));

    // 3. Synchronize global today active coordinators if matching currently active date
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (selectedDate === todayStr) {
      try {
        const activeGlobalShift = JSON.parse(
          localStorage.getItem('unita_shift') || '{"coordenadores":["d20"],"inicio":"07:00","fim":"19:00"}'
        );
        activeGlobalShift.coordenadores = tempCoordinatorIds;
        localStorage.setItem('unita_shift', JSON.stringify(activeGlobalShift));
      } catch (e) {
        console.error('Error synchronizing active shift', e);
      }
    }

    setSaveSuccess(true);
    setRosterError('');
    
    // Log System Audit Trail event
    const doctorsCount = tempSelectedDoctorIds.length;
    const coordinatorsDetails = doctors
      .filter(d => tempCoordinatorIds.includes(d.id))
      .map(d => d.nome)
      .join(' e ') || 'Nenhum';

    let replicationLogSuffix = '';
    if (datesToCopy.length > 0) {
      replicationLogSuffix = ` Replicado escala para outras ${datesToCopy.length} semanas/datas futuras.`;
    }

    logSystemEvent(
      session.usuario,
      session.perfil,
      'Entrada no plantão',
      `Consolidou roteiro para ${selectedDate.split('-').reverse().join('/')}: ${doctorsCount} médicos escalados. Coordenador(es) designado(s): ${coordinatorsDetails}.${replicationLogSuffix}`
    );

    // Timeout alert success styling
    setTimeout(() => {
      setSaveSuccess(false);
    }, 5000);
  };

  // Handle simulations to quickly test Coordinator workspace features
  const handleSimulateCustomCoordinator = (coordinatorId: string) => {
    if (!setSession) return;
    const targetDoc = doctors.find(d => d.id === coordinatorId);
    if (!targetDoc) return;

    // Save backup admin registry
    localStorage.setItem('unita_admin_backup', JSON.stringify(session));

    // Swap active context to Coordenador
    const mockSession: UserSession = {
      usuario: targetDoc.nome,
      perfil: 'coordenador'
    };

    localStorage.setItem('unita_session', JSON.stringify(mockSession));
    setSession(mockSession);

    logSystemEvent(
      session.usuario,
      session.perfil,
      'Alteração de coordenador',
      `Privilégios liberados via simulador para Coordenador do Plantão: Dr(a). ${targetDoc.nome}.`
    );

    alert(`Portal de Coordenador Liberado! Você foi transferido para o perfil de Dr(a). ${targetDoc.nome}.`);
  };

  // Revert active simulation back to Administrators
  const handleRevertSimulation = () => {
    if (!setSession) return;
    const backup = localStorage.getItem('unita_admin_backup');
    if (backup) {
      const parsed = JSON.parse(backup) as UserSession;
      localStorage.setItem('unita_session', JSON.stringify(parsed));
      setSession(parsed);
      localStorage.removeItem('unita_admin_backup');
    } else {
      const adminSession: UserSession = { usuario: 'Admin', perfil: 'administrador' };
      localStorage.setItem('unita_session', JSON.stringify(adminSession));
      setSession(adminSession);
    }
  };

  const isSimulated = useMemo(() => {
    return localStorage.getItem('unita_admin_backup') !== null;
  }, [session]);

  // Calendar Logic Math Calculations
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0: Sun ... 6: Sat
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateString: dStr
      });
    }
    return days;
  }, [calendarMonth]);

  const monthLabel = useMemo(() => {
    const names = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${names[calendarMonth.getMonth()]} de ${calendarMonth.getFullYear()}`;
  }, [calendarMonth]);

  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // List doctors matching the selected ids
  const selectedDoctorsList = useMemo(() => {
    return doctors.filter(d => tempSelectedDoctorIds.includes(d.id));
  }, [doctors, tempSelectedDoctorIds]);

  // List of active chosen coordinators
  const coordinatorDoctorsList = useMemo(() => {
    return doctors.filter(d => tempCoordinatorIds.includes(d.id));
  }, [doctors, tempCoordinatorIds]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="plantao-tab-container">
      {/* Simulation Banner Info */}
      {isSimulated && (
        <div className="bg-amber-600/95 backdrop-blur-md text-white rounded-xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 shrink-0 text-amber-200" />
            <div>
              <p className="text-sm font-bold">Modo Coordenador Simulado Ativo</p>
              <p className="text-xs text-amber-100 font-medium">
                Sessão redirecionada. Você está visualizando o portal como <strong>{session.usuario}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={handleRevertSimulation}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-amber-950 rounded-lg text-xs font-black uppercase transition-all shadow-sm cursor-pointer"
          >
            Reverter para Admin
          </button>
        </div>
      )}

      {/* Main Title Banner & Date picker */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs">
        <div className="flex items-center gap-3">
          <UnitaLogo size={36} className="p-1 rounded-lg bg-slate-50 border border-slate-150 shadow-3xs" />
          <div>
            <h2 className="text-lg font-black text-slate-950 font-display">Roteiro & Escala de Plantonistas</h2>
            <p className="text-xs text-slate-500 font-medium">
              Gestão programada de profissionais ativos, definição de lideranças em 3 etapas integradas.
            </p>
          </div>
        </div>

        {/* Dynamic Date Selector */}
        <div className="flex items-center gap-2 font-sans text-xs">
          <label htmlFor="roster-active-date" className="font-extrabold text-slate-800 uppercase tracking-widest text-[10px]">
            Data de Referência:
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
            </span>
            <input
              id="roster-active-date"
              type="date"
              className="pl-8 pr-3 py-1.5 font-bold border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden text-slate-800 bg-slate-50 cursor-pointer shadow-3xs font-mono"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setRosterError('');
                setSaveSuccess(false);
              }}
            />
          </div>
        </div>
      </div>

      {session.perfil !== 'administrador' && !isSimulated && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3 text-xs leading-relaxed text-amber-900">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Acesso restrito ao perfil Administrador:</span> Você está logado no sistema como Coordenador de Turno. Funcionalidades de planejamento de escala futura, cadastro de líderes e simulações só podem ser executadas por Administradores.
          </div>
        </div>
      )}

      {subTab === 'escalas' ? (
        <div className="space-y-6 animate-fade-in" id="wizard-scale-workspace">
          {/* THREE STEP STEPPER INDICATOR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs">
        <div className="grid grid-cols-3 gap-2">
          {/* Step 1 indicator */}
          <button
            onClick={() => {
              setRosterError('');
              setActiveStep(1);
            }}
            className={`flex flex-col md:flex-row items-center gap-2 p-3 rounded-xl transition-all text-left ${
              activeStep === 1
                ? 'bg-blue-50/50 border border-blue-200'
                : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-150 text-slate-600'
            }`}>
              1
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 tracking-tight leading-tight">Escolher Plantonistas</p>
              <p className="hidden md:block text-[10px] text-slate-500 font-medium truncate">Selecionar equipe (máx. 22)</p>
            </div>
          </button>

          {/* Step 2 indicator */}
          <button
            onClick={() => {
              if (tempSelectedDoctorIds.length === 0) {
                setRosterError('Selecione pelo menos um plantonista na Etapa 1 antes de gerenciar a coordenação.');
                return;
              }
              setRosterError('');
              setActiveStep(2);
            }}
            className={`flex flex-col md:flex-row items-center gap-2 p-3 rounded-xl transition-all text-left ${
              activeStep === 2
                ? 'bg-blue-50/50 border border-blue-200'
                : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-150 text-slate-600'
            }`}>
              2
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 tracking-tight leading-tight font-display">Definir Coordenação</p>
              <p className="hidden md:block text-[10px] text-slate-500 font-medium truncate">Indicar líderes do dia (até 2)</p>
            </div>
          </button>

          {/* Step 3 indicator */}
          <button
            onClick={() => {
              if (tempSelectedDoctorIds.length === 0) {
                setRosterError('Selecione os médicos escalados na Etapa 1 antes de validar o plantão.');
                return;
              }
              setRosterError('');
              setActiveStep(3);
            }}
            className={`flex flex-col md:flex-row items-center gap-2 p-3 rounded-xl transition-all text-left ${
              activeStep === 3
                ? 'bg-blue-50/50 border border-blue-200'
                : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
              activeStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-150 text-slate-600'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 tracking-tight leading-tight">Revisar & Registrar</p>
              <p className="hidden md:block text-[10px] text-slate-500 font-medium truncate">Auditoria automática e envio</p>
            </div>
          </button>
        </div>

        {rosterError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-bounce">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{rosterError}</span>
          </div>
        )}
      </div>

      {/* ACTIVE STEP WORKSPACE WIDGETS */}
      <div className="transition-all duration-300">
        
        {/* ================= STEP 1: SELECT DOCTORS AND TARGET SHIFTS ================= */}
        {activeStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Search CheckBox List (Left Panel - 5 cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest flex justify-between items-center">
                  <span>Banco de Anestesiologistas</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                    tempSelectedDoctorIds.length > 20 ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {tempSelectedDoctorIds.length} / 22 Máx
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  Marque as caixas para cadastrar a presença oficial do anestesista no plantão.
                </p>
              </div>

              {/* Dynamic search input */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 text-slate-800"
                  placeholder="Pesquisar por nome ou CRM..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                />
              </div>

              {/* Copiar Escala de Outra Data */}
              {session.perfil === 'administrador' && (
                <div className="border border-blue-100 bg-blue-50/20 rounded-xl p-2.5 space-y-1.5" id="copy-roster-feature">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCopyFromDateDiv(!showCopyFromDateDiv)}
                      className="text-[10px] font-black uppercase text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-transparent border-none"
                    >
                      <Repeat className="h-3.5 w-3.5" /> Copiar escala de outro dia
                    </button>
                    {showCopyFromDateDiv && (
                      <button
                        type="button"
                        onClick={() => setShowCopyFromDateDiv(false)}
                        className="text-[10px] uppercase font-black text-slate-400 hover:text-slate-600 bg-transparent border-none"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {showCopyFromDateDiv && (
                    <div className="space-y-1.5 pt-1 animate-fade-in">
                      <label htmlFor="copy-source-date-input" className="block text-[9px] font-extrabold uppercase text-slate-500">Selecione o dia de origem para copiar:</label>
                      <div className="flex gap-2">
                        <input
                          id="copy-source-date-input"
                          type="date"
                          value={copySourceDate}
                          onChange={(e) => setCopySourceDate(e.target.value)}
                          className="flex-1 text-[10.5px] px-2 py-1 border border-slate-200 rounded font-mono bg-white text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!copySourceDate) {
                              alert('Selecione uma data para servir de modelo.');
                              return;
                            }
                            // Process copy action
                            const sourcePresences = dailyPresences.filter(p => p.date === copySourceDate);
                            if (sourcePresences.length === 0) {
                              alert('Nenhuma escala configurada encontrada para essa data de origem.');
                              return;
                            }
                            const sourceDocIds = sourcePresences.map(p => p.doctorID);
                            const sourceShifts: Record<string, string> = {};
                            sourcePresences.forEach(p => {
                              sourceShifts[p.doctorID] = p.shiftType;
                            });

                            const sourceCoords = dateCoordinators[copySourceDate] || [];

                            setTempSelectedDoctorIds(sourceDocIds);
                            setTempShiftTypes(sourceShifts);
                            setTempCoordinatorIds(sourceCoords);

                            alert(`Escala de ${copySourceDate.split('-').reverse().join('/')} carregada com sucesso! (${sourceDocIds.length} plantonistas e ${sourceCoords.length} coordenadores).`);
                            setShowCopyFromDateDiv(false);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-extrabold uppercase tracking-wide cursor-pointer flex items-center gap-1 shadow-2xs border-none"
                        >
                          Carregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fast Selector Scroll */}
              <div className="border border-slate-150 rounded-xl divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1 bg-slate-50/40">
                {filteredDoctors.length === 0 ? (
                  <p className="text-center py-10 text-xs text-slate-400 italic">
                    Nenhum anestesista correspondente encontrado.
                  </p>
                ) : (
                  filteredDoctors.map(doc => {
                    const isSelected = tempSelectedDoctorIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleToggleDoctorSelection(doc.id)}
                        className={`flex items-center gap-3 p-2.5 hover:bg-slate-50 transition-colors select-none ${
                          session.perfil === 'administrador' ? 'cursor-pointer' : 'cursor-default opacity-80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`check-doctor-picker-${doc.id}`}
                          checked={isSelected}
                          disabled={session.perfil !== 'administrador'}
                          readOnly
                          className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded-sm focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                            {doc.nome}
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono mt-0.5">
                            <span>CRM {doc.crm}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Shift Assignment List (Right Panel - 7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest flex items-center justify-between">
                    <span>Configuração de Períodos de Plantão</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      Data: {selectedDate.split('-').reverse().join('/')}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-tight mt-1">
                    Defina o período de permanência de cada médico presente (12h, 6h Manhã ou Tarde).
                  </p>
                </div>

                {selectedDoctorsList.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <ListTodo className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    Nenhum anestesista selecionado para este plantão ainda.
                    <br />
                    <span className="text-[10px] text-slate-400 font-normal">Selecione profissionais no painel esquerdo para começar.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedDoctorsList.map(doc => {
                      const activeShiftType = tempShiftTypes[doc.id] || '12h';
                      const shiftParts = activeShiftType.split(',');
                      const hasExtendido = shiftParts.includes('extendido');
                      const primaryVal = shiftParts.filter(p => p !== 'extendido')[0] || 'none';

                      const handlePrimaryChange = (docId: string, newPrimary: string) => {
                        let finalVal = '';
                        if (newPrimary !== 'none') {
                          finalVal = newPrimary;
                        }
                        if (hasExtendido) {
                          finalVal = finalVal ? `${finalVal},extendido` : 'extendido';
                        }
                        if (!finalVal) {
                          finalVal = '12h'; // fallback
                        }
                        handleChangeShiftType(docId, finalVal);
                      };

                      const handleToggleExtendidoLocal = (docId: string) => {
                        let finalVal = '';
                        if (primaryVal !== 'none') {
                          finalVal = primaryVal;
                        }
                        if (!hasExtendido) {
                          finalVal = finalVal ? `${finalVal},extendido` : 'extendido';
                        }
                        if (!finalVal) {
                          finalVal = '12h'; // fallback
                        }
                        handleChangeShiftType(docId, finalVal);
                      };

                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 truncate">{doc.nome}</p>
                            <p className="text-[9px] font-mono text-slate-500 mt-0.5">CRM {doc.crm}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Primary Shift Select */}
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Período Diurno</span>
                              <select
                                disabled={session.perfil !== 'administrador'}
                                value={primaryVal}
                                onChange={(e) => handlePrimaryChange(doc.id, e.target.value)}
                                className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-250 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                              >
                                <option value="12h">Integral (12h)</option>
                                <option value="6h-manha">Manhã (6h)</option>
                                <option value="6h-tarde">Tarde (6h)</option>
                                <option value="none">Apenas Extendido (Noite)</option>
                              </select>
                            </div>

                            {/* Extendido Concurrent Checkbox */}
                            <button
                              type="button"
                              disabled={session.perfil !== 'administrador'}
                              onClick={() => handleToggleExtendidoLocal(doc.id)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md border flex items-center gap-1.5 transition-all cursor-pointer ${
                                hasExtendido
                                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-extrabold'
                                  : 'bg-white border-slate-250 text-slate-500 hover:bg-slate-50'
                              }`}
                              title="Permitir plantão extendido (19:00h às 23:59h) em paralelo"
                            >
                              <Clock3 className={`h-3.5 w-3.5 ${hasExtendido ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span>Extendido</span>
                              <div className={`w-2 h-2 rounded-full ${hasExtendido ? 'bg-blue-600 animate-pulse' : 'bg-slate-350'}`} />
                            </button>

                            {session.perfil === 'administrador' && (
                              <button
                                onClick={() => handleToggleDoctorSelection(doc.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-sm hover:bg-rose-50 transition-colors"
                                title="Desmarcar Presença"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step Navigation Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-[10px] text-slate-500 font-medium">
                  {tempSelectedDoctorIds.length} médico(s) presente(s) no Roteiro.
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (tempSelectedDoctorIds.length === 0) {
                      setRosterError('Selecione pelo menos um profissional no painel antes de avançar.');
                      return;
                    }
                    setRosterError('');
                    setActiveStep(2);
                  }}
                  disabled={tempSelectedDoctorIds.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black uppercase transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  Etapa 2: Definir Coordenadores <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SELECT UP TO 2 COORDINATORS ================= */}
        {activeStep === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                  Designação de Coordenadores do Turno
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  Selecione até 2 profissionais pré-selecionados na Etapa Anterior para assumirem a liderança do expediente clínico.
                </p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded font-black self-start sm:self-center ${
                tempCoordinatorIds.length === 2 ? 'bg-amber-100 text-amber-800' : 'bg-indigo-50 text-indigo-700'
              }`}>
                Coordenadores: {tempCoordinatorIds.length} / 2 designados
              </span>
            </div>

            {selectedDoctorsList.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400 italic">
                Nenhum médico escalado. Por favor, volte para a Etapa 1.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedDoctorsList.map(doc => {
                  const isCoord = tempCoordinatorIds.includes(doc.id);
                  const getShiftText = (val: string) => {
                    if (!val) return 'Personalizado';
                    const parts = val.split(',');
                    const out: string[] = [];
                    if (parts.includes('12h')) out.push('Integral 12h');
                    if (parts.includes('6h-manhã') || parts.includes('6h-manha')) out.push('Manhã 6h');
                    if (parts.includes('6h-tarde')) out.push('Tarde 6h');
                    if (parts.includes('extendido')) out.push('Extendido 19h-24h');
                    return out.length > 0 ? out.join(' + ') : 'Personalizado';
                  };
                  const shiftText = getShiftText(tempShiftTypes[doc.id] || '12h');
                  
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleToggleCoordinator(doc.id)}
                      className={`p-4 rounded-2xl border transition-all select-none cursor-pointer flex flex-col justify-between min-h-[120px] relative ${
                        isCoord
                          ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/10 shadow-3xs'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      {/* Check Crown Indicator */}
                      <div className="absolute top-3 right-3">
                        {isCoord ? (
                          <div className="text-amber-500 bg-amber-50 border border-amber-200 p-1 rounded-full shadow-3xs">
                            <Crown className="h-4 w-4 fill-amber-300" />
                          </div>
                        ) : (
                          <div className="text-slate-300 bg-white border border-slate-200 p-1 rounded-full hover:text-slate-500">
                            <Shield className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 max-w-[85%]">
                        <p className={`text-xs font-black truncate ${isCoord ? 'text-indigo-950 font-black' : 'text-slate-800'}`}>
                          {doc.nome}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">CRM {doc.crm}</p>
                        <span className="inline-block text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-sm">
                          Regime: {shiftText}
                        </span>
                      </div>

                      {/* Simulation switch inside the card when active */}
                      {isCoord && (
                        <div className="mt-3 pt-2.5 border-t border-indigo-100/50">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid untoggling coordinator status
                              handleSimulateCustomCoordinator(doc.id);
                            }}
                            className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[9px] font-black uppercase tracking-wider transition-all shadow-3xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Liberar Coordenador
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Navigation Buttons Step 2 */}
            <div className="pt-4 border-t border-slate-150 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setRosterError('');
                  setActiveStep(1);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-black text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Plantonistas
              </button>

              <button
                type="button"
                onClick={() => {
                  setRosterError('');
                  setActiveStep(3);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                Etapa 3: Revisar & Confirmar <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: AUDIT PROTOCOL AND CONCLUDE WRITE ================= */}
        {activeStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Summary Review (Left Column) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest">
                  Resumo Executivo da Escala Planejada
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Confira as informações estruturadas da data antes de efetivar e homologar no banco de dados.
                </p>
              </div>

              {/* Hero Statistics info */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-center">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Data Oficial</span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    {selectedDate.split('-').reverse().join('/')}
                  </span>
                </div>
                <div className="text-center border-x border-slate-150">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Escala</span>
                  <span className="text-xs font-black text-slate-800">
                    {tempSelectedDoctorIds.length} médico(s)
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Coordenadores</span>
                  <span className="text-xs font-black text-slate-800 text-indigo-700">
                    {tempCoordinatorIds.length} ativo(s)
                  </span>
                </div>
              </div>

              {/* Relação de Coordenadores */}
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Coordenadores Clínicos Designados (Até 2)
                </span>

                {coordinatorDoctorsList.length === 0 ? (
                  <div className="p-3 bg-amber-50/50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Nenhum coordenador clínico selecionado. Recomenda-se designar pelo menos 1 na Etapa 2.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {coordinatorDoctorsList.map(doc => (
                      <div key={doc.id} className="p-3 bg-indigo-50/30 border border-indigo-150 rounded-xl flex items-center justify-between gap-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-indigo-950 truncate">{doc.nome}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">CRM {doc.crm}</p>
                        </div>
                        <div className="text-indigo-600 shrink-0">
                          <Crown className="h-4.5 w-4.5 text-amber-500 fill-amber-300 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Roster Details Grid */}
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  Relação de Anestesistas e Regimes
                </span>

                <div className="border border-slate-150 rounded-xl divide-y divide-slate-100 max-h-[170px] overflow-y-auto pr-1 bg-slate-50/30">
                  {selectedDoctorsList.map(doc => {
                    const currentShiftVal = tempShiftTypes[doc.id] || '12h';
                    const getRegimeStr = (val: string) => {
                      const parts = val.split(',');
                      const out: string[] = [];
                      if (parts.includes('12h')) out.push('Integral 12h');
                      if (parts.includes('6h-manha') || parts.includes('6h-manhã')) out.push('Manhã 6h');
                      if (parts.includes('6h-tarde')) out.push('Tarde 6h');
                      if (parts.includes('extendido')) out.push('Extendido 19-24h');
                      return out.length > 0 ? out.join(' + ') : 'Personalizado';
                    };
                    const regimeStr = getRegimeStr(currentShiftVal);
                    const isAlsoCoord = tempCoordinatorIds.includes(doc.id);
                    return (
                      <div key={doc.id} className="p-2 flex items-center justify-between gap-3 text-[11px]">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate flex items-center gap-1">
                            {doc.nome}
                            {isAlsoCoord && <Crown className="h-3 w-3 text-amber-500 fill-amber-300 shrink-0" />}
                          </p>
                          <p className="text-[9px] font-mono text-slate-500">CRM {doc.crm}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          {regimeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Validation & Confirm button (Right Column) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest">
                    Validação Automática de Postos
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    O sistema de governança clínica executa a conferência imediata de parâmetros:
                  </p>
                </div>

                {/* Checklist checks */}
                <div className="space-y-3 text-xs font-medium">
                  {/* Cap check */}
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {tempSelectedDoctorIds.length > 0 && tempSelectedDoctorIds.length <= 22 ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 leading-tight">Limite de Capacidade Máxima</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {tempSelectedDoctorIds.length} selecionados (o teto operacional rígido é 22 por dia).
                      </p>
                    </div>
                  </div>

                  {/* Date check */}
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 leading-tight">Data do Turno Programado</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Dia: {selectedDate.split('-').reverse().join('/')} (futuro ou corrente de prontidão).
                      </p>
                    </div>
                  </div>

                  {/* Coordinator presence check */}
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {tempCoordinatorIds.length > 0 ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 leading-tight">Liderança do Plantão</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {tempCoordinatorIds.length === 0
                          ? 'Alerta: Escala sem coordenador ativo pode dificultar a aprovação rápida de novos procedimentos.'
                          : `${tempCoordinatorIds.length} Coordenador(es) apto(s) para plantão.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Automation & Replication Selector Panel */}
                {session.perfil === 'administrador' && (
                  <div className="bg-slate-50 border border-slate-205 p-3.5 rounded-xl space-y-2.5 mt-4" id="confirm-replicate-block">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-1.5 rounded bg-blue-105 text-blue-800 text-[8px] font-black uppercase tracking-wider font-sans">Mecanismo</span>
                      <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                        <Repeat className="h-3.5 w-3.5 text-blue-600 animate-spin-slow" /> Replicar esta Escala
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal font-medium">
                      Diminua custos operacionais e evite retrabalho copiando a equipe definida para datas ou semanas futuras.
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setReplicateWeekly(!replicateWeekly);
                          if (replicateSpecificDates) setReplicateSpecificDates(false);
                        }}
                        className={`py-1.5 px-2 text-[10px] font-extrabold uppercase tracking-wide rounded-lg border text-center transition-all cursor-pointer ${
                          replicateWeekly
                            ? 'bg-blue-600 border-blue-600 text-white shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Repetir Semanalmente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplicateSpecificDates(!replicateSpecificDates);
                          if (replicateWeekly) setReplicateWeekly(false);
                        }}
                        className={`py-1.5 px-2 text-[10px] font-extrabold uppercase tracking-wide rounded-lg border text-center transition-all cursor-pointer ${
                          replicateSpecificDates
                            ? 'bg-blue-600 border-blue-600 text-white shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Datas Específicas
                      </button>
                    </div>

                    {replicateWeekly && (
                      <div className="p-2.5 bg-white border border-slate-150 rounded-lg space-y-1.5 animate-fade-in text-[10px]">
                        <label className="block font-black text-slate-700 uppercase">
                          Repetir por quantas semanas consecutivas?
                        </label>
                        <select
                          value={replicateWeeksCount}
                          onChange={(e) => setReplicateWeeksCount(parseInt(e.target.value))}
                          className="w-full text-xs px-2 py-1.5 border border-slate-205 rounded bg-white text-slate-800 font-bold focus:ring-1 focus:ring-blue-600 cursor-pointer"
                        >
                          <option value="4">Próximas 4 semanas (1 mês)</option>
                          <option value="8">Próximas 8 semanas (2 meses)</option>
                          <option value="12">Próximas 12 semanas (3 meses)</option>
                          <option value="24">Indefinidamente (6 meses de salvaguarda - 24 semanas)</option>
                        </select>
                        <p className="text-[9px] text-slate-400 italic">
                          Cria equipes duplicadas para as próximas {replicateWeeksCount} semanas operacionais às {selectedDate.split('-').reverse().slice(0, 1).join('/')} (mesmo dia da semana).
                        </p>
                      </div>
                    )}

                    {replicateSpecificDates && (
                      <div className="p-2.5 bg-white border border-slate-150 rounded-lg space-y-2 animate-fade-in text-[10px]">
                        <label className="block font-black text-slate-700 uppercase">
                          Adicionar data de destino:
                        </label>
                        <input
                          type="date"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !specificDestDates.includes(val)) {
                              setSpecificDestDates(prev => [...prev, val]);
                            }
                          }}
                          className="w-full text-xs px-2 py-1 border border-slate-205 rounded font-mono text-slate-800 bg-slate-50 cursor-pointer"
                        />
                        {specificDestDates.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1.5 max-h-24 overflow-y-auto">
                            {specificDestDates.map(dStr => (
                              <span key={dStr} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 font-mono text-[9px] text-blue-800 font-bold">
                                {dStr.split('-').reverse().slice(0, 2).join('/')}
                                <button
                                  type="button"
                                  onClick={() => setSpecificDestDates(prev => prev.filter(x => x !== dStr))}
                                  className="text-slate-450 hover:text-rose-600 font-black cursor-pointer bg-transparent border-none text-[11px]"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm submit actions */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                {session.perfil === 'administrador' ? (
                  <button
                    type="button"
                    onClick={handleFinalizeAndConfirmRoster}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01]"
                  >
                    <Save className="h-4.5 w-4.5" /> Confirmar e Registrar Plantão
                  </button>
                ) : (
                  <p className="p-3 bg-slate-50 text-slate-500 text-center text-[10px] italic rounded-lg">
                    Apenas administradores podem gravar dados no sistema.
                  </p>
                )}

                {saveSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 animate-bounce">
                    <Sparkles className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
                    ✓ Plantão salvo, validado e integrado com sucesso!
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setRosterError('');
                    setActiveStep(2);
                  }}
                  className="w-full py-1.5 border border-slate-205 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Ajustar Coordenadores
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
      ) : (
      // ================= SUB-TAB: CALENDÁRIO MENSUAL HOVERÁVEL =================
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="calendario-sub-tab">
        {/* Calendario Grid (Left Column - 8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Calendário de Escalas Mensais
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Selecione um dia para detalhes e passe o mouse sobre os dias para inspecionar escalas em tempo real.
              </p>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={handlePrevMonth}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-black text-slate-800 font-display min-w-[124px] text-center bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl font-mono">
                {monthLabel}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-widest py-2 bg-slate-50/50 rounded-xl">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayItem, index) => {
              if (!dayItem) {
                return <div key={`empty-${index}`} className="aspect-square bg-slate-50/10 rounded-xl border border-dashed border-slate-100"></div>;
              }

              const isCurrent = dayItem.dateString === selectedDate;
              const dailyPresListForTile = dailyPresences.filter(p => p.date === dayItem.dateString);
              const escCount = dailyPresListForTile.length;
              const hasRoster = escCount > 0;

              // Check coordinator count
              const coordsOnDay = dateCoordinators[dayItem.dateString] || [];
              const hasCoordOnDay = coordsOnDay.length > 0;

              return (
                <div
                  key={`day-${dayItem.day}`}
                  onClick={() => {
                    setSelectedDate(dayItem.dateString);
                  }}
                  onMouseEnter={() => {
                    setHoveredDate(dayItem.dateString);
                  }}
                  onMouseLeave={() => {
                    setHoveredDate(null);
                  }}
                  className={`aspect-square rounded-xl border p-2 flex flex-col justify-between relative cursor-pointer group transition-all ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50/20 text-blue-850 font-extrabold ring-2 ring-blue-500/20 shadow-xs'
                      : hasRoster
                        ? 'border-emerald-250 bg-emerald-50 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100'
                        : 'border-slate-150 hover:border-slate-350 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono font-bold text-xs">{dayItem.day}</span>

                  {/* Compact layout for counts & crowns */}
                  <div className="flex items-center justify-between mt-auto">
                    {hasRoster ? (
                      <div className="flex items-center gap-1 bg-emerald-100/80 px-1.5 py-0.5 rounded text-[10px] font-black text-emerald-800 shrink-0">
                        <Users className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{escCount}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400 italic">Livre</span>
                    )}

                    {hasCoordOnDay && (
                      <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-300 animate-pulse shrink-0 ml-1" />
                    )}
                  </div>

                  {/* Highlight outline on hovered day */}
                  {hoveredDate === dayItem.dateString && (
                    <div className="absolute inset-0 rounded-xl border-2 border-dashed border-indigo-400 pointer-events-none bg-indigo-50/10" />
                  )}

                  {/* Floating Pop-up with rostered staff on Hover */}
                  {hoveredDate === dayItem.dateString && (
                    <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl p-3 z-50 pointer-events-none transition-all text-xs font-sans text-slate-105 flex flex-col gap-2">
                      {/* Triangle Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-6 border-x-transparent border-t-6 border-t-slate-900 pointer-events-none" />
                      
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-850">
                        <span className="font-sans font-black uppercase text-[10px] tracking-wider text-slate-350">
                          Equipe do Dia {dayItem.day}
                        </span>
                        <span className="font-mono text-[9px] text-slate-400">
                          {dayItem.dateString.split('-').reverse().slice(0, 2).join('/')}
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {dailyPresListForTile.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic py-1 text-center">Nenhum plantonista escalado.</div>
                        ) : (
                          dailyPresListForTile.map(pres => {
                            const doc = doctors.find(d => d.id === pres.doctorID);
                            if (!doc) return null;
                            const isCoord = coordsOnDay.includes(doc.id);

                            const getCompactShift = (val: string) => {
                              const parts = val.split(',');
                              const out: string[] = [];
                              if (parts.includes('12h')) out.push('12h');
                              if (parts.includes('6h-manha') || parts.includes('6h-manhã')) out.push('Manhã');
                              if (parts.includes('6h-tarde')) out.push('Tarde');
                              if (parts.includes('extendido')) out.push('Extendido');
                              return out.length > 0 ? out.join('+') : '12h';
                            };

                            return (
                              <div key={pres.id} className="flex items-center justify-between gap-1 py-0.5">
                                <span className="font-bold flex items-center gap-1 truncate max-w-[150px] text-white">
                                  {isCoord && <Crown className="h-3 w-3 text-amber-400 fill-amber-300 shrink-0" />}
                                  {doc.nome}
                                </span>
                                <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase transition-colors shrink-0 ${
                                  isCoord ? 'bg-amber-500 text-slate-950 font-black font-sans' : 'bg-slate-800 text-blue-300'
                                }`}>
                                  {getCompactShift(pres.shiftType)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-3 border-t border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-200"></span>
              <span>Com Plantonistas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-300" />
              <span>Possui Coordenador</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded border-2 border-blue-600 bg-blue-50/20"></span>
              <span>Dia Selecionado</span>
            </div>
            <div className="flex items-center gap-1.5 animate-pulse">
              <span className="w-2.5 h-2.5 rounded border-2 border-dashed border-indigo-400 bg-indigo-50/10"></span>
              <span>Cursor (Hover)</span>
            </div>
          </div>
        </div>

        {/* Quick Peek Details (Right Column - 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 block mb-1">
                {hoveredDate ? '⚡ Visualizando no Cursor' : '✓ Dia Selecionado'}
              </span>
              <h3 className="text-sm font-black text-slate-900 font-sans flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-650" />
                {(hoveredDate || selectedDate).split('-').reverse().join('/')}
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-1 font-medium leading-tight">
                {hoveredDate 
                  ? 'Inspecionando equipe correspondente ao dia abaixo do mouse.' 
                  : 'Abaixo estão os profissionais confirmados para a data selecionada.'}
              </p>
            </div>

            {/* Roster list for target date */}
            {(() => {
              const targetDateString = hoveredDate || selectedDate;
              const listForDate = dailyPresences.filter(p => p.date === targetDateString);
              const coordsOnDay = dateCoordinators[targetDateString] || [];

              if (listForDate.length === 0) {
                return (
                  <div className="py-12 bg-slate-50 border border-dashed border-slate-200 text-center rounded-xl px-4">
                    <ShieldAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-black text-slate-700">Sem Plantonistas Cadastrados</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Não existem profissionais e lideranças definidos neste dia.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Equipe ({listForDate.length})</span>
                    <span>Período</span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {listForDate.map(pres => {
                      const doc = doctors.find(d => d.id === pres.doctorID);
                      if (!doc) return null;
                      const isCoord = coordsOnDay.includes(doc.id);

                      const getRegimeStr = (val: string) => {
                        const parts = val.split(',');
                        const out: string[] = [];
                        if (parts.includes('12h')) out.push('12h');
                        if (parts.includes('6h-manha') || parts.includes('6h-manhã')) out.push('Manhã (6h)');
                        if (parts.includes('6h-tarde')) out.push('Tarde (6h)');
                        if (parts.includes('extendido')) out.push('Extendido (5h)');
                        return out.length > 0 ? out.join(' + ') : '12h';
                      };

                      return (
                        <div
                          key={pres.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                            isCoord 
                              ? 'bg-amber-50 border-amber-205 text-amber-950 font-extrabold shadow-3xs' 
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-850 truncate flex items-center gap-1.5">
                              {doc.nome}
                              {isCoord && (
                                <Crown className="h-3 w-3 text-amber-500 fill-amber-300 shrink-0" />
                              )}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">CRM {doc.crm}</p>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            isCoord
                              ? 'bg-amber-600 text-white font-black'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {getRegimeStr(pres.shiftType)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Editing Action redirection button */}
            {session.perfil === 'administrador' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubTab('escalas');
                    // set visual active step to 1 to guide them smoothly
                    setActiveStep(1);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  ✎ Configurar Escala deste Dia
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
