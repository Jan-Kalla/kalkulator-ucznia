export interface Task {
  taskNumber: number;
  maxL1: number;
  maxL2: number;
  maxL3: number;
  groupName: string;
}

export interface Score {
  taskNumber: number;
  scoreL1?: number;
  scoreL2?: number;
  scoreL3?: number;
}

export function calculateGrade(tasks: Task[], scores: Score[], M: number) {
  if (!tasks.length || M <= 0) {
    return { earned: 0, max: M || 0, percentage: 0 };
  }

  const alpha1 = 0.54;
  const alpha2 = 0.9;
  const n = tasks.length;
  
  let sumQ1 = 0;
  let sumQ2 = 0;
  let sumQ3 = 0;

  tasks.forEach(task => {
    // Odnajdujemy ocenę dla danego zadania
    const score = scores.find(s => s.taskNumber === task.taskNumber);
    
    // Zdobyte punkty (p_i,j)
    const p1 = score?.scoreL1 || 0;
    const p2 = score?.scoreL2 || 0;
    const p3 = score?.scoreL3 || 0;

    // Maksymalne punkty (P_i,j)
    const P1 = task.maxL1 || 0;
    const P2 = task.maxL2 || 0;
    const P3 = task.maxL3 || 0;

    // Sumujemy stosunki wg wzoru q_i,j = p_i,j / P_i,j
    sumQ1 += (P1 > 0) ? (p1 / P1) : 0;
    sumQ2 += (P2 > 0) ? (p2 / P2) : 0;
    sumQ3 += (P3 > 0) ? (p3 / P3) : 0;
  });

  // Obliczamy r_j
  const r1 = sumQ1 / n;
  const r2 = sumQ2 / n;
  const r3 = sumQ3 / n;

  // Końcowy wynik P = M * (a1*r1 + a2*r2 + r3) (zaokrąglony matematycznie do całości)
  const earned = Math.round(M * (alpha1 * r1 + alpha2 * r2 + r3));
  
  // Procent do wyświetlenia (obcinany w dół jak w dzienniku C#)
  const percentage = M > 0 ? Math.floor((earned / M) * 100) : 0;

  return { earned, max: M, percentage };
}