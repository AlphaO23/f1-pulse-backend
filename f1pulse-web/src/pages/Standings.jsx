import { useState, useEffect, useCallback } from 'react';
import styles from './Standings.module.css';
import { fetchSeasonData, fetchDriverSeasonCounts } from '../data/f1api';
import { CHAMPIONS, WDC_COUNTS } from '../data/champions';
import TEAM_COLORS, { getTeamColor } from '../data/teamColors';


// 2026 pre-season lineup (all zeros, season not started)
const LINEUP_2026 = [
  { pos: 'N/C', name: 'Max Verstappen',       team: 'Red Bull',       abbr: 'VER', num: 1,  driverId: 'max_verstappen', pts: 0, results: [] },
  { pos: 'N/C', name: 'Isack Hadjar',          team: 'Red Bull',       abbr: 'HAD', num: 6,  driverId: 'hadjar',         pts: 0, results: [] },
  { pos: 'N/C', name: 'Charles Leclerc',       team: 'Ferrari',        abbr: 'LEC', num: 16, driverId: 'leclerc',        pts: 0, results: [] },
  { pos: 'N/C', name: 'Lewis Hamilton',         team: 'Ferrari',        abbr: 'HAM', num: 44, driverId: 'hamilton',       pts: 0, results: [] },
  { pos: 'N/C', name: 'George Russell',         team: 'Mercedes',       abbr: 'RUS', num: 63, driverId: 'russell',        pts: 0, results: [] },
  { pos: 'N/C', name: 'Andrea Kimi Antonelli',  team: 'Mercedes',       abbr: 'ANT', num: 12, driverId: 'antonelli',      pts: 0, results: [] },
  { pos: 'N/C', name: 'Lando Norris',           team: 'McLaren',        abbr: 'NOR', num: 4,  driverId: 'norris',         pts: 0, results: [] },
  { pos: 'N/C', name: 'Oscar Piastri',          team: 'McLaren',        abbr: 'PIA', num: 81, driverId: 'piastri',        pts: 0, results: [] },
  { pos: 'N/C', name: 'Fernando Alonso',        team: 'Aston Martin',   abbr: 'ALO', num: 14, driverId: 'alonso',         pts: 0, results: [] },
  { pos: 'N/C', name: 'Lance Stroll',           team: 'Aston Martin',   abbr: 'STR', num: 18, driverId: 'stroll',         pts: 0, results: [] },
  { pos: 'N/C', name: 'Pierre Gasly',           team: 'Alpine',         abbr: 'GAS', num: 10, driverId: 'gasly',          pts: 0, results: [] },
  { pos: 'N/C', name: 'Franco Colapinto',       team: 'Alpine',         abbr: 'COL', num: 43, driverId: 'colapinto',      pts: 0, results: [] },
  { pos: 'N/C', name: 'Alexander Albon',        team: 'Williams',       abbr: 'ALB', num: 23, driverId: 'albon',          pts: 0, results: [] },
  { pos: 'N/C', name: 'Carlos Sainz',           team: 'Williams',       abbr: 'SAI', num: 55, driverId: 'sainz',          pts: 0, results: [] },
  { pos: 'N/C', name: 'Liam Lawson',             team: 'Racing Bulls',   abbr: 'LAW', num: 30, driverId: 'lawson',         pts: 0, results: [] },
  { pos: 'N/C', name: 'Arvid Lindblad',         team: 'Racing Bulls',   abbr: 'LIN', num: 41, driverId: 'lindblad',       pts: 0, results: [] },
  { pos: 'N/C', name: 'Esteban Ocon',           team: 'Haas',           abbr: 'OCO', num: 31, driverId: 'ocon',           pts: 0, results: [] },
  { pos: 'N/C', name: 'Oliver Bearman',         team: 'Haas',           abbr: 'BEA', num: 87, driverId: 'bearman',        pts: 0, results: [] },
  { pos: 'N/C', name: 'Nico Hülkenberg',        team: 'Audi F1 Team',           abbr: 'HUL', num: 27, driverId: 'hulkenberg',     pts: 0, results: [] },
  { pos: 'N/C', name: 'Gabriel Bortoleto',      team: 'Audi F1 Team',           abbr: 'BOR', num: 5,  driverId: 'bortoleto',      pts: 0, results: [] },
  { pos: 'N/C', name: 'Valtteri Bottas',        team: 'Cadillac F1 Team',       abbr: 'BOT', num: 77, driverId: 'bottas',         pts: 0, results: [] },
  { pos: 'N/C', name: 'Sergio Perez',           team: 'Cadillac F1 Team',       abbr: 'PER', num: 11, driverId: 'perez',          pts: 0, results: [] },
];

