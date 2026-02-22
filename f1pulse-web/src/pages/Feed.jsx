import { useState, useEffect, useRef, useCallback } from 'react';
import EventCard from '../components/EventCard';
import CategoryFilter from '../components/CategoryFilter';
import styles from './Feed.module.css';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://f1-pulse-backend-production.up.railway.app';

export default function Feed() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const sentinel = useRef(null);

  const fetchEvents = useCallback(async (p, cat, append) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (cat) params.set('category', cat);
      const res = await fetch(`${API}/api/feed?${params}`);
      const json = await res.json();
      const items = Array.isArray(json) ? json
        : json.data || json.events || json.items || [];
      if (append) {
        setEvents((prev) => [...prev, ...items]);
      } else {
        setEvents(items);
      }
      setHasMore(items.length === 20);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then((r) => r.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json.data || json.categories || [];
        setCategories(list);
      })
      .catch(() => {});
  }, []);

  const categoryRef = useRef(category);

  useEffect(() => {
    categoryRef.current = category;
    setPage(1);
    setEvents([]);
    setHasMore(true);
    fetchEvents(1, category, false);
  }, [category, fetchEvents]);

  useEffect(() => {
    if (page === 1) return;
    // Only fetch if category hasn't changed since page was set
    if (categoryRef.current === category) {
      fetchEvents(page, category, true);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sentinel.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Latest News</h1>
        <p className={styles.disclaimer}>
          Formula Pulse is an independent motorsport news platform and is not affiliated with Formula 1 or any teams.
        </p>
        <CategoryFilter categories={categories} active={category} onChange={setCategory} />
        <div className={styles.list}>
          {events.map((ev, i) => (
            <EventCard key={ev.id || ev._id} event={ev} index={i} />
          ))}
        </div>
        {initialLoad && <p className={styles.status}>Loading...</p>}
        {!initialLoad && events.length === 0 && <p className={styles.status}>No events found.</p>}
        {loading && !initialLoad && <p className={styles.status}>Loading more...</p>}
        <div ref={sentinel} />
      </div>
    </main>
  );
}
