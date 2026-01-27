
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPeterAppraisal() {
    console.log('--- Checking Peter Kaberere Appraisal ---');

    // 1. Find Peter Kaberere
    const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .ilike('full_name', '%Kaberere%')
        .limit(1);

    if (!users?.length) { console.log("Peter Kaberere not found"); return; }
    const peterId = users[0].id;
    console.log(`Found Peter: ${users[0].full_name} [${peterId}]`);

    // 2. Find Appraisals FOR Peter
    const { data: appraisals, error } = await supabase
        .from('appraisals')
        .select(`
        id, 
        status, 
        appraiser:users!appraiser_id(id, full_name, role),
        updated_at
    `)
        .eq('appraisee_id', peterId);

    if (error) { console.error(error); return; }

    if (appraisals?.length === 0) {
        console.log("No appraisals found for Peter Kaberere.");
    } else {
        console.log(`\nAppraisals found for Peter (${appraisals?.length}):`);
        appraisals?.forEach(a => {
            console.log(`- ID: ${a.id}`);
            const appraiser = Array.isArray(a.appraiser) ? a.appraiser[0] : a.appraiser;
            console.log(`  Appraiser: ${appraiser?.full_name ?? 'Unknown'} (${appraiser?.role ?? 'N/A'}) [${appraiser?.id ?? 'N/A'}]`);
            console.log(`  Status: ${a.status}`);
            console.log(`  Updated: ${a.updated_at}`);
        });
    }

    // 3. Find Emmanuel Nduati
    const { data: emmanuel } = await supabase
        .from('users')
        .select('id, full_name')
        .ilike('full_name', '%Emmanuel%')
        .limit(1);

    if (emmanuel?.length) {
        console.log(`\nEmmanuel Nduati ID: ${emmanuel[0].id}`);
    }
}

checkPeterAppraisal();
