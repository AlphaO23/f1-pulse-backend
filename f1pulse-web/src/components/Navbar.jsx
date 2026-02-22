import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

const NEXT_RACE = {
  name: 'Australian Grand Prix',
  date: new Date('2026-03-15T05:00:00Z'),
};

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  if (diff === 0) return null;
  return `${d}d ${h}h ${m}m ${s}s`;
}

export default function Navbar() {
  const countdown = useCountdown(NEXT_RACE.date);

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <span className={styles.logo}>Formula Pulse</span>
        {countdown && (
          <span className={styles.countdown}>
            {NEXT_RACE.name} in <span className={styles.timer}>{countdown}</span>
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
