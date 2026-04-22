import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const staffData = [
  { name: "Emmah Wambui Munuku", job: "Headteacher" },
  { name: "Lola Kamene Mulei", job: "Deputy H/T" },
  { name: "Grace Kabura Njuguna", job: "Teacher" },
  { name: "Desmond Onyango Ochino", job: "Teacher" },
  { name: "Johana Kombutho Kinyua", job: "Teacher" },
  { name: "Andrew Kasumbi Ndunga", job: "Teacher" },
  { name: "Clement Kulubi Okere", job: "Teacher" },
  { name: "Stanvers Mukonzi Muganagani", job: "Teacher" },
  { name: "Shadrack Kipkurui Cheruiyot", job: "Teacher" },
  { name: "Veronica Wangechi Nderitu", job: "Teacher" },
  { name: "Monica Kasiba Olut", job: "Teacher" },
  { name: "Hyline Machuki Mose", job: "Teacher" },
  { name: "Lucy Mwihaki Wangai", job: "Teacher" },
  { name: "Leonard Sang Sung", job: "Teacher" },
  { name: "Lilian Ndunge Mwania", job: "Teacher" },
  { name: "Orpah Mokeira Onkoba", job: "Teacher" },
  { name: "Jane Njeri Mbugua", job: "Teacher" },
  { name: "Evalyne Mwikali Mutemi", job: "Teacher" },
  { name: "Peninah Waithira Thuo", job: "Teacher" },
  { name: "Edwin Ambetsa Mbushuru", job: "Teacher" },
  { name: "Ian Muriithi Muthee", job: "Teacher" },
  { name: "Peninah Muthoni Mwangi", job: "Teacher" },
  { name: "Everline Wagikuyu Njunge", job: "Teacher" },
  { name: "Stephen Mbaya Muketha", job: "Teacher" },
  { name: "Andrew Muyanga Mbwika", job: "Teacher" },
  { name: "Shadrack Musyoka", job: "Teacher" },
  { name: "Leonard Okwero Okinda", job: "Teacher" },
  { name: "Lucy Kendi Mweteri", job: "Teacher" },
  { name: "Susan Wanjiru Mwaura", job: "Teacher" },
  { name: "Philis Naliaka Wanundu", job: "Teacher" },
  { name: "Catherine Wangui Nyayieka", job: "Teacher" },
  { name: "Samuel Wekesa Mukhwana", job: "Teacher" },
  { name: "Isaac Ochieng Jabuya", job: "Teacher" },
  { name: "Joyce Wambui Ndungu", job: "Teacher" },
  { name: "Bernard Nyaberi Chachi", job: "Teacher" },
  { name: "Peter Ndirangu  Kariuki", job: "Teacher" },
  { name: "Derrick Odhiambo Ogola", job: "Music Teacher" },
  { name: "William Nyamweya Songoro", job: "Music Teacher" },
  { name: "Ian mutegi Ngatia", job: "Sport Teacher" },
  { name: "Everline Kerubo Nyaoga", job: "Teacher" },
  { name: "Susan Waringa Kamau", job: "SENCO" },
  { name: "Joyce Wanjiru Nderitu", job: "S.N. Teacher" },
  { name: "Winnie Adhiambo ", job: "S.N. Teacher" },
  { name: "Mary Adongo Omondi", job: "Teacher" },
  { name: "Peter Wainaina Kaberere", job: "ICT" },
  { name: "Emmanuel Nduati Mbugua", job: "ICT" },
  { name: "Martin Chege Macharia", job: "Procurement" },
  { name: "Peter Owino", job: "Finance" },
  { name: "Jacinta Mumbi Munene", job: "Accountant" },
  { name: "Kennedy Nyariki Mumah", job: "Cleaner" },
  { name: "Joseph Githinji Ngechu", job: "Cleaner" },
  { name: "Rachael Shiresi  Ashiona", job: "Cleaner" },
  { name: "Dorah Nasimiyu Mudambo", job: "Cleaner" },
  { name: "Juster Kathambi", job: "Cleaner" },
  { name: "Duke  Obure Okioi", job: "Cleaner" },
  { name: "Sharlet Chepkirui Koech", job: "Cleaner" },
  { name: "Samuel Kabue Wachira ", job: "Cleaner" },
  { name: "Mary Mungai", job: "Librarian" },
  { name: "Lydia Waithera Karanja", job: "Lab Tech" },
  { name: "Rebecca Muthoni Kigathi", job: "Secretary" },
  { name: "Mary Ndereiya Wangui", job: "Secretary" },
  { name: "Jacob Muriuki Ndegwa", job: "Gardener" },
  { name: "Owen Kariuki Kariuki", job: "Cook" },
  { name: "Irene Wanjiru  Kamau", job: "Cook" },
  { name: "Evans Olindo  Kahunzuka", job: "Cook" },
  { name: "Harrison Makau Musembi", job: "Cook" },
  { name: "Joshua Kitheka", job: "Cook" },
  { name: "Antony Achungo Opondo", job: "Driver" },
  { name: "Francis Wainaina Mbugwa", job: "Driver" },
  { name: "Samuel Kimani Wambui", job: "Driver" },
  { name: "James Kinuthia Njeri", job: "Driver" },
  { name: "Joseph Gacheru  Kamau", job: "Driver" },
  { name: "Veronica Mumbi Njoroge", job: "Teacher" },
  { name: "Samuel Lekaai", job: "Coach" },
  { name: "Antony Mwangi Njeri", job: "LifeGuard" },
  { name: "Jackson Irungu Waithera", job: "Coach" },
  { name: "David Mutugi Riungu", job: "Head Cook" },
  { name: "Solomon Kirubi Mwangi", job: "Cook" },
  { name: "Kevin Kaithiru", job: "Teacher" },
  { name: "Linet Omulo", job: "SN Teacher" },
  { name: "Tyson Juma", job: "SN Teacher" },
  { name: "Erick Mugambi", job: "Teacher" },
  { name: "Lorna Etemesi", job: "Teacher" },
  { name: "Phillip Waradi", job: "Teacher" },
  { name: "Rosalind Karimi", job: "Substitute Tr." },
  { name: "Christine Bwire ", job: "Sch. Counselor" }
];

