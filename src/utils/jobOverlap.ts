import { Job } from "@/types";
import { hasTimeOverlap } from "./jobStatus";

export interface JobWithPosition extends Job {
  column: number;
  totalColumns: number;
}

/**
 * Calculates column positions for overlapping jobs to display them side-by-side
 * Similar to how Google Calendar handles overlapping events
 */
export function calculateJobColumns(jobs: Job[]): JobWithPosition[] {
  if (jobs.length === 0) return [];
  
  // Sort by start time, then by duration (longer jobs first)
  const sorted = [...jobs].sort((a, b) => {
    const aStart = new Date(a.startsAt).getTime();
    const bStart = new Date(b.startsAt).getTime();
    if (aStart !== bStart) return aStart - bStart;
    
    // If same start time, longer jobs come first
    const aDur = new Date(a.endsAt).getTime() - aStart;
    const bDur = new Date(b.endsAt).getTime() - bStart;
    return bDur - aDur;
  });
  
  const positioned: JobWithPosition[] = [];
  
  for (const job of sorted) {
    const jobStart = new Date(job.startsAt);
    const jobEnd = new Date(job.endsAt);
    
    // Find jobs that overlap with this one
    const overlapping = positioned.filter(p => 
      hasTimeOverlap(jobStart, jobEnd, new Date(p.startsAt), new Date(p.endsAt))
    );
    
    // Find the first available column
    const usedColumns = new Set(overlapping.map(j => j.column));
    let column = 0;
    while (usedColumns.has(column)) {
      column++;
    }
    
    // Calculate the maximum number of columns needed for this overlap group
    const maxColumns = Math.max(column + 1, ...overlapping.map(j => j.totalColumns));
    
    // Update all overlapping jobs to have the same totalColumns
    overlapping.forEach(j => {
      j.totalColumns = maxColumns;
    });
    
    positioned.push({
      ...job,
      column,
      totalColumns: maxColumns
    });
  }
  
  return positioned;
}
