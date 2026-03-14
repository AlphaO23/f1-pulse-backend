import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';
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

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (d > 0 || h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);

  return { name: race.name, countdown: parts.join(' ') };
}

function PulseIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline
        points="2,12 6,12 9,4 12,20 15,8 18,16 20,12 22,12"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 2h12v6a6 6 0 0 1-12 0V2z"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 4H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h1"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 4h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 14v3"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 21h8"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 17h4v4h-4z"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2v20" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M4 4h16l-3 4 3 4H4"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="6" y="4" width="3" height="4" fill="#14B8A6" opacity="0.7" />
      <rect x="12" y="4" width="3" height="4" fill="#14B8A6" opacity="0.7" />
      <rect x="9" y="8" width="3" height="4" fill="#14B8A6" opacity="0.7" />
      <rect x="15" y="8" width="2.5" height="4" fill="#14B8A6" opacity="0.7" />
    </svg>
  );
}

function TracksIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Globe */}
      <circle cx="12" cy="12" r="10" stroke="#14B8A6" strokeWidth="1.8" />
      <ellipse cx="12" cy="12" rx="4.5" ry="10" stroke="#14B8A6" strokeWidth="1.4" />
      <path d="M2.5 9h19M2.5 15h19" stroke="#14B8A6" strokeWidth="1.2" strokeLinecap="round" />
      {/* Pin 1 — top-left on globe surface */}
      <circle cx="7.5" cy="7" r="1.6" fill="#14B8A6" />
      <circle cx="7.5" cy="7" r="0.6" fill="#4B5563" />
      {/* Pin 2 — bottom-right on globe surface */}
      <circle cx="16" cy="15.5" r="1.6" fill="#14B8A6" />
      <circle cx="16" cy="15.5" r="0.6" fill="#4B5563" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3z"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3z"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        stroke="#14B8A6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const [hovered, setHovered] = useState(false);
  const next = useCountdown();

  const handleEnter = () => setHovered(true);
  const handleLeave = () => setHovered(false);

  return (
    <nav
      className={`${styles.nav} ${hovered ? 'nav-hovered' : ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className={styles.inner}>
        <Logo />
        <div className={styles.links}>
          <NavLink to="/feed" className={({ isActive }) => isActive ? styles.active : styles.link}>
            <PulseIcon />
            <span className={styles.linkText}>Pulse News</span>
          </NavLink>
          <NavLink to="/results" className={({ isActive }) => isActive ? styles.active : styles.link}>
            <FlagIcon />
            <span className={styles.linkText}>Results</span>
          </NavLink>
          <NavLink to="/tracks" className={({ isActive }) => isActive ? styles.active : styles.link}>
            <TracksIcon />
            <span className={styles.linkText}>Tracks</span>
          </NavLink>
          <NavLink to="/standings" className={({ isActive }) => isActive ? styles.active : styles.link}>
            <TrophyIcon />
            <span className={styles.linkText}>Standings</span>
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? styles.active : styles.link}>
            <BookIcon />
            <span className={styles.linkText}>History</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? styles.active : styles.link}>
            <WrenchIcon />
            <span className={styles.linkText}>Settings</span>
          </NavLink>
        </div>
        {next && (
          <div className={styles.countdown}>
            <span className={styles.timerShort}>{next.countdown}</span>
            <span className={styles.timerFull}>{next.name} in {next.countdown}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