const CONSTRUCTORS_2026 = [
  { pos: 'N/C', name: 'Red Bull',       pts: 0, drivers: [{ name: 'Max Verstappen', pts: 0 }, { name: 'Isack Hadjar', pts: 0 }] },
  { pos: 'N/C', name: 'Ferrari',        pts: 0, drivers: [{ name: 'Charles Leclerc', pts: 0 }, { name: 'Lewis Hamilton', pts: 0 }] },
  { pos: 'N/C', name: 'Mercedes',       pts: 0, drivers: [{ name: 'George Russell', pts: 0 }, { name: 'Andrea Kimi Antonelli', pts: 0 }] },
  { pos: 'N/C', name: 'McLaren',        pts: 0, drivers: [{ name: 'Lando Norris', pts: 0 }, { name: 'Oscar Piastri', pts: 0 }] },
  { pos: 'N/C', name: 'Aston Martin',   pts: 0, drivers: [{ name: 'Fernando Alonso', pts: 0 }, { name: 'Lance Stroll', pts: 0 }] },
  { pos: 'N/C', name: 'Alpine',         pts: 0, drivers: [{ name: 'Pierre Gasly', pts: 0 }, { name: 'Franco Colapinto', pts: 0 }] },
  { pos: 'N/C', name: 'Williams',       pts: 0, drivers: [{ name: 'Alexander Albon', pts: 0 }, { name: 'Carlos Sainz', pts: 0 }] },
  { pos: 'N/C', name: 'Racing Bulls',   pts: 0, drivers: [{ name: 'Liam Lawson', pts: 0 }, { name: 'Arvid Lindblad', pts: 0 }] },
  { pos: 'N/C', name: 'Haas',           pts: 0, drivers: [{ name: 'Esteban Ocon', pts: 0 }, { name: 'Oliver Bearman', pts: 0 }] },
  { pos: 'N/C', name: 'Audi F1 Team',   pts: 0, drivers: [{ name: 'Nico Hülkenberg', pts: 0 }, { name: 'Gabriel Bortoleto', pts: 0 }] },
  { pos: 'N/C', name: 'Cadillac F1 Team', pts: 0, drivers: [{ name: 'Valtteri Bottas', pts: 0 }, { name: 'Sergio Perez', pts: 0 }] },
];

function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function posClass(pos) {
  if (pos === 1) return styles.posGold;
  if (pos === 2) return styles.posSilver;
  if (pos === 3) return styles.posBronze;
  return styles.posDefault;
}

function badgeClass(finish) {
  if (finish === 1) return styles.badgeGold;
  if (finish === 2) return styles.badgeSilver;
  if (finish === 3) return styles.badgeBronze;
  if (finish === 'DNF' || finish === 'DNS') return styles.badgeDnf;
  if (finish === 'DSQ') return styles.badgeDsq;
  if (typeof finish === 'number' && finish <= 10) return styles.badgePoints;
  return styles.badgeRegular;
}

function formatResult(r) {
  if (r === null) return null;
  if (typeof r === 'string') return r;
  return `P${r}`;
}

function getPointsMap(year) {
  if (year <= 2002) return [10, 6, 4, 3, 2, 1];
  if (year <= 2009) return [10, 8, 6, 5, 4, 3, 2, 1];
  return [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
}

function racePoints(finish, year) {
  const map = getPointsMap(year);
  if (typeof finish === 'number' && finish >= 1 && finish <= map.length) return map[finish - 1];
  return 0;
}

function calcStats(results) {
  const finishes = results.filter((r) => typeof r === 'number');
  const avg = finishes.length > 0
    ? (finishes.reduce((a, b) => a + b, 0) / finishes.length).toFixed(1)
    : null;
  const best = finishes.length > 0 ? Math.min(...finishes) : null;
  return { avg, best };
}

// Count WDC titles a driver had UP TO a given year
function wdcCountUpTo(driverId, year) {
  let count = 0;
  for (const [y, id] of Object.entries(CHAMPIONS)) {
    if (parseInt(y, 10) <= year && id === driverId) count++;
  }
  return count;
}

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);

