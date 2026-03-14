import { useState, useEffect } from 'react';
import { fetchSeasonSchedule, fetchQualifyingResults, fetchRaceResultsForRound } from '../data/f1api';
import { getTeamColor } from '../data/teamColors';
import styles from './Results.module.css';

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.replace('Z', '').split(':');
  return `${parts[0]}:${parts[1]} UTC`;
}

function posLabel(pos) {
  if (pos === 1) return 'Pole Position';
  return `P${pos}`;
}

function racePositionLabel(pos) {
  if (pos === 1) return '1st';
  if (pos === 2) return '2nd';
  if (pos === 3) return '3rd';
  return `${pos}th`;
}

function posColor(pos) {
  if (pos === 1) return '#FFD700';
  if (pos === 2) return '#C0C0C0';
  if (pos === 3) return '#CD7F32';
  return '#9CA3AF';
}

function getRelevantRound(schedule) {
  const today = new Date().toISOString().split('T')[0];
  const next = schedule.find((race) => race.date >= today);
  return next || schedule[schedule.length - 1];
}

function getQualiDate(raceDate) {
  const d = new Date(raceDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function shortenGPName(name) {
  return name.replace(' Grand Prix', ' GP');
}

function YearAndGPSelectors({ year, setYear, schedule, currentRace, setCurrentRace, setQualiData, setRaceData }) {
  const changeRound = (delta) => {
    if (!schedule || !currentRace) return;
    const idx = schedule.findIndex((r) => r.round === currentRace.round);
    const next = schedule[idx + delta];
    if (next) {
      setQualiData(null);
      setRaceData(null);
      setCurrentRace(next);
    }
  };

  const roundIdx = schedule && currentRace
    ? schedule.findIndex((r) => r.round === currentRace.round)
    : -1;
  const hasPrev = roundIdx > 0;
  const hasNext = schedule ? roundIdx < schedule.length - 1 : false;

  return (
    <div className={styles.controls}>
      <h1 className={styles.heading}>Results</h1>
      <select
        className={styles.yearSelect}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      {schedule && schedule.length > 0 && currentRace && (
        <div className={styles.gpNav}>
          <button
            className={styles.arrowBtn}
            disabled={!hasPrev}
            onClick={() => changeRound(-1)}
            aria-label="Previous GP"
          >
            &#8592;
          </button>
          <select
            className={styles.gpSelect}
            value={currentRace.round}
            onChange={(e) => {
              const round = Number(e.target.value);
              const race = schedule.find((r) => r.round === round);
              if (race) {
                setQualiData(null);
                setRaceData(null);
                setCurrentRace(race);
              }
            }}
          >
            {schedule.map((race) => (
              <option key={race.round} value={race.round}>
                Round {race.round}: {shortenGPName(race.name)}
              </option>
            ))}
          </select>
          <button
            className={styles.arrowBtn}
            disabled={!hasNext}
            onClick={() => changeRound(1)}
            aria-label="Next GP"
          >
            &#8594;
          </button>
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const [schedule, setSchedule] = useState(null);
  const [currentRace, setCurrentRace] = useState(null);
  const [qualiData, setQualiData] = useState(null);
  const [raceData, setRaceData] = useState(null);
  const [qualiLoading, setQualiLoading] = useState(false);
  const [raceLoading, setRaceLoading] = useState(false);
  const [qualiError, setQualiError] = useState(null);
  const [raceError, setRaceError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());

  // Fetch season schedule
  useEffect(() => {
    let cancelled = false;
    setSchedule(null);
    setCurrentRace(null);
    setQualiData(null);
    setRaceData(null);

    fetchSeasonSchedule(year)
      .then((sched) => {
        if (cancelled) return;
        setSchedule(sched);
        if (sched.length > 0) {
          setCurrentRace(getRelevantRound(sched));
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('[Results] Failed to load schedule:', err);
      });

    return () => { cancelled = true; };
  }, [year]);

  // Fetch qualifying & race results when currentRace changes
  useEffect(() => {
    if (!currentRace) return;
    let cancelled = false;
    const today = new Date().toISOString().split('T')[0];
    const qualiDate = getQualiDate(currentRace.date);
    const raceDate = currentRace.date;

    if (qualiDate <= today) {
      setQualiLoading(true);
      setQualiError(null);
      fetchQualifyingResults(year, currentRace.round)
        .then((data) => {
          if (cancelled) return;
          setQualiData(data);
          setQualiLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setQualiError('Results not available');
          setQualiLoading(false);
        });
    } else {
      setQualiData(null);
      setQualiError(null);
    }

    if (raceDate <= today) {
      setRaceLoading(true);
      setRaceError(null);
      fetchRaceResultsForRound(year, currentRace.round)
        .then((data) => {
          if (cancelled) return;
          setRaceData(data);
          setRaceLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setRaceError('Results not available');
          setRaceLoading(false);
        });
    } else {
      setRaceData(null);
      setRaceError(null);
    }

    return () => { cancelled = true; };
  }, [currentRace, year]);

  const selectorProps = {
    year, setYear, schedule, currentRace, setCurrentRace, setQualiData, setRaceData,
  };

  if (!schedule) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <YearAndGPSelectors {...selectorProps} />
          <div className={styles.loading}>Loading schedule...</div>
        </div>
      </main>
    );
  }

  if (schedule.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <YearAndGPSelectors {...selectorProps} />
          <div className={styles.pending}>No schedule available for {year}</div>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const qualiDate = getQualiDate(currentRace.date);
  const qualiPending = qualiDate > today;
  const racePending = currentRace.date > today;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <YearAndGPSelectors {...selectorProps} />

        <div className={styles.row}>
          {/* Qualifying Card */}
          <div className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.cardDate}>{formatDate(qualiDate)}</span>
              <h2 className={styles.cardTitle}>Qualifying</h2>
              <span className={styles.cardTime}>
                {currentRace.time ? formatTime(currentRace.time) : ''}
              </span>
            </div>
            {qualiLoading && (
              <div className={styles.pending}>Loading qualifying results...</div>
            )}
            {qualiPending && !qualiLoading && (
              <div className={styles.pending}>Qualifying pending</div>
            )}
            {qualiError && !qualiLoading && (
              <div className={styles.pending}>{qualiError}</div>
            )}
            {qualiData && qualiData.results.length > 0 && (
              <div className={styles.qualiList}>
                {qualiData.results.map((entry) => (
                  <div
                    key={entry.pos}
                    className={`${styles.qualiRow}${entry.pos === 1 ? ` ${styles.poleRow}` : ''}`}
                    style={{ borderLeftColor: getTeamColor(entry.team) }}
                  >
                    <span
                      className={`${styles.qualiPos}${entry.pos === 1 ? ` ${styles.poleText}` : ''}`}
                      style={entry.pos !== 1 ? { color: posColor(entry.pos) } : undefined}
                    >
                      {posLabel(entry.pos)}
                    </span>
                    <span className={styles.qualiTeam}>{entry.team}</span>
                    <span className={styles.qualiDriver}>{entry.driver}</span>
                    <span className={styles.qualiTime}>{entry.time}</span>
                  </div>
                ))}
              </div>
            )}
            {qualiData && qualiData.results.length === 0 && (
              <div className={styles.pending}>No qualifying data available</div>
            )}
          </div>

          {/* Race Card */}
          <div className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.cardDate}>{formatDate(currentRace.date)}</span>
              <h2 className={styles.cardTitle}>The Race</h2>
              <span className={styles.cardTime}>
                {currentRace.time ? formatTime(currentRace.time) : ''}
              </span>
            </div>
            {raceLoading && (
              <div className={styles.pending}>Loading race results...</div>
            )}
            {racePending && !raceLoading && (
              <div className={styles.pending}>Race pending</div>
            )}
            {raceError && !raceLoading && (
              <div className={styles.pending}>{raceError}</div>
            )}
            {raceData && raceData.results.length > 0 && (
              <div className={styles.qualiList}>
                {raceData.results.map((entry) => (
                  <div
                    key={entry.pos}
                    className={`${styles.qualiRow}${entry.pos === 1 ? ` ${styles.poleRow}` : ''}`}
                    style={{ borderLeftColor: getTeamColor(entry.team) }}
                  >
                    <span className={styles.qualiPos} style={{ color: posColor(entry.pos) }}>
                      {racePositionLabel(entry.pos)}
                    </span>
                    <span className={styles.qualiTeam}>{entry.team}</span>
                    <span className={styles.qualiDriver}>{entry.driver}</span>
                    <span className={styles.qualiTime}>{entry.time}</span>
                  </div>
                ))}
              </div>
            )}
            {raceData && raceData.results.length === 0 && (
              <div className={styles.pending}>No race data available</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
