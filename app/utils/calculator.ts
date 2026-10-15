export interface Task {
    taskNumber: number;
    maxL1: number;
    maxL2: number;
    maxL3: number;
    groupName?: string;
}

export interface Score {
    taskNumber: number;
    scoreL1?: number;
    scoreL2?: number;
    scoreL3?: number;
}

export function calculateGrade(tasks: Task[], scores: Score[]): { earned: number, max: number, percentage: number } {
    let totalEarned = 0;
    let totalMax = 0;

    tasks.forEach(task => {
        totalMax += task.maxL1 + task.maxL2 + task.maxL3;

        const score = scores.find(s => s.taskNumber === task.taskNumber);
        
        let l1Ratio = 0, l2Ratio = 0, l3Ratio = 0;

        if (score) {
            if (task.maxL1 > 0) l1Ratio = (score.scoreL1 || 0) / task.maxL1;
            if (task.maxL2 > 0) l2Ratio = (score.scoreL2 || 0) / task.maxL2;
            if (task.maxL3 > 0) l3Ratio = (score.scoreL3 || 0) / task.maxL3;
        }

        totalEarned += (task.maxL1 + task.maxL2 + task.maxL3) * 
                       ((0.54 * l1Ratio) + (0.9 * l2Ratio) + l3Ratio);
    });

    const finalEarned = Math.round(totalEarned);
    const percentage = totalMax > 0 ? Math.round((finalEarned / totalMax) * 100) : 0;

    return { earned: finalEarned, max: totalMax, percentage };
}