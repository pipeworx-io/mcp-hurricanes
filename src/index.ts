interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Hurricanes / tropical cyclones MCP.
 *
 * Keyless: current active tropical cyclones from the US National Hurricane
 * Center (NHC) — name, classification, Saffir-Simpson category, position,
 * intensity, movement, and links to the official advisories/forecast cone.
 * Free, no key. Atlantic + Eastern/Central Pacific basins.
 */


const URL = 'https://www.nhc.noaa.gov/CurrentStorms.json';
const UA = 'pipeworx-mcp-hurricanes/1.0 (+https://pipeworx.io)';

const CLASS: Record<string, string> = {
  TD: 'Tropical Depression', TS: 'Tropical Storm', HU: 'Hurricane', MH: 'Major Hurricane',
  STD: 'Subtropical Depression', STS: 'Subtropical Storm', PTC: 'Potential Tropical Cyclone',
  PC: 'Post-Tropical Cyclone', DB: 'Disturbance',
};
const BASIN: Record<string, string> = { al: 'Atlantic', ep: 'Eastern Pacific', cp: 'Central Pacific' };

function category(kt: number): string | null {
  if (kt < 64) return null;
  if (kt < 83) return 'Category 1';
  if (kt < 96) return 'Category 2';
  if (kt < 113) return 'Category 3';
  if (kt < 137) return 'Category 4';
  return 'Category 5';
}

function normalize(s: any) {
  const kt = Number(s.intensity);
  const basinCode = String(s.id ?? '').slice(0, 2).toLowerCase();
  return {
    id: s.id,
    name: s.name,
    basin: BASIN[basinCode] ?? basinCode.toUpperCase(),
    classification: CLASS[s.classification] ?? s.classification,
    saffir_simpson: category(kt),
    max_sustained_winds_kt: kt,
    max_sustained_winds_mph: Math.round(kt * 1.15078),
    min_pressure_mb: s.pressure ? Number(s.pressure) : null,
    position: { lat: s.latitudeNumeric, lon: s.longitudeNumeric, text: `${s.latitude} ${s.longitude}` },
    movement: { direction_deg: s.movementDir, speed_kt: s.movementSpeed },
    last_update: s.lastUpdate,
    advisory_url: s.publicAdvisory?.url ?? null,
    forecast_discussion_url: s.forecastDiscussion?.url ?? null,
    forecast_track_url: s.forecastTrack?.url ?? null,
    cone_url: s.trackCone?.url ?? null,
    watches_warnings_url: s.windWatchesWarnings?.url ?? null,
  };
}

async function fetchStorms(): Promise<any[]> {
  const res = await fetch(URL, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`NHC error: ${res.status} ${await res.text().then((t) => t.slice(0, 120))}`);
  const j = (await res.json()) as { activeStorms?: any[] };
  return j.activeStorms ?? [];
}

const tools: McpToolExport['tools'] = [
  {
    name: 'active_storms',
    description:
      'List currently active tropical cyclones (tropical storms / hurricanes) from the US National Hurricane Center — name, classification, Saffir-Simpson category, position, max winds, pressure, movement, and links to official advisories/forecast cone. Filter by basin. Keyless. Returns an empty list in the off-season.',
    inputSchema: { type: 'object', properties: { basin: { type: 'string', description: 'Optional filter: "atlantic", "eastern-pacific", or "central-pacific".' } } },
  },
  {
    name: 'storm_details',
    description: 'Full details for one active storm by id (e.g. "al052026") or name (e.g. "Douglas"), including all advisory/forecast/cone/surge product links. Keyless.',
    inputSchema: { type: 'object', properties: { storm: { type: 'string', description: 'Storm id or name.' } }, required: ['storm'] },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const storms = await fetchStorms();
  switch (name) {
    case 'active_storms': {
      let list = storms.map(normalize);
      const basin = typeof args.basin === 'string' ? args.basin.toLowerCase().replace(/[\s_]/g, '-') : '';
      const wanted: Record<string, string> = { atlantic: 'Atlantic', 'eastern-pacific': 'Eastern Pacific', 'central-pacific': 'Central Pacific' };
      if (basin && wanted[basin]) list = list.filter((s) => s.basin === wanted[basin]);
      return { count: list.length, storms: list, note: list.length ? undefined : 'No active tropical cyclones right now (or none in that basin).' };
    }
    case 'storm_details': {
      const q = reqStr(args, 'storm', '"al052026"').toLowerCase();
      const raw = storms.find((s: any) => String(s.id).toLowerCase() === q || String(s.name).toLowerCase() === q);
      if (!raw) return { query: args.storm, found: false, reason: 'No active storm with that id/name. Use active_storms to list current storms.' };
      return { found: true, ...normalize(raw), advisory_number: raw.publicAdvisory?.advNum ?? null, wind_speed_probabilities_url: raw.windSpeedProbabilities?.url ?? null, storm_surge_watch_warning_url: raw.stormSurgeWatchWarningGIS?.url ?? null };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function reqStr(args: Record<string, unknown>, key: string, ex: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${ex}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
