import { UserRole } from '@/constants/roles';

export const LEADERSHIP_SAMPLE_DATA = [
  // Senior Leadership
  { full_name: 'Sarah Manager', role: 'SCHOOL MANAGER' as UserRole, email: 'manager@school.com', jobCategory: 'SENIOR_LEADERSHIP' },
  { full_name: 'Henry Head', role: 'HEAD TEACHER' as UserRole, email: 'headteacher@school.com', jobCategory: 'SENIOR_LEADERSHIP' },
  { full_name: 'Fiona Finance', role: 'FINANCE OFFICER' as UserRole, email: 'finance@school.com', jobCategory: 'SENIOR_LEADERSHIP' },
  { full_name: 'Oliver Ops', role: 'OPERATIONS OFFICER' as UserRole, email: 'operations@school.com', jobCategory: 'SENIOR_LEADERSHIP' },

  // Intermediate Leadership
  { full_name: 'Ursula Upper', role: 'SECTION HEAD UPPER PRIMARY' as UserRole, email: 'upper@school.com', jobCategory: 'INTERMEDIATE_LEADERSHIP' },
  { full_name: 'Jack Junior', role: 'SECTION HEAD JUNIOR SCHOOL' as UserRole, email: 'junior@school.com', jobCategory: 'INTERMEDIATE_LEADERSHIP' },
  { full_name: 'Larry Lower', role: 'SECTION HEAD LOWER PRIMARY' as UserRole, email: 'lower@school.com', jobCategory: 'INTERMEDIATE_LEADERSHIP' },
  { full_name: 'Carl Curriculum', role: 'CURRICULUM COORDINATOR' as UserRole, email: 'curriculum@school.com', jobCategory: 'INTERMEDIATE_LEADERSHIP' },
  { full_name: 'Ian ICT', role: 'ICT MANAGER' as UserRole, email: 'ict@school.com', jobCategory: 'INTERMEDIATE_LEADERSHIP' },
  { full_name: 'Hannah Cook', role: 'HEADCOOK' as UserRole, email: 'headcook@school.com', jobCategory: 'INTERMEDIATE_LEADERSHIP' },
  { full_name: 'David Driver', role: 'DRIVERS SUPERVISOR' as UserRole, email: 'driversup@school.com', jobCategory: 'INTERMEDIATE_LEADERSHIP' },
  { full_name: 'Claire Cleaner', role: 'CLEANERS SUPERVISOR' as UserRole, email: 'cleanersup@school.com', jobCategory: 'INTERMEDIATE_LEADERSHIP' },

  // Firstline Leadership
  { full_name: 'Peter Panel', role: 'HEAD OF PANELS' as UserRole, email: 'panel@school.com', jobCategory: 'FIRSTLINE_LEADERSHIP' },
  { full_name: 'Clara Class', role: 'CLASS TEACHERS' as UserRole, email: 'class@school.com', jobCategory: 'FIRSTLINE_LEADERSHIP' },
  { full_name: 'Sam Special', role: 'SPECIAL ROLES' as UserRole, email: 'special@school.com', jobCategory: 'FIRSTLINE_LEADERSHIP' },
];
