const BASE = 'https://api.jolpi.ca/ergast';
const API_LIMIT = 100; // jolpi API caps at 100 per request
const MAX_CONCURRENT = 3; // max parallel requests to avoid 429s
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY = 2000; // base ms for exponential backoff on 429

// Country name → 3-letter race code
const COUNTRY_CODES = {
  'Australia': 'AUS', 'Austria': 'AUT', 'Azerbaijan': 'AZE',
  'Bahrain': 'BHR', 'Belgium': 'BEL', 'Brazil': 'BRA',
  'Canada': 'CAN', 'China': 'CHN', 'France': 'FRA',
  'Germany': 'GER', 'Hungary': 'HUN', 'India': 'IND',
  'Italy': 'ITA', 'Japan': 'JPN', 'Korea': 'KOR',
  'Malaysia': 'MAS', 'Mexico': 'MEX', 'Monaco': 'MCO',
  'Netherlands': 'NLD', 'Portugal': 'POR', 'Qatar': 'QAT',
  'Russia': 'RUS', 'Saudi Arabia': 'SAU', 'Singapore': 'SGP',
  'Spain': 'ESP', 'Sweden': 'SWE', 'Switzerland': 'SWI',
  'Turkey': 'TUR', 'UAE': 'ABU', 'UK': 'GBR',
  'United Kingdom': 'GBR', 'United States': 'USA',
  'USA': 'USA', 'South Korea': 'KOR', 'Morocco': 'MAR',
};

const CIRCUIT_OVERRIDES = {
  'americas': 'USA',
  'vegas': 'LAS',
  'miami': 'MIA',
  'monza': 'ITA',
  'imola': 'EMI',
  'mugello': 'TUS',
  'nurburgring': 'EIF',
  'portimao': 'POR',
  'istanbul': 'TUR',
  'losail': 'QAT',
  'jeddah': 'SAU',
  'sakhir': 'BHR',
  'yas_marina': 'ABU',
  'albert_park': 'AUS',
  'marina_bay': 'SGP',
  'spa': 'BEL',
  'silverstone': 'GBR',
  'baku': 'AZE',
  'villeneuve': 'CAN',
  'monaco': 'MCO',
  'shanghai': 'CHN',
  'suzuka': 'JPN',
  'hungaroring': 'HUN',
  'zandvoort': 'NLD',
  'interlagos': 'SAO',
  'rodriguez': 'MEX',
  'catalunya': 'ESP',
  'red_bull_ring': 'AUT',
  'ricard': 'FRA',
  'hockenheimring': 'GER',
  'sepang': 'MAS',
  'yeongam': 'KOR',
  'buddh': 'IND',
  'sochi': 'RUS',
};

// --- Throttled fetch with retry ---

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Simple concurrency limiter
let activeRequests = 0;
const queue = [];

function enqueue() {
  return new Promise((resolve) => {
    const tryRun = () => {
      if (activeRequests < MAX_CONCURRENT) {
        activeRequests++;
        resolve();
      } else {
        queue.push(tryRun);
      }
    };
    tryRun();
  });
}

function dequeue() {
  activeRequests--;
  if (queue.length > 0) {
    const next = queue.shift();
    next();
  }
}

async function fetchJson(url) {
  await enqueue();
  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = RETRY_BASE_DELAY * Math.pow(2, attempt);
        console.warn(`[f1api] 429 rate-limited, retry ${attempt + 1}/${MAX_RETRIES} (wait ${wait}ms): ${url}`);
        await delay(wait);
        continue;
      }
      if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
      return res.json();
    }
    throw new Error(`API rate-limited after ${MAX_RETRIES} retries: ${url}`);
  } finally {
    dequeue();
  }
}

// Fetch all pages from a paginated endpoint (results can exceed 100 entries)
async function fetchAllPages(baseUrl) {
  const sep = baseUrl.includes('?') ? '&' : '?';
  const first = await fetchJson(`${baseUrl}${sep}limit=${API_LIMIT}&offset=0`);
  const total = parseInt(first.MRData.total, 10);

  if (total <= API_LIMIT) return [first];

  const pages = [first];
  // Fetch remaining pages sequentially in batches to respect rate limits
  const pageCount = Math.ceil((total - API_LIMIT) / API_LIMIT);
  for (let i = 1; i <= pageCount; i++) {
    const offset = i * API_LIMIT;
    const page = await fetchJson(`${baseUrl}${sep}limit=${API_LIMIT}&offset=${offset}`);
    pages.push(page);
  }
  return pages;
}

function getRaceLabel(race) {
  const circuitId = race.Circuit?.circuitId || '';
  for (const [key, code] of Object.entries(CIRCUIT_OVERRIDES)) {
    if (circuitId.includes(key)) return code;
  }
  const country = race.Circuit?.Location?.country || '';
  return COUNTRY_CODES[country] || country.substring(0, 3).toUpperCase();
}

