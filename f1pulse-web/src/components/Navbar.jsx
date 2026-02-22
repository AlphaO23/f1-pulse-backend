import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

// 2026 F1 Calendar — race day (Sunday) dates in UTC
const RACES_2026 = [
  { name: 'Australian Grand Prix', date: '2026-03-08T05:00:00Z' },
  { name: 'Chinese Grand Prix', date: '2026-03-15T07:00:00Z' },
  { name: 'Japanese Grand Prix', date: '2026-03-29T06:00:00Z' },
  { name: 'Bahrain Grand Prix', date: '2026-04-12T15:00:00Z' },
  { name: 'Saudi Arabian Grand Prix', date: '2026-04-19T17:00:00Z' },
  { name: 'Miami Grand Prix', date: '2026-05-03T20:00:00Z' },
  { name: 'Canadian Grand Prix', date: '2026-05-24T18:00:00Z' },
  { name: 'Monaco Grand Prix', date: '2026-06-07T13:00:00Z' },
  { name: 'Barcelona Grand Prix', date: '2026-06-14T13:00:00Z' },
  { name: 'Austrian Grand Prix', date: '2026-06-28T13:00:00Z' },
  { name: 'British Grand Prix', date: '2026-07-05T14:00:00Z' },
  { name: 'Belgian Grand Prix', date: '2026-07-19T13:00:00Z' },
  { name: 'Hungarian Grand Prix', date: '2026-07-26T13:00:00Z' },
  { name: 'Dutch Grand Prix', date: '2026-08-23T13:00:00Z' },
  { name: 'Italian Grand Prix', date: '2026-09-06T13:00:00Z' },
  { name: 'Spanish Grand Prix', date: '2026-09-13T13:00:00Z' },
  { name: 'Azerbaijan Grand Prix', date: '2026-09-26T11:00:00Z' },
  { name: 'Singapore Grand Prix', date: '2026-10-11T12:00:00Z' },
  { name: 'United States Grand Prix', date: '2026-10-25T19:00:00Z' },
  { name: 'Mexico City Grand Prix', date: '2026-11-01T20:00:00Z' },
  { name: 'São Paulo Grand Prix', date: '2026-11-08T17:00:00Z' },
  { name: 'Las Vegas Grand Prix', date: '2026-11-22T06:00:00Z' },
  { name: 'Qatar Grand Prix', date: '2026-11-29T14:00:00Z' },
  { name: 'Abu Dhabi Grand Prix', date: '2026-12-06T13:00:00Z' },
];

function getNextRace() {
  const now = Date.now();
  for (const race of RACES_2026) {
    if (new Date(race.date).getTime() > now) {
      return { name: race.name, date: new Date(race.date) };
    }
  }
  return null;
}

function useCountdown() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const race = getNextRace();
  if (!race) return null;

  const diff = Math.max(0, race.date.getTime() - now);
  if (diff === 0) return null;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return { name: race.name, countdown: `${d}d ${h}h ${m}m ${s}s` };
}

export default function Navbar() {
  const next = useCountdown();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <span className={styles.logo}>Formula Pulse</span>
        {next && (
          <span className={styles.countdown}>
            {next.name} in <span className={styles.timer}>{next.countdown}</span>
          </span>
        )}
        <div className={styles.links}>
          <NavLink to="/feed" className={({ isActive }) => isActive ? styles.active : styles.link}>Feed</NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? styles.active : styles.link}>Settings</NavLink>
        </div>
      </div>
    </nav>
  );
}