function determineJobCategory(job) {
  const normalizedJob = job.toLowerCase().trim();
  
  if (normalizedJob.includes('headteacher') || normalizedJob.includes('deputy h/t')) return 'SENIOR_LEADERSHIP';
  if (normalizedJob.includes('teacher') || normalizedJob.includes('tr.') || normalizedJob.includes('coach') || normalizedJob.includes('senco')) return 'TEACHING';
  if (normalizedJob.includes('head cook')) return 'FIRSTLINE_LEADERSHIP';
  if (normalizedJob.includes('finance') || normalizedJob.includes('procurement')) return 'NON_TEACHING'; 
  return 'NON_TEACHING';
}

function determineSystemRole(job) {
    const jobUpper = job.toUpperCase().trim();
    if (jobUpper === 'HEADTEACHER') return 'HEAD TEACHER';
    if (jobUpper === 'DEPUTY H/T') return 'DEPUTY HEAD TEACHER'; // Not in enum, but useful for clarity
    if (jobUpper === 'TEACHER' || jobUpper === 'MUSIC TEACHER' || jobUpper === 'SPORT TEACHER' || jobUpper.includes('TEACHER') || jobUpper.includes('TR.')) return 'TEACHERS';
    if (jobUpper === 'SENCO') return 'SPECIAL ROLES';
    if (jobUpper === 'ICT') return 'ICT TECHNICIANS'; // Or ICT MANAGER based on context, default to technician
    if (jobUpper === 'PROCUREMENT') return 'OPERATIONS OFFICER'; // Mapping to closest
    if (jobUpper === 'FINANCE') return 'ACCOUNTANT';
    if (jobUpper === 'ACCOUNTANT') return 'ACCOUNTANT';
    if (jobUpper === 'CLEANER') return 'CLEANERS';
    if (jobUpper === 'LIBRARIAN') return 'SPECIAL ROLES';
    if (jobUpper === 'LAB TECH') return 'SPECIAL ROLES';
    if (jobUpper === 'SECRETARY') return 'SECRETARY';
    if (jobUpper === 'GARDENER') return 'CLEANERS'; // Or CARETAKERS
    if (jobUpper === 'COOK') return 'COOKS';
    if (jobUpper === 'HEAD COOK') return 'HEADCOOK';
    if (jobUpper === 'DRIVER') return 'DRIVERS';
    if (jobUpper === 'COACH') return 'TEACHERS'; // Or SPECIAL ROLES
    if (jobUpper === 'LIFEGUARD') return 'SPECIAL ROLES';
    if (jobUpper === 'SCH. COUNSELOR') return 'SPECIAL ROLES';
    
    return 'TEACHERS'; // Default fallback
}

const excelData = staffData.map(person => {
    // Generate simple email: first.last@school.edu
    const names = person.name.toLowerCase().trim().split(/\s+/);
    const firstName = names[0];
    const lastName = names[names.length - 1];
    const email = `${firstName}.${lastName}@school.edu`;

    return {
        "Full Name": person.name.trim(),
        "Job Title": person.job.trim(), // Keep original job title
        "Role": determineSystemRole(person.job), // Map to system role
        "Job Category": determineJobCategory(person.job),
        "Email": email,
        "Password": "password123",
        "Department": "General" // Default department
    };
});

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(excelData);

// Set column widths
const wscols = [
    {wch: 30}, // Full Name
    {wch: 25}, // Job Title
    {wch: 25}, // Role
    {wch: 25}, // Job Category
    {wch: 35}, // Email
    {wch: 15}, // Password
    {wch: 15}, // Department
];
ws['!cols'] = wscols;

XLSX.utils.book_append_sheet(wb, ws, "Staff Data");

const filename = "Staff_Data_Complete.xlsx";
const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

fs.writeFileSync(filename, buffer);
console.log(`Successfully created ${filename}`);