function parseStatus(status, position) {
  if (
    status === 'Finished' ||
    status === 'Lapped' ||
    /^\+\d+ Lap/.test(status)
  ) {
    return parseInt(position, 10);
  }
  if (status === 'Disqualified') return 'DSQ';
  if (status === 'Did not start' || status === 'Did not qualify') return 'DNS';
  return 'DNF';
}

async function fetchDriverStandings(year) {
  const data = await fetchJson(`${BASE}/f1/${year}/driverstandings.json`);
  const list = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
  return list.map((ds) => ({
    pos: parseInt(ds.position, 10),
    name: `${ds.Driver.givenName} ${ds.Driver.familyName}`,
    driverId: ds.Driver.driverId,
    team: ds.Constructors?.[ds.Constructors.length - 1]?.name || '',
    abbr: (ds.Driver.code || ds.Driver.familyName.substring(0, 3)).toUpperCase(),
    num: ds.Driver.permanentNumber || '--',
    pts: parseFloat(ds.points),
  }));
}

async function fetchConstructorStandings(year, driverStandings) {
  const data = await fetchJson(`${BASE}/f1/${year}/constructorstandings.json`);
  const list = data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];
  return list.map((cs) => {
    const teamDrivers = driverStandings
      .filter((d) => d.team === cs.Constructor.name)
      .map((d) => ({ name: d.name, pts: d.pts }));
    return {
      pos: parseInt(cs.position, 10),
      name: cs.Constructor.name,
      constructorId: cs.Constructor.constructorId,
      pts: parseFloat(cs.points),
      drivers: teamDrivers.length > 0 ? teamDrivers : [{ name: 'N/A', pts: 0 }],
    };
  });
}

async function fetchRaceResults(year, totalRounds) {
  const pages = await fetchAllPages(`${BASE}/f1/${year}/results.json`);

  // Merge all races from all pages by round (a race can be split across pages)
  const racesByRound = {};
  for (const page of pages) {
    for (const race of page.MRData.RaceTable.Races || []) {
      const round = parseInt(race.round, 10);
      if (!racesByRound[round]) {
        racesByRound[round] = [];
      }
      racesByRound[round].push(...(race.Results || []));
    }
  }

  // Build per-driver results arrays
  const driverResults = {};
  for (const [roundStr, results] of Object.entries(racesByRound)) {
    const round = parseInt(roundStr, 10);
    for (const result of results) {
      const id = result.Driver.driverId;
      if (!driverResults[id]) {
        driverResults[id] = new Array(totalRounds).fill(null);
      }
      driverResults[id][round - 1] = parseStatus(result.status, result.position);
    }
  }
  return driverResults;
}

async function fetchSeasonCalendar(year) {
  const data = await fetchJson(`${BASE}/f1/${year}.json`);
  const races = data.MRData.RaceTable.Races || [];
  return {
    raceLabels: races.map(getRaceLabel),
    rounds: races.length,
  };
}

// --- Driver season counts (cached globally) ---

const driverSeasonsCache = {};

async function fetchDriverSeasons(driverId) {
  if (driverSeasonsCache[driverId]) return driverSeasonsCache[driverId];
  const data = await fetchJson(`${BASE}/f1/drivers/${driverId}/seasons.json?limit=100`);
  const seasons = (data.MRData.SeasonTable.Seasons || []).map((s) => parseInt(s.season, 10));
  driverSeasonsCache[driverId] = seasons;
  return seasons;
}

function getSeasonNumber(allSeasons, year) {
  if (!allSeasons) return 0;
  return allSeasons.filter((s) => s <= year).length;
}

// --- Qualifying & Race results for Results page ---

// Racing name overrides (API givenName → display name)
const DRIVER_NAME_OVERRIDES = {
  'Andrea Kimi': 'Kimi',
};

function formatDriverName(givenName, familyName) {
  const display = DRIVER_NAME_OVERRIDES[givenName] || givenName;
  return `${display} ${familyName}`;
}

