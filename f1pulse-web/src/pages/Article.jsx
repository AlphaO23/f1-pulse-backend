import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './Article.module.css';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://f1-pulse-backend-production.up.railway.app';

const CATEGORY_COLORS = {
  'race result': '#14B8A6',
  'qualifying': '#F59E0B',
  'practice & testing': '#60A5FA',
  'driver transfer': '#818CF8',
  'contract news': '#2DD4BF',
  'penalty': '#F87171',
  'team news': '#34D399',
  'technical update': '#A78BFA',
  'official statement': '#FBBF24',
  'uncategorized': '#9CA3AF',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function Article() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/events/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setEvent)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <button className={styles.back} onClick={() => navigate('/feed')}>
            &larr; Back to Feed
          </button>
          <p className={styles.error}>Article not found.</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loading}>Loading article...</p>
        </div>
      </main>
    );
  }

  const cat = (event.category || '').toLowerCase();
  const badgeColor = CATEGORY_COLORS[cat] || '#9CA3AF';

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => navigate('/feed')}>
          &larr; Back to Feed
        </button>

        <article className={styles.article}>
          <div className={styles.meta}>
            <span className={styles.badge} style={{ background: badgeColor }}>
              {event.category || 'General'}
            </span>
            <span className={styles.date}>{formatDate(event.timestamp)}</span>
          </div>

          <h1 className={styles.title}>{event.title}</h1>

          {event.image_url && (
            <img
              className={styles.heroImage}
              src={event.image_url}
              alt=""
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}

          <div className={styles.sourceLine}>
            <span className={styles.source}>{event.source}</span>
          </div>

          <div className={styles.content}>
            {(event.raw_content || event.summary || '').split('\n').map((para, i) =>
              para.trim() ? <p key={i}>{para}</p> : null
            )}
          </div>

          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.readMore}
            >
              Read full article on {event.source} &rarr;
            </a>
          )}
        </article>
      </div>
    </main>
  );
}
