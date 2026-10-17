'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculateGrade, Task, Score } from './utils/calculator';
import { Calculator, ChevronRight, ChevronDown, Cpu, GraduationCap, Sparkles, Zap, Search, Check, Download } from 'lucide-react';

interface CloudWork {
  id: number;
  title: string;
  work_type: string;
  class_name: string;
  max_points: number;
  has_groups: boolean;
}

export default function Home() {
  const [works, setWorks] = useState<CloudWork[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedWorkId, setSelectedWorkId] = useState<number | ''>('');
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('A');
  
  const [scores, setScores] = useState<Score[]>([]);
  const [result, setResult] = useState<{ earned: number; max: number; percentage: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // --- STANY WYSZUKIWARKI PRAC ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isWorkDropdownOpen, setIsWorkDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- STANY INSTALACJI PWA ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // --- STANY ZAPISÓW NA POPRAWĘ ---
  const [journalNumber, setJournalNumber] = useState('');
  const [signupStatus, setSignupStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'exists'>('idle');

  // Przechwytywanie gotowości do instalacji
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Zapobiega automatycznemu wyskakiwaniu paska na mobile
      e.preventDefault();
      // Zapisujemy event, aby wywołać go później po kliknięciu naszego przycisku
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Wyświetla systemowy monit o instalację
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Użytkownik zainstalował aplikację');
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Nasłuchiwanie kliknięcia poza wyszukiwarką, aby ją zamknąć
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWorkDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset wyszukiwarki przy zmianie klasy
  useEffect(() => {
    setSearchQuery('');
    setIsWorkDropdownOpen(false);
  }, [selectedClass]);

  useEffect(() => {
    async function fetchWorks() {
      const { data, error } = await supabase.from('cloud_works').select('*');
      if (!error && data) {
        setWorks(data);
        const uniqueClasses = Array.from(new Set(data.map(w => w.class_name))).sort();
        setClasses(uniqueClasses);
      }
      setLoading(false);
    }
    fetchWorks();
  }, []);

  useEffect(() => {
    async function fetchTasks() {
      if (!selectedWorkId) {
        setTasks([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('cloud_tasks')
        .select('*')
        .eq('work_id', selectedWorkId)
        .order('task_number', { ascending: true });

      if (!error && data) {
        const mappedTasks = data.map(t => ({
          taskNumber: t.task_number,
          maxL1: t.max_l1,
          maxL2: t.max_l2,
          maxL3: t.max_l3,
          groupName: t.group_name || 'A'
        }));
        setTasks(mappedTasks);
        
        const uniqueGroups = Array.from(new Set(mappedTasks.map(t => t.groupName))).sort();
        setGroups(uniqueGroups);
        if (uniqueGroups.length > 0 && !uniqueGroups.includes(selectedGroup)) {
          setSelectedGroup(uniqueGroups[0]);
        }
      }
      setLoading(false);
    }
    fetchTasks();
    setScores([]);
    setResult(null);
  }, [selectedWorkId]);

  const handleScoreChange = (taskNumber: number, level: 'scoreL1' | 'scoreL2' | 'scoreL3', value: string, maxLimit: number) => {
    if (value === '') {
      setScores(prev => {
        const existing = prev.find(s => s.taskNumber === taskNumber);
        if (existing) return prev.map(s => s.taskNumber === taskNumber ? { ...s, [level]: undefined } : s);
        return prev;
      });
      return;
    }

    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue) || numValue < 0 || numValue > maxLimit) return;

    setScores(prev => {
      const existing = prev.find(s => s.taskNumber === taskNumber);
      const newScore = {
        taskNumber,
        scoreL1: level === 'scoreL1' ? numValue : undefined,
        scoreL2: level === 'scoreL2' ? numValue : undefined,
        scoreL3: level === 'scoreL3' ? numValue : undefined,
      };
      if (existing) return prev.map(s => s.taskNumber === taskNumber ? newScore : s);
      return [...prev, newScore];
    });
  };

  const currentTasks = tasks.filter(t => t.groupName === selectedGroup);

  const handleCalculate = () => {
    setResult(calculateGrade(currentTasks, scores));
  };

  const handleFillMaxL3 = () => {
    const newScores = currentTasks.map(task => {
      if (task.maxL3 > 0) {
        return {
          taskNumber: task.taskNumber,
          scoreL1: undefined,
          scoreL2: undefined,
          scoreL3: task.maxL3,
        };
      }
      return scores.find(s => s.taskNumber === task.taskNumber) || { taskNumber: task.taskNumber };
    });
    setScores(newScores as Score[]);
  };

  const handleEnterPress = (e: React.KeyboardEvent<HTMLInputElement>, currentTaskIndex: number, levelKey: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      for (let i = currentTaskIndex + 1; i < currentTasks.length; i++) {
        const nextInput = document.getElementById(`input-${i}-${levelKey}`) as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
          return;
        }
      }
      handleCalculate();
    }
  };

  const filteredWorks = works.filter(w => 
    w.class_name === selectedClass && 
    (w.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     w.work_type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRetakeSignup = async () => {
    if (!selectedWorkId || !selectedClass || !journalNumber) return;
    setSignupStatus('loading');

    const num = parseInt(journalNumber);
    if (isNaN(num) || num <= 0) {
      setSignupStatus('error');
      return;
    }

    const { error } = await supabase.from('retake_signups').insert({
      work_id: selectedWorkId,
      class_name: selectedClass,
      journal_number: num
    });

    if (error) {
      if (error.code === '23505') { // Kod błędu unikalności (UNIQUE constraint)
        setSignupStatus('exists');
      } else {
        setSignupStatus('error');
      }
    } else {
      setSignupStatus('success');
      setJournalNumber(''); // Czyszczenie po udanym zapisie
    }
  };

  return (
    <main className="min-h-screen relative bg-slate-950 text-slate-200 selection:bg-cyan-500/30 overflow-hidden pb-12">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="relative max-w-2xl mx-auto p-4 md:p-8 flex flex-col gap-8">
        <header className="flex flex-col items-center text-center gap-4 pt-6 pb-4 border-b border-slate-800/50">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)] mb-1">
            <Calculator className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            Kalkulator punktów
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-xs font-medium text-slate-400 backdrop-blur-sm">
              <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
              <span>Stworzone dla uczniów Śl.TZN</span>
            </div>

            {/* NASZ NOWY PRZYCISK DO INSTALACJI (Pokazuje się tylko, jeśli apka nie jest jeszcze zainstalowana) */}
            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800 hover:bg-cyan-900/60 hover:border-cyan-500 text-xs font-bold text-cyan-400 transition-all shadow-[0_0_10px_-2px_rgba(6,182,212,0.2)] animate-in zoom-in-95"
              >
                <Download className="w-3.5 h-3.5" />
                Dodaj do ekranu
              </button>
            )}
          </div>
        </header>

        <section className="flex flex-col gap-5 bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 shadow-xl">
          <div className="space-y-5">
            {/* WYBÓR KLASY */}
            <div>
              <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 ml-1">Krok 1: Klasa</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-4 pr-10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all shadow-inner"
                  value={selectedClass} 
                  onChange={(e) => { setSelectedClass(e.target.value); setSelectedWorkId(''); }}
                >
                  <option value="">-- wybierz profil --</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* WYBÓR PRACY Z WYSZUKIWARKĄ */}
            {selectedClass && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300" ref={dropdownRef}>
                <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 ml-1">Krok 2: Tytuł oceny</label>
                <div className="relative">
                  <div 
                    className={`w-full bg-slate-950 border text-slate-200 rounded-xl p-4 pr-10 cursor-pointer shadow-inner flex items-center justify-between transition-all ${isWorkDropdownOpen ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-700 hover:border-slate-500'}`}
                    onClick={() => setIsWorkDropdownOpen(!isWorkDropdownOpen)}
                  >
                    <span className={`truncate ${!selectedWorkId ? 'text-slate-400' : ''}`}>
                      {selectedWorkId 
                        ? (() => {
                            const w = works.find(x => x.id === selectedWorkId);
                            return w ? `[${w.work_type.toUpperCase()}] ${w.title}` : '';
                          })()
                        : '-- wyszukaj arkusz --'}
                    </span>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 pointer-events-none">
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isWorkDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                    </div>
                  </div>

                  {/* Rozwijana lista z wyszukiwarką */}
                  {isWorkDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-3 border-b border-slate-800 flex items-center gap-3 bg-slate-950/80">
                        <Search className="w-5 h-5 text-cyan-500" />
                        <input
                          type="text"
                          className="w-full bg-transparent border-none text-slate-200 focus:ring-0 focus:outline-none placeholder-slate-500"
                          placeholder="Wpisz tytuł lub rodzaj..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                      
                      <ul className="max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-950 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {filteredWorks.length > 0 ? (
                          filteredWorks.map(w => (
                            <li 
                              key={w.id}
                              className={`px-5 py-3.5 cursor-pointer text-sm transition-colors flex items-center justify-between border-b border-slate-800/50 last:border-0 ${
                                selectedWorkId === w.id 
                                ? 'bg-cyan-900/30 text-cyan-300' 
                                : 'hover:bg-slate-800 text-slate-300'
                              }`}
                              onClick={() => {
                                setSelectedWorkId(w.id);
                                setIsWorkDropdownOpen(false);
                                setSearchQuery(''); // Czyści wyszukiwarkę po wybraniu
                              }}
                            >
                              <span className="truncate pr-4 font-medium">
                                <span className="text-slate-500 mr-2 text-xs">[{w.work_type.toUpperCase()}]</span> 
                                {w.title}
                              </span>
                              {selectedWorkId === w.id && <Check className="w-5 h-5 text-cyan-400 shrink-0" />}
                            </li>
                          ))
                        ) : (
                          <li className="px-5 py-6 text-sm text-slate-500 text-center flex flex-col items-center gap-2">
                            <Search className="w-6 h-6 text-slate-600 mb-1" />
                            Nie znaleziono pracy dla: "{searchQuery}"
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* WYBÓR GRUPY */}
            {selectedWorkId && groups.length > 1 && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 ml-1">Krok 3: Grupa</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-4 pr-10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all shadow-inner"
                    value={selectedGroup} 
                    onChange={(e) => { setSelectedGroup(e.target.value); setScores([]); setResult(null); }}
                  >
                    {groups.map(g => <option key={g} value={g}>Grupa {g}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {selectedWorkId && currentTasks.length > 0 && (
          <section className="flex flex-col gap-4 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 ml-2 mb-2">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Wprowadź punkty
              </h2>
              <span className="flex-1 h-px bg-slate-800"></span>
              <button
                onClick={handleFillMaxL3}
                className="text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 hover:bg-cyan-900/60 hover:border-cyan-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_10px_-2px_rgba(6,182,212,0.2)]"
                title="Wypełnia Poz III maksymalnymi punktami"
              >
                <Zap className="w-3.5 h-3.5" />
                Max Poz III
              </button>
            </div>
            
            <div className="grid gap-4">
              {currentTasks.map((task, taskIndex) => (
                <div key={task.taskNumber} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 hover:border-slate-600 transition-colors shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-lg text-slate-200">Zadanie {task.taskNumber}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 md:gap-4">
                    {[
                      { key: 'scoreL1', max: task.maxL1, label: 'Poz I' },
                      { key: 'scoreL2', max: task.maxL2, label: 'Poz II' },
                      { key: 'scoreL3', max: task.maxL3, label: 'Poz III' },
                    ].map((level) => (
                      level.max > 0 ? (
                        <div key={level.key} className="flex flex-col gap-1.5 relative group">
                          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{level.label} (max {level.max})</span>
                          <input
                            id={`input-${taskIndex}-${level.key}`}
                            type="number"
                            min="0"
                            max={level.max}
                            step="0.5"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-center text-lg font-semibold text-cyan-50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all placeholder-slate-700"
                            placeholder="-"
                            value={scores.find(s => s.taskNumber === task.taskNumber)?.[level.key as keyof Score] ?? ''}
                            onChange={(e) => handleScoreChange(task.taskNumber, level.key as any, e.target.value, level.max)}
                            onKeyDown={(e) => handleEnterPress(e, taskIndex, level.key)}
                          />
                        </div>
                      ) : (
                        <div key={level.key} className="flex flex-col gap-1.5 opacity-30 cursor-not-allowed">
                          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{level.label}</span>
                          <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center text-slate-600">-</div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleCalculate}
              className="mt-6 group relative w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_-5px_rgba(6,182,212,0.6)]"
            >
              <Sparkles className="w-5 h-5 text-cyan-200" />
              Oblicz Wynik Końcowy
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </section>
        )}

        {result && (
          <section className="relative overflow-hidden bg-slate-900 border border-cyan-500/30 p-8 rounded-3xl flex flex-col items-center justify-center gap-3 mt-4 animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <span className="relative z-10 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em]">Twój wynik punktowy</span>
            
            <div className="relative z-10 flex items-baseline gap-2 drop-shadow-sm">
              <span className="text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-cyan-100 to-cyan-400">
                {result.earned}
              </span>
              <span className="text-4xl font-bold text-slate-500 tracking-tight">
                / {result.max}
              </span>
            </div>
            
            <div className="relative z-10 text-slate-400 font-medium text-lg mt-2 flex items-center gap-2">
              Przeliczenie: <span className="text-cyan-400 font-bold text-2xl">{result.percentage}%</span>
            </div>
          </section>
        )}

        {/* SEKCJA ZAPISU NA POPRAWĘ */}
        {selectedWorkId && (
          <section className="relative overflow-hidden bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl mt-4 shadow-xl">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  Chcesz poprawić tę pracę?
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Wpisz swój numer z dziennika, aby zapisać się na listę poprawkową u nauczyciela.
                </p>
              </div>

              <div className="flex gap-3 items-stretch">
                <input
                  type="number"
                  min="1"
                  max="40"
                  placeholder="Nr"
                  className="w-20 bg-slate-950 border border-slate-700 rounded-xl p-3 text-center text-lg font-bold text-cyan-50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all placeholder-slate-600"
                  value={journalNumber}
                  onChange={(e) => setJournalNumber(e.target.value)}
                  disabled={signupStatus === 'loading' || signupStatus === 'success'}
                />
                <button
                  onClick={handleRetakeSignup}
                  disabled={!journalNumber || signupStatus === 'loading' || signupStatus === 'success'}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {signupStatus === 'loading' ? 'Zapisywanie...' : 
                   signupStatus === 'success' ? 'Zapisanio pomyślnie!' : 'Zapisz mnie na poprawę'}
                </button>
              </div>

              {signupStatus === 'exists' && (
                <p className="text-xs text-amber-400 font-medium">Twój numer jest już na liście do tej pracy.</p>
              )}
              {signupStatus === 'error' && (
                <p className="text-xs text-red-400 font-medium">Wystąpił błąd. Spróbuj ponownie.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}