function parseQualiTime(timeStr) {
  if (!timeStr) return null;
  // Format: "1:16.732" or "1:17.001"
  const match = timeStr.match(/^(\d+):(\d+\.\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseFloat(match[2]);
}

function formatGap(poleSec, driverSec) {
  if (poleSec == null || driverSec == null) return 'No time';
  const gap = driverSec - poleSec;
  return `+${gap.toFixed(3)}`;
}

export async function fetchQualifyingResults(year, round) {
  const data = await fetchJson(`${BASE}/f1/${year}/${round}/qualifying.json`);
  const race = data.MRData.RaceTable.Races?.[0];
  if (!race) return null;

  const raw = race.QualifyingResults || [];
  // P1's best time (Q3 preferred)
  const poleTimeStr = raw[0] ? (raw[0].Q3 || raw[0].Q2 || raw[0].Q1) : null;
  const poleSec = parseQualiTime(poleTimeStr);

  const results = raw.map((qr) => {
    const pos = parseInt(qr.position, 10);
    const q3 = qr.Q3 || null;
    const q2 = qr.Q2 || null;
    const q1 = qr.Q1 || null;
    const bestTime = q3 || q2 || q1;
    // Determine which session this driver's best time is from
    const session = q3 ? 'Q3' : (q2 ? 'Q2' : (q1 ? 'Q1' : null));

    // Determine if driver was in Q3 but didn't set a Q3 time
    // Q3 drivers are P1-P10; if they have Q2 but no Q3, they didn't set a final time
    const inQ3 = pos <= 10;
    const noQ3Lap = inQ3 && !q3 && q2;

    let displayTime;
    if (!bestTime) {
      displayTime = 'No time set';
    } else if (noQ3Lap) {
      displayTime = 'No final time';
    } else if (pos === 1) {
      displayTime = bestTime;
    } else {
      const driverSec = parseQualiTime(bestTime);
      if (poleSec != null && driverSec != null) {
        displayTime = `+${(driverSec - poleSec).toFixed(3)}`;
      } else {
        displayTime = bestTime;
      }
    }

    return {
      pos,
      driver: formatDriverName(qr.Driver.givenName, qr.Driver.familyName),
      team: qr.Constructor.name,
      time: displayTime,
      session,
    };
  });

  return {
    raceName: race.raceName,
    round: parseInt(race.round, 10),
    date: race.date,
    time: race.time || null,
    results,
  };
}

export async function fetchRaceResultsForRound(year, round) {
  const data = await fetchJson(`${BASE}/f1/${year}/${round}/results.json`);
  const race = data.MRData.RaceTable.Races?.[0];
  if (!race) return null;
  const results = (race.Results || []).map((r) => ({
    pos: parseInt(r.position, 10),
    driver: formatDriverName(r.Driver.givenName, r.Driver.familyName),
    team: r.Constructor.name,
    time: r.Time?.time || r.status || 'N/A',
    status: r.status,
    grid: parseInt(r.grid, 10),
    laps: parseInt(r.laps, 10),
  }));
  return {
    raceName: race.raceName,
    round: parseInt(race.round, 10),
    date: race.date,
    time: race.time || null,
    results,
  };
}

export async function fetchSeasonSchedule(year) {
  const data = await fetchJson(`${BASE}/f1/${year}.json`);
  const races = data.MRData.RaceTable.Races || [];
  return races.map((race) => ({
    round: parseInt(race.round, 10),
    name: race.raceName,
    date: race.date,
    time: race.time || null,
    circuitName: race.Circuit?.circuitName || '',
    country: race.Circuit?.Location?.country || '',
  }));
}

// --- Main orchestrator ---

// Fetches core season data (standings, results, constructors).
// Returns immediately with seasons=0 for all drivers.
export async function fetchSeasonData(year) {
  console.log(`[f1api] Fetching ${year} season data...`);

  // Phase 1: calendar + driver standings (2 requests, parallel)
  const [calendar, drivers] = await Promise.all([
    fetchSeasonCalendar(year),
    fetchDriverStandings(year),
  ]);
  console.log(`[f1api] ${year}: ${drivers.length} drivers, ${calendar.rounds} rounds`);

  // Phase 2: constructor standings + race results
  const [constructors, raceResults] = await Promise.all([
    fetchConstructorStandings(year, drivers),
    fetchRaceResults(year, calendar.rounds),
  ]);
  console.log(`[f1api] ${year}: core data loaded`);

  const driversWithResults = drivers.map((d) => ({
    ...d,
    results: raceResults[d.driverId] || new Array(calendar.rounds).fill(null),
    seasons: getSeasonNumber(driverSeasonsCache[d.driverId], year),
  }));

  return {
    drivers: driversWithResults,
    constructors,
    raceLabels: calendar.raceLabels,
    rounds: calendar.rounds,
  };
}

// Fetches season counts for all drivers in a year (slow, rate-limited).
// Returns updated driver list with accurate season counts.
// Safe to call repeatedly — uses global cache.
export async function fetchDriverSeasonCounts(year, drivers) {
  const uncached = drivers.filter((d) => !driverSeasonsCache[d.driverId]);
  if (uncached.length === 0) {
    // All cached, just return enriched drivers
    return drivers.map((d) => ({
      ...d,
      seasons: getSeasonNumber(driverSeasonsCache[d.driverId], year),
    }));
  }

  console.log(`[f1api] ${year}: fetching season history for ${uncached.length} drivers...`);

  // Sequential with delay to stay under rate limit
  for (const d of uncached) {
    try {
      await fetchDriverSeasons(d.driverId);
    } catch (err) {
      console.warn(`[f1api] Could not fetch seasons for ${d.driverId}:`, err.message);
    }
    await delay(1100);
  }

  console.log(`[f1api] ${year}: season counts loaded`);
  return drivers.map((d) => ({
    ...d,
    seasons: getSeasonNumber(driverSeasonsCache[d.driverId], year),
  }));
}
