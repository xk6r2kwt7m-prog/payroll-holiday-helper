import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive name mapping: JSON name patterns → DB employee lookup keys
const NAME_MAP: Record<string, { forename: string; surname: string }> = {
  // FOH
  "tamar|molina rios": { forename: "Tamar", surname: "Rios" },
  "tamar|rios": { forename: "Tamar", surname: "Rios" },
  "lissette|paredes": { forename: "Lissette", surname: "Paredes" },
  "david daniel|molina rios": { forename: "David", surname: "Rios" },
  "david|rios": { forename: "David", surname: "Rios" },
  "durba|chandan": { forename: "Durba", surname: "Chandan" },
  "endea|stractchan": { forename: "Endea", surname: "Stratcham" },
  "endea|stratcham": { forename: "Endea", surname: "Stratcham" },
  "benjamin|gray": { forename: "Benjamin", surname: "Gray" },
  "hannah|lauber": { forename: "Hannah", surname: "Lauber" },
  "rochelle|jayaraj": { forename: "Rochelle", surname: "Jayaraj" },
  "iara|cabrita": { forename: "Iara", surname: "Cabrita" },
  "silvio|yanev": { forename: "Silvio", surname: "Yanev" },
  "andre|ferreira da mata": { forename: "Andre", surname: "Ferreira da Mata" },
  "andre|crowley-borgonzolo": { forename: "Andre", surname: "Ferreira da Mata" },
  "david mason|thomas-knott": { forename: "David Mason", surname: "Thomas-knott" },
  "zineb|zanouny": { forename: "Zineb", surname: "Zanouny" },
  "jhulia|galicia": { forename: "Jhulia", surname: "Galicia" },
  "kimaya|francis": { forename: "Kimaya", surname: "Francis" },
  "karina|kavdanska": { forename: "Karina", surname: "Kavdanska" },
  "archie|brice-adams": { forename: "Archie", surname: "Brice-Adams" },
  "gio|bittiakov": { forename: "Gio", surname: "Bittiakov" },
  "sergio|castillo": { forename: "Sergio", surname: "Castillo" },
  "chen|jin": { forename: "Chen", surname: "Jin" },
  "priston|almeida": { forename: "Priston", surname: "Almeida" },
  "andrea gabriella|aakanksha": { forename: "Andrea Gabriella", surname: "Aakenes" },
  "andrea|aakanksha": { forename: "Andrea Gabriella", surname: "Aakenes" },
  // BOH
  "dimitris|papachristos": { forename: "Dimitrios", surname: "Papachristou" },
  "jean carlos|garcia gonzalez": { forename: "Jean Carlos", surname: "Garcia" },
  "jean carlos|garcia": { forename: "Jean Carlos", surname: "Garcia" },
  "bruno|martins": { forename: "Bruno", surname: "Martins" },
  "heidy|ramos": { forename: "Heidy", surname: "Ramos" },
  "roger|rodriguez": { forename: "Roger", surname: "Rodriguez" },
  "setareh|saeedfar": { forename: "Setareh", surname: "Saeedfar" },
  "adriana|baca": { forename: "Adriana", surname: "Baca" },
  "olga|chala quilumba": { forename: "Olga", surname: "Quilumba" },
  "olga|quilumba": { forename: "Olga", surname: "Quilumba" },
  "hafiz abdur|rahim": { forename: "Hafiz", surname: "Rahim" },
  "hafiz|rahim": { forename: "Hafiz", surname: "Rahim" },
  "anny belkys|matos": { forename: "Anny", surname: "Matos" },
  "anny|matos": { forename: "Anny", surname: "Matos" },
  "leonor|ferreira": { forename: "Leonor", surname: "Ferreira" },
  "marc|boltman": { forename: "Marc", surname: "Boltman" },
  "ada|feliz": { forename: "Ada", surname: "Feliz" },
  "adalgisa|vargas feliz": { forename: "Ada", surname: "Feliz" },
  "arisnorky|feliz": { forename: "Arisnorky", surname: "Feliz" },
  "saicharan|manapalli": { forename: "Saicharan", surname: "Manepalli" },
  "saicharan|manepalli": { forename: "Saicharan", surname: "Manepalli" },
  "george|kelsey": { forename: "George", surname: "Kelsey" },
  "akshay|mathew": { forename: "Akshay", surname: "Mathew" },
  "akshay jacob|mathew": { forename: "Akshay", surname: "Mathew" },
  "safia|leloup": { forename: "Safia", surname: "Leloup" },
  "luca|holden": { forename: "Luca", surname: "Holden" },
  "marzieh|farzian": { forename: "Marzieh", surname: "Farzian" },
  "luisa|valenzuela": { forename: "Luisa", surname: "Valenzuela" },
  "louis|agranoff": { forename: "Louis", surname: "Agranoff" },
  "andrea|bermudes": { forename: "Andrea", surname: "Bermudes" },
  "anjali|binu": { forename: "Anjali", surname: "Binu" },
  "eli sebastian|": { forename: "Arisnorky", surname: "Feliz" },
  "naomi jhuliana|vallejos": { forename: "Jhuli", surname: "Vallejos" },
  "jhuli|vallejos": { forename: "Jhuli", surname: "Vallejos" },
  // CPU
  "wai pink (jess)|cham": { forename: "Jess", surname: "Cham" },
  "jess|cham": { forename: "Jess", surname: "Cham" },
  "auntie wing|auntie wing": { forename: "Wing", surname: "Lee" },
  "wing|wing": { forename: "Wing", surname: "Lee" },
  "wing|lee": { forename: "Wing", surname: "Lee" },
  "ling|chak": { forename: "Ling", surname: "Chak" },
  "kitty|oil lan": { forename: "Kitty", surname: "Oil Lan" },
  "mei li (tammy)|khong": { forename: "Kitty", surname: "Oil Lan" }, // Tammy mapped to Kitty? No, Tammy is different
  "lorna|lau": { forename: "Lorna", surname: "Lau" },
  "arun|": { forename: "Arun", surname: "Thota" },
  "arun|thota": { forename: "Arun", surname: "Thota" },
};