const currentYear = new Date().getFullYear();

export default function Standings() {
  const [tab, setTab] = useState('drivers');
  const [year, setYear] = useState(currentYear);
  const [seasonCache, setSeasonCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Close expanded card when switching tab or year
  useEffect(() => { setExpanded(null); }, [tab, year]);

  // Close on click outside
  const handleListClick = useCallback((e) => {
    if (!e.target.closest(`.${styles.card}`) && !e.target.closest(`.${styles.constructorCard}`)) {
      setExpanded(null);
    }
  }, []);

  const toggleExpand = useCallback((key) => {
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

  useEffect(() => {
    // Already cached (non-current-year only — current year always re-fetches on refresh)
    if (seasonCache[year] && year !== currentYear) return;
    // For current year, skip if already cached and not refreshing
    if (seasonCache[year] && year === currentYear && !refreshKey) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSeasonData(year)
      .then((data) => {
        if (cancelled) return;
        const hasStandings = data.drivers && data.drivers.length > 0 && data.drivers[0].pts > 0;

        if (year === 2026 && !hasStandings) {
          // Season hasn't started or API has no standings yet — use static lineup
          // but still use API calendar if available
          setSeasonCache((prev) => ({
            ...prev,
            2026: {
              drivers: LINEUP_2026,
              constructors: CONSTRUCTORS_2026,
              raceLabels: data.raceLabels.length > 0 ? data.raceLabels : [],
              rounds: data.rounds || 0,
              inProgress: true,
            },
          }));
          setLoading(false);
          return;
        }

        // API has real data — use it
        setSeasonCache((prev) => ({ ...prev, [year]: { ...data, inProgress: year === currentYear } }));
        setLoading(false);

        // Enrich with season counts after a delay
        new Promise((r) => setTimeout(r, 3000))
          .then(() => fetchDriverSeasonCounts(year, data.drivers))
          .then((enrichedDrivers) => {
            if (cancelled) return;
            setSeasonCache((prev) => ({
              ...prev,
              [year]: { ...prev[year], drivers: enrichedDrivers },
            }));
          })
          .catch((err) => console.warn('[Standings] Season enrichment failed:', err));
      })
      .catch((err) => {
        if (cancelled) return;
        // API failed — for 2026, fall back to static lineup
        if (year === 2026) {
          setSeasonCache((prev) => ({
            ...prev,
            2026: {
              drivers: LINEUP_2026,
              constructors: CONSTRUCTORS_2026,
              raceLabels: [],
              rounds: 0,
              inProgress: true,
            },
          }));
          setLoading(false);
        } else {
          setError(`Failed to load ${year} data`);
          setLoading(false);
          console.error('[Standings] Load failed:', err);
        }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, refreshKey]);

  const seasonData = seasonCache[year];
  const hasData = !!seasonData && !loading;
  const isInProgress = seasonData?.inProgress;

  const currentDrivers = seasonData?.drivers || [];
  const currentConstructors = seasonData?.constructors || [];
  const currentRaceLabels = seasonData?.raceLabels || [];
  const currentRounds = seasonData?.rounds || 0;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Championship Standings</h1>

        <div className={styles.controls}>
          <select
            className={styles.yearSelect}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className={styles.tabs}>
            <button
              className={`${styles.chip} ${tab === 'drivers' ? styles.active : ''}`}
              onClick={() => setTab('drivers')}
            >
              Drivers
            </button>
            <button
              className={`${styles.chip} ${tab === 'constructors' ? styles.active : ''}`}
              onClick={() => setTab('constructors')}
            >
              Constructors
            </button>
          </div>

          {year === currentYear && hasData && (
            <button
              className={styles.refreshBtn}
              onClick={() => {
                setSeasonCache((prev) => {
                  const copy = { ...prev };
                  delete copy[year];
                  return copy;
                });
                setRefreshKey((k) => k + 1);
              }}
              title="Refresh standings"
            >
              &#8635;
            </button>
          )}
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading {year} standings...</span>
          </div>
        ) : error ? (
          <div className={styles.placeholder}>
            <span className={styles.placeholderYear}>{year}</span>
            <span className={styles.placeholderText}>{error}</span>
          </div>
        ) : !hasData ? (
          <div className={styles.placeholder}>
            <span className={styles.placeholderYear}>{year}</span>
            <span className={styles.placeholderText}>Data for {year} coming soon</span>
          </div>
        ) : (
        <>
        <div className={styles.list} onClick={handleListClick}>
          {tab === 'drivers' ? (
            currentDrivers.map((entry) => {
              const championYear = CHAMPIONS[year] === entry.driverId;
              const totalTitles = wdcCountUpTo(entry.driverId, year);
              const isExpanded = expanded === `d-${entry.name}`;
              return (
              <div
                className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}
                key={entry.name}
                onClick={() => toggleExpand(`d-${entry.name}`)}
              >
                {isExpanded && (
                  <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setExpanded(null); }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                )}
                {isExpanded ? (
                  <>
                  <div className={styles.expandedLayout}>
                    {/* LEFT: info only (badges moved to grid) */}
                    <div className={styles.expandedLeft}>
                      <div className={styles.info}>
                        <span className={styles.pts}>{entry.pts} pts</span>
                        <span className={styles.name}>{entry.name}</span>
                        <div className={styles.driverDetails}>
                          <span>Abrev: {entry.abbr}</span>
                          <span>Car #{entry.num}</span>
                          {entry.seasons > 0 && <span>Season n&deg;{entry.seasons}</span>}
                          {championYear && totalTitles > 0 && (
                            <span className={styles.champLine}>Won his {ordinal(totalTitles)} championship</span>
                          )}
                          {!championYear && totalTitles > 0 && (
                            <span className={styles.champLine}>{totalTitles} time champion</span>
                          )}
                        </div>
                        <span className={styles.team}>{entry.team}</span>
                      </div>
                    </div>
                    {/* VERTICAL DIVIDER */}
                    <div className={styles.expandedDivider} />
                    {/* Dynamic race grid */}
                    {(() => {
                      const labels = currentRaceLabels;
                      const total = labels.length;
                      if (total === 0) return <div className={styles.expandedGridWrap} />;
                      const half = Math.ceil(total / 2);
                      const row1Labels = labels.slice(0, half);
                      const row2Labels = labels.slice(half);
                      const cols = Math.max(row1Labels.length, row2Labels.length);

                      const renderBlock = (gpLabels, resultsOffset) => {
                        const cells = [];
                        for (let c = 0; c < cols; c++) {
                          // GP label row
                          cells.push(
                            <div key={`gp-${c}`} className={`${styles.gridCell} ${c < gpLabels.length ? styles.gridCellLabel : ''}`}>
                              {c < gpLabels.length ? gpLabels[c] : ''}
                            </div>
                          );
                        }
                        for (let c = 0; c < cols; c++) {
                          // Result badge row
                          const raceIdx = resultsOffset + c;
                          const finish = (raceIdx < entry.results.length && c < gpLabels.length) ? entry.results[raceIdx] : null;
                          const label = formatResult(finish);
                          cells.push(
                            <div key={`res-${c}`} className={styles.gridCell}>
                              {label !== null && (
                                <span className={`${styles.badge} ${badgeClass(finish)}`}>{label}</span>
                              )}
                            </div>
                          );
                        }
                        for (let c = 0; c < cols; c++) {
                          // Points row
                          const raceIdx = resultsOffset + c;
                          const finish = (raceIdx < entry.results.length && c < gpLabels.length) ? entry.results[raceIdx] : null;
                          const pts = finish != null ? racePoints(finish, year) : null;
                          cells.push(
                            <div key={`pts-${c}`} className={`${styles.gridCell} ${pts !== null ? styles.gridCellPts : ''}`}>
                              {pts !== null ? `+${pts} ${pts === 1 ? 'pt' : 'pts'}` : ''}
                            </div>
                          );
                        }
                        return cells;
                      };

                      return (
                        <div className={styles.expandedGridWrap}>
                          <div className={styles.expandedGrid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                            {renderBlock(row1Labels, 0)}
                            {renderBlock(row2Labels, half)}
                          </div>
                        </div>
                      );
                    })()}
                    {/* RIGHT: position + stats */}
                    <div className={styles.expandedRight}>
                      <div className={`${styles.expandedPos} ${posClass(entry.pos)}`}>
                        <span className={styles.pos}>{entry.pos}</span>
                      </div>
                      {entry.results.length > 0 && (() => {
                        const { avg, best } = calcStats(entry.results);
                        return (
                          <div className={styles.expandedStats}>
                            {avg && (
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>Avg</span>
                                <span className={styles.statValue}>P{avg}</span>
                              </div>
                            )}
                            {best !== null && (
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>Best</span>
                                <span className={`${styles.badge} ${badgeClass(best)}`}>
                                  P{best}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {entry.results.length > 0 && (() => {
                    const results = entry.results;
                    const pointsMap = getPointsMap(year);
                    const totalRaces = results.length;
                    const wins = results.filter((r) => r === 1).length;
                    const podiums = results.filter((r) => typeof r === 'number' && r >= 1 && r <= 3).length;
                    const pointsFinishes = results.filter((r) => typeof r === 'number' && r >= 1 && r <= pointsMap.length).length;
                    return (
                      <div className={styles.expandedStatsBar}>
                        <span>{wins} {wins === 1 ? 'win' : 'wins'}</span>
                        <span>{podiums} {podiums === 1 ? 'podium' : 'podiums'}</span>
                        <span>{pointsFinishes}/{totalRaces} points {pointsFinishes === 1 ? 'finish' : 'finishes'}</span>
                      </div>
                    );
                  })()}
                </>
                ) : (
                  <>
                    <div className={styles.cardTop}>
                      <div className={styles.info}>
                        <span className={styles.pts}>{entry.pts} pts</span>
                        <span className={styles.name}>{entry.name}</span>
                        <div className={styles.driverDetails}>
                          <span>Abrev: {entry.abbr}</span>
                          <span>Car #{entry.num}</span>
                          {entry.seasons > 0 && <span>Season n&deg;{entry.seasons}</span>}
                          {championYear && totalTitles > 0 && (
                            <span className={styles.champLine}>Won his {ordinal(totalTitles)} championship</span>
                          )}
                          {!championYear && totalTitles > 0 && (
                            <span className={styles.champLine}>{totalTitles} time champion</span>
                          )}
                        </div>
                        <span className={styles.team}>{entry.team}</span>
                      </div>
                      <div className={`${styles.posWrap} ${posClass(entry.pos)}`}>
                        <span className={styles.pos}>{entry.pos}</span>
                      </div>
                    </div>
                    {entry.results.length > 0 && (
                    <div className={styles.resultsRow}>
                      <div className={styles.results}>
                        {entry.results.map((finish, i) => {
                          const label = formatResult(finish);
                          if (label === null) return null;
                          return (
                            <span
                              key={i}
                              className={`${styles.badge} ${badgeClass(finish)}`}
                              title={currentRaceLabels[i]}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                      {(() => {
                        const { avg, best } = calcStats(entry.results);
                        return (
                          <div className={styles.stats}>
                            {avg && (
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>Avg</span>
                                <span className={styles.statValue}>P{avg}</span>
                              </div>
                            )}
                            {best !== null && (
                              <div className={styles.statItem}>
                                <span className={styles.statLabel}>Best</span>
                                <span className={`${styles.badge} ${badgeClass(best)}`}>
                                  P{best}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    )}
                  </>
                )}
              </div>
              );
            })
          ) : (
            currentConstructors.map((entry) => {
              const teamColor = getTeamColor(entry.name);
              const isExpanded = expanded === `c-${entry.name}`;
              return (
                <div
                  className={`${styles.constructorCard} ${isExpanded ? styles.constructorCardExpanded : ''}`}
                  key={entry.name}
                  style={{ borderLeftColor: teamColor }}
                  onClick={() => toggleExpand(`c-${entry.name}`)}
                >
                  {isExpanded && (
                    <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); setExpanded(null); }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  )}
                  <div className={styles.constructorTop}>
                    <div className={styles.constructorLeft}>
                      <div className={`${styles.posBadge} ${posClass(entry.pos)}`}>
                        <span className={styles.pos}>{entry.pos}</span>
                      </div>
                      <div className={styles.constructorInfo}>
                        <span className={styles.constructorName}>{entry.name}</span>
                        <span className={styles.constructorPts}>{entry.pts} pts</span>
                      </div>
                    </div>
                    <div className={styles.driverCards}>
                      {entry.drivers.map((d) => (
                        <div
                          key={d.name}
                          className={styles.driverCard}
                          style={{ borderLeftColor: teamColor }}
                        >
                          <span className={styles.driverName}>{d.name}</span>
                          <span className={styles.driverPts}>{d.pts} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {isExpanded && (() => {
                    const d1 = currentDrivers.find((d) => d.name === entry.drivers[0]?.name);
                    const d2 = currentDrivers.find((d) => d.name === entry.drivers[1]?.name);
                    const d1Abbr = d1?.abbr || entry.drivers[0]?.name.substring(0, 3).toUpperCase() || '---';
                    const d2Abbr = d2?.abbr || entry.drivers[1]?.name.substring(0, 3).toUpperCase() || '---';
                    const d1Results = d1?.results || [];
                    const d2Results = d2?.results || [];
                    const labels = currentRaceLabels;
                    const total = labels.length;
                    if (total === 0) return null;
                    const half = Math.ceil(total / 2);
                    const cols = Math.max(half, total - half);
                    const rowLabels = ['GP', d1Abbr, d2Abbr, 'Points', 'GP', d1Abbr, d2Abbr, 'Points'];

                    const renderBlock = (gpLabels, offset, blockRow) => {
                      const cells = [];
                      for (let c = 0; c <= cols; c++) {
                        if (c === 0) {
                          const isDriver = blockRow === 1 || blockRow === 2;
                          cells.push(
                            <div key={`${blockRow}-0`} className={`${styles.constructorGridCell} ${styles.cGridLabel}`} style={isDriver ? { color: '#14B8A6' } : undefined}>
                              {rowLabels[blockRow]}
                            </div>
                          );
                          continue;
                        }
                        const raceIdx = offset + c - 1;
                        const inRange = c - 1 < gpLabels.length;
                        if (blockRow % 4 === 0) {
                          // GP label row
                          cells.push(
                            <div key={`${blockRow}-${c}`} className={`${styles.constructorGridCell} ${inRange ? styles.gridCellLabel : ''}`}>
                              {inRange ? gpLabels[c - 1] : ''}
                            </div>
                          );
                        } else if (blockRow % 4 === 1) {
                          // Driver 1 result
                          const finish = inRange && raceIdx < d1Results.length ? d1Results[raceIdx] : null;
                          const label = formatResult(finish);
                          cells.push(
                            <div key={`${blockRow}-${c}`} className={styles.constructorGridCell}>
                              {label !== null && <span className={`${styles.badge} ${badgeClass(finish)}`}>{label}</span>}
                            </div>
                          );
                        } else if (blockRow % 4 === 2) {
                          // Driver 2 result
                          const finish = inRange && raceIdx < d2Results.length ? d2Results[raceIdx] : null;
                          const label = formatResult(finish);
                          cells.push(
                            <div key={`${blockRow}-${c}`} className={styles.constructorGridCell}>
                              {label !== null && <span className={`${styles.badge} ${badgeClass(finish)}`}>{label}</span>}
                            </div>
                          );
                        } else {
                          // Combined points row
                          const f1 = inRange && raceIdx < d1Results.length ? d1Results[raceIdx] : null;
                          const f2 = inRange && raceIdx < d2Results.length ? d2Results[raceIdx] : null;
                          const p1 = f1 != null ? racePoints(f1, year) : 0;
                          const p2 = f2 != null ? racePoints(f2, year) : 0;
                          const combined = p1 + p2;
                          const show = inRange && (f1 != null || f2 != null);
                          cells.push(
                            <div key={`${blockRow}-${c}`} className={`${styles.constructorGridCell} ${show ? styles.gridCellPts : ''}`}>
                              {show ? `+${combined} ${combined === 1 ? 'pt' : 'pts'}` : ''}
                            </div>
                          );
                        }
                      }
                      return cells;
                    };

                    return (
                    <div className={styles.constructorGridWrap}>
                      <div
                        className={styles.constructorGrid}
                        style={{ gridTemplateColumns: `auto repeat(${cols}, 1fr)` }}
                      >
                        {renderBlock(labels.slice(0, half), 0, 0)}
                        {renderBlock(labels.slice(0, half), 0, 1)}
                        {renderBlock(labels.slice(0, half), 0, 2)}
                        {renderBlock(labels.slice(0, half), 0, 3)}
                        {renderBlock(labels.slice(half), half, 4)}
                        {renderBlock(labels.slice(half), half, 5)}
                        {renderBlock(labels.slice(half), half, 6)}
                        {renderBlock(labels.slice(half), half, 7)}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>

        <p className={styles.season}>
          {year} Season{isInProgress ? (
            <span className={styles.inProgress}> — In Progress</span>
          ) : (
            ` — ${currentRounds} Rounds`
          )}
        </p>
        </>
        )}
      </div>
    </main>
  );
}
