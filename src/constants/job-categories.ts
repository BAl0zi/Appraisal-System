export type JobCategory = 
  | 'TEACHING'
  | 'NON_TEACHING'
  | 'FIRSTLINE_LEADERSHIP'
  | 'INTERMEDIATE_LEADERSHIP'
  | 'SENIOR_LEADERSHIP';

export const JOB_CATEGORIES: JobCategory[] = [
  'TEACHING',
  'NON_TEACHING',
  'FIRSTLINE_LEADERSHIP',
  'INTERMEDIATE_LEADERSHIP',
  'SENIOR_LEADERSHIP'
];

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  'TEACHING': 'Teaching Staff',
  'NON_TEACHING': 'Non-Teaching Staff',
  'FIRSTLINE_LEADERSHIP': 'Firstline Leadership',
  'INTERMEDIATE_LEADERSHIP': 'Intermediate Leadership',
  'SENIOR_LEADERSHIP': 'Senior Leadership'
};