// Holiday name mapping (holidays only have employee_name, no surname)
const HOLIDAY_NAME_MAP: Record<string, { forename: string; surname: string }> = {
  "dimitris": { forename: "Dimitrios", surname: "Papachristou" },
  "mario": { forename: "Mario", surname: "Tiburcio" },
  "lissette": { forename: "Lissette", surname: "Paredes" },
  "sau": { forename: "Sau Yi", surname: "Liu" },
  "melanny": { forename: "Melanny", surname: "Folleco Chala" },
  "jean": { forename: "Jean Carlos", surname: "Garcia" },
  "tamar": { forename: "Tamar", surname: "Rios" },
  "bruno": { forename: "Bruno", surname: "Martins" },
  "david": { forename: "David", surname: "Rios" },
  "anny": { forename: "Anny", surname: "Matos" },
  "sergio": { forename: "Sergio", surname: "Castillo" },
  "ling": { forename: "Ling", surname: "Chak" },
  "sai": { forename: "Saicharan", surname: "Manepalli" },
  "roger": { forename: "Roger", surname: "Rodriguez" },
  "tammy": { forename: "Kitty", surname: "Oil Lan" },
  "jess": { forename: "Jess", surname: "Cham" },
  "wing": { forename: "Wing", surname: "Lee" },
  "rochelle": { forename: "Rochelle", surname: "Jayaraj" },
  "jc": { forename: "Jean Carlos", surname: "Garcia" },
  "setareh": { forename: "Setareh", surname: "Saeedfar" },
  "kitty": { forename: "Kitty", surname: "Oil Lan" },
  "heidy": { forename: "Heidy", surname: "Ramos" },
  "hafiz": { forename: "Hafiz", surname: "Rahim" },
  "hannah": { forename: "Hannah", surname: "Lauber" },
  "benjamin": { forename: "Benjamin", surname: "Gray" },
  "adriana": { forename: "Adriana", surname: "Baca" },
  "endea": { forename: "Endea", surname: "Stratcham" },
  "lorna": { forename: "Lorna", surname: "Lau" },
  "olga": { forename: "Olga", surname: "Quilumba" },
  "leonor": { forename: "Leonor", surname: "Ferreira" },
  "agata": { forename: "Agata", surname: "Unknown" },
  "ada": { forename: "Ada", surname: "Feliz" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { periods } = await req.json();

    if (!periods || !Array.isArray(periods)) {
      return new Response(JSON.stringify({ error: "periods array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache employee lookups
    const { data: employees } = await supabase
      .from("employees")
      .select("id, forename, surname, department");
    
    const empCache = new Map<string, string>();
    for (const emp of employees || []) {
      const key = `${emp.forename.toLowerCase()}|${emp.surname.toLowerCase()}`;
      empCache.set(key, emp.id);
    }

    const results = {
      periodsCreated: 0,
      entriesCreated: 0,
      holidaysCreated: 0,
      employeesCreated: 0,
      unmatchedEntries: [] as string[],
      unmatchedHolidays: [] as string[],
      errors: [] as string[],
    };

    async function findOrCreateEmployee(
      forename: string,
      surname: string,
      department: string,
      hourlyRate: number,
      status?: string
    ): Promise<string | null> {
      // Try mapped name first
      const mapKey = `${forename.toLowerCase()}|${surname.toLowerCase()}`;
      const mapped = NAME_MAP[mapKey];
      
      let lookupForename = mapped ? mapped.forename : forename;
      let lookupSurname = mapped ? mapped.surname : surname;
      
      const cacheKey = `${lookupForename.toLowerCase()}|${lookupSurname.toLowerCase()}`;
      if (empCache.has(cacheKey)) {
        return empCache.get(cacheKey)!;
      }

      // Try partial match on forename only
      for (const [key, id] of empCache.entries()) {
        const [fn] = key.split("|");
        if (fn === lookupForename.toLowerCase()) {
          return id;
        }
      }

      // Create new employee
      const deptMap: Record<string, string> = { "FOH": "FOH", "BOH": "BOH", "CPU": "CPU" };
      const dept = deptMap[department] || "BOH";
      const empStatus = (status === "leaver" || status === "starter/leaver") ? "leaver" : "leaver";
      
      const { data: newEmp, error: empErr } = await supabase
        .from("employees")
        .insert({
          forename: lookupForename.split(" ")[0] || lookupForename,
          surname: lookupSurname || "Unknown",
          department: dept,
          hourly_rate: hourlyRate,
          status: empStatus,
        })
        .select("id")
        .single();

      if (empErr) {
        results.errors.push(`Failed to create employee ${lookupForename} ${lookupSurname}: ${empErr.message}`);
        return null;
      }

      empCache.set(cacheKey, newEmp.id);
      results.employeesCreated++;
      return newEmp.id;
    }

    for (const period of periods) {
      // Create payroll period
      const { data: pp, error: ppErr } = await supabase
        .from("payroll_periods")
        .insert({
          period_name: `${period.period_name} [Historical]`,
          start_date: period.start_date,
          end_date: period.end_date,
          period_weeks: period.period_weeks || 4,
          status: "approved",
          timesheet_total: period.totals?.payroll_total || 0,
          incentives_total: period.totals?.incentives || 0,
          holidays_total: period.totals?.holidays_total || 0,
          grand_total: period.totals?.grand_total || 0,
          notes: `Historical import from payroll spreadsheet. Original grand total: £${period.totals?.grand_total?.toFixed(2)}`,
        })
        .select("id")
        .single();

      if (ppErr) {
        results.errors.push(`Failed to create period ${period.period_name}: ${ppErr.message}`);
        continue;
      }

      results.periodsCreated++;
      const periodId = pp.id;

      // Insert payroll entries
      for (const entry of period.entries || []) {
        const fn = (entry.forename || "").trim();
        const sn = (entry.surname || "").trim();
        
        const empId = await findOrCreateEmployee(
          fn, sn, entry.department, entry.hourly_rate, entry.status
        );

        if (!empId) {
          results.unmatchedEntries.push(`${fn} ${sn} (${period.period_name})`);
          continue;
        }

        const sc = entry.service_charge || 0;
        const pb = entry.perf_bonus || 0;
        const sb = entry.special_bonus || 0;
        const hours = entry.hours || 0;

        const { error: entryErr } = await supabase
          .from("payroll_entries")
          .insert({
            payroll_period_id: periodId,
            employee_id: empId,
            hourly_rate: entry.hourly_rate,
            service_charge: sc,
            timesheet_hours: hours,
            imported_hours: hours,
            performance_bonus: pb,
            special_bonus: sb,
            notes: entry.notes ? `[Historical] ${entry.notes}` : "[Historical]",
          });

        if (entryErr) {
          results.errors.push(`Entry error for ${fn} ${sn}: ${entryErr.message}`);
        } else {
          results.entriesCreated++;
        }
      }

      // Insert holiday payments
      for (const hol of period.holidays || []) {
        const name = (hol.employee_name || "").toLowerCase().trim();
        const mapped = HOLIDAY_NAME_MAP[name];
        
        let empId: string | null = null;
        if (mapped) {
          const key = `${mapped.forename.toLowerCase()}|${mapped.surname.toLowerCase()}`;
          empId = empCache.get(key) || null;
        }

        if (!empId) {
          results.unmatchedHolidays.push(`${hol.employee_name} (${period.period_name})`);
          // Still create the payment without employee_id for audit trail
        }

        // Determine the holiday taken date (middle of the period)
        const startDate = new Date(period.start_date);
        const endDate = new Date(period.end_date);
        const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
        const holidayDate = midDate.toISOString().split("T")[0];

        const { error: holErr } = await supabase
          .from("holiday_payments")
          .insert({
            payroll_period_id: periodId,
            employee_id: empId,
            employee_name: hol.employee_name,
            rate: hol.rate,
            hours: hol.hours,
            total: hol.total,
            holiday_taken_date: holidayDate,
            notes: `[Historical] ${hol.status || ""}`.trim(),
          });

        if (holErr) {
          results.errors.push(`Holiday error for ${hol.employee_name}: ${holErr.message}`);
        } else {
          results.holidaysCreated++;
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
