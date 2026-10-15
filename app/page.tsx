'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calculateGrade, Task, Score } from './utils/calculator';
import { Calculator, ChevronRight } from 'lucide-react';

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

  // Pobieranie prac z chmury
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

  // Pobieranie zadań po wybraniu pracy
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

  // ULEPSZONA FUNKCJA: Walidacja Max i czyszczenie pozostałych pól
  const handleScoreChange = (taskNumber: number, level: 'scoreL1' | 'scoreL2' | 'scoreL3', value: string, maxLimit: number) => {
    // Obsługa usunięcia wartości z pola
    if (value === '') {
      setScores(prev => {
        const existing = prev.find(s => s.taskNumber === taskNumber);
        if (existing) {
          return prev.map(s => s.taskNumber === taskNumber ? { ...s, [level]: undefined } : s);
        }
        return prev;
      });
      return;
    }

    // Zamiana tekstu na liczbę (wspieramy kropkę i przecinek)
    const numValue = parseFloat(value.replace(',', '.'));
    
    // Zablokuj literki i liczby ujemne
    if (isNaN(numValue) || numValue < 0) return;

    // Zablokuj wartość wyższą niż Max dla danego poziomu
    if (numValue > maxLimit) return;

    setScores(prev => {
      const existing = prev.find(s => s.taskNumber === taskNumber);
      
      // Mutual Exclusivity: Wpisanie oceny resetuje pozostałe dwa poziomy do undefined
      const newScore = {
        taskNumber,
        scoreL1: level === 'scoreL1' ? numValue : undefined,
        scoreL2: level === 'scoreL2' ? numValue : undefined,
        scoreL3: level === 'scoreL3' ? numValue : undefined,
      };

      if (existing) {
        return prev.map(s => s.taskNumber === taskNumber ? newScore : s);
      }
      return [...prev, newScore];
    });
  };

  const handleCalculate = () => {
    const filteredTasks = tasks.filter(t => t.groupName === selectedGroup);
    const res = calculateGrade(filteredTasks, scores);
    setResult(res);
  };

  const currentTasks = tasks.filter(t => t.groupName === selectedGroup);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <header className="flex items-center gap-3 border-b border-gray-800 pb-4">
        <Calculator className="w-8 h-8 text-teal-400" />
        <h1 className="text-2xl font-bold text-gray-100">Kalkulator Ocen</h1>
      </header>

      {/* SEKCJA WYBORU */}
      <section className="flex flex-col gap-4 bg-[#1E1E1E] p-5 rounded-xl border border-gray-800">
        <div>
          <label className="block text-sm text-gray-400 mb-1">1. Wybierz klasę</label>
          <select 
            className="w-full bg-[#2D2D30] border border-gray-700 rounded-md p-3 text-white focus:border-teal-500 focus:outline-none"
            value={selectedClass} 
            onChange={(e) => { setSelectedClass(e.target.value); setSelectedWorkId(''); }}
          >
            <option value="">-- wybierz klasę --</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {selectedClass && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">2. Wybierz pracę pisemną</label>
            <select 
              className="w-full bg-[#2D2D30] border border-gray-700 rounded-md p-3 text-white focus:border-teal-500 focus:outline-none"
              value={selectedWorkId} 
              onChange={(e) => setSelectedWorkId(Number(e.target.value))}
            >
              <option value="">-- wybierz pracę --</option>
              {works.filter(w => w.class_name === selectedClass).map(w => (
                <option key={w.id} value={w.id}>[{w.work_type.toUpperCase()}] {w.title}</option>
              ))}
            </select>
          </div>
        )}

        {selectedWorkId && groups.length > 1 && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">3. Wybierz grupę</label>
            <select 
              className="w-full bg-[#2D2D30] border border-gray-700 rounded-md p-3 text-white focus:border-teal-500 focus:outline-none"
              value={selectedGroup} 
              onChange={(e) => { setSelectedGroup(e.target.value); setScores([]); setResult(null); }}
            >
              {groups.map(g => <option key={g} value={g}>Grupa {g}</option>)}
            </select>
          </div>
        )}
      </section>

      {/* SEKCJA WPISYWANIA PUNKTÓW */}
      {selectedWorkId && currentTasks.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-gray-200">Wpisz swoje punkty:</h2>
          
          <div className="flex flex-col gap-3">
            {currentTasks.map((task) => (
              <div key={task.taskNumber} className="bg-[#1E1E1E] p-4 rounded-xl border border-gray-800 flex flex-col gap-3">
                <div className="font-bold text-teal-400">Zadanie {task.taskNumber}</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'scoreL1', max: task.maxL1, label: 'Poz I' },
                    { key: 'scoreL2', max: task.maxL2, label: 'Poz II' },
                    { key: 'scoreL3', max: task.maxL3, label: 'Poz III' },
                  ].map((level) => (
                    level.max > 0 ? (
                      <div key={level.key} className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400">{level.label} (max {level.max})</span>
                        <input
                          type="number"
                          min="0"
                          max={level.max}
                          step="0.5"
                          className="w-full bg-[#2D2D30] border border-gray-700 rounded-md p-2 text-center text-white focus:border-teal-500 focus:outline-none"
                          value={scores.find(s => s.taskNumber === task.taskNumber)?.[level.key as keyof Score] ?? ''}
                          onChange={(e) => handleScoreChange(task.taskNumber, level.key as any, e.target.value, level.max)}
                        />
                      </div>
                    ) : (
                      <div key={level.key} className="flex flex-col gap-1 opacity-20">
                        <span className="text-xs text-gray-400">{level.label}</span>
                        <div className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md p-2 text-center text-gray-600">-</div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleCalculate}
            className="mt-4 bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            Oblicz mój wynik <ChevronRight className="w-5 h-5" />
          </button>
        </section>
      )}

      {/* SEKCJA WYNIKU */}
      {result && (
        <section className="bg-gradient-to-br from-[#1E2E1E] to-[#1E1E1E] p-6 rounded-xl border border-[#4CAF50] flex flex-col items-center justify-center gap-2 mt-4 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Twój przewidywany wynik</span>
          <div className="text-5xl font-bold text-[#81C784]">
            {result.percentage}%
          </div>
          <div className="text-gray-300 mt-2">
            {result.earned} / {result.max} pkt
          </div>
        </section>
      )}
    </main>
  );
}