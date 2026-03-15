// Single source of truth for all F1 team colors.
// Used by: Standings (Drivers & Constructors), Results (Qualifying & Race), and any other component.
// Keys must match EXACTLY what the Ergast/jolpi API returns as Constructor.name.

const TEAM_COLORS = {
  // Current teams (2024-2026) — API names
  'McLaren':            '#FF8700',
  'Ferrari':            '#DC0000',
  'Red Bull':           '#0600EF',
  'Mercedes':           '#00D2BE',
  'Aston Martin':       '#006F62',
  'Alpine F1 Team':     '#FF00FF',
  'Haas F1 Team':       '#FFFFFF',
  'Williams':           '#005AFF',
  'RB F1 Team':         '#2B4562',
  'Sauber':             '#52E252',
  'Kick Sauber':        '#52E252',

  // 2026 new teams
  'Audi':               '#E63946',
  'Audi F1 Team':       '#E63946',
  'Cadillac F1 Team':   '#A8A8A8',

  // Aliases (short names used in static data / UI)
  'Alpine':             '#FF00FF',
  'Haas':               '#FFFFFF',
  'Racing Bulls':       '#2B4562',
  'RB':                 '#2B4562',
  'Red Bull Racing':    '#0600EF',

  // AlphaTauri (2020-2023)
  'AlphaTauri':         '#5E8FAA',

  // Toro Rosso (2006-2019)
  'Toro Rosso':         '#469BFF',
  'Scuderia Toro Rosso':'#469BFF',

  // Renault F1 (2002-2011, 2016-2020)
  'Renault':            '#FFF500',

  // Lotus (Enstone, 2012-2015)
  'Lotus F1':           '#FFB800',
  'Lotus':              '#FFB800',

  // Force India / Racing Point (2008-2020)
  'Force India':        '#F596C8',
  'Racing Point':       '#F596C8',
  'BWT Racing Point':   '#F596C8',

  // Alfa Romeo (2019-2023)
  'Alfa Romeo':         '#C92D4B',
  'Alfa Romeo Racing':  '#C92D4B',

  // Classic / defunct teams
  'BAR':                '#FFFFFF',
  'Honda':              '#FFFFFF',
  'Honda Racing':       '#FFFFFF',
  'Brawn':              '#B1D34B',
  'Jaguar':             '#004225',
  'Stewart':            '#FFFFFF',
  'Jordan':             '#FFC600',
  'Minardi':            '#000000',
  'Prost':              '#0033CC',
  'Arrows':             '#FF6600',
  'Benetton':           '#00B140',
  'Tyrrell':            '#002D62',
  'Caterham':           '#005030',
  'Team Lotus':         '#005030',
  'Marussia':           '#ED1C24',
  'Manor Marussia':     '#ED1C24',
  'Manor':              '#ED1C24',
  'HRT':                '#968C6E',
  'Virgin':             '#CC0000',
  'Spyker':             '#FF6600',
  'MF1':                '#FF6600',
  'Midland':            '#FF6600',
  'Super Aguri':        '#FFFFFF',
  'Toyota':             '#CC0000',
  'BMW Sauber':         '#1D1B1E',

  // McLaren historical API variants
  'McLaren Mercedes':   '#FF8700',
  'McLaren Honda':      '#FF8700',
  'McLaren Renault':    '#FF8700',
};

// Helper: look up team color with fallback.
// Logs unknown teams to console for debugging.
export function getTeamColor(teamName) {
  const color = TEAM_COLORS[teamName];
  if (!color) {
    console.warn(`[teamColors] Unknown team: "${teamName}" — using fallback gray`);
    return '#6B7280';
  }
  return color;
}

export default TEAM_COLORS;
