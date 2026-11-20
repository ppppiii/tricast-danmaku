// Lightweight GitHub Releases update checker for TriCast Danmaku.
// Uses read-only GET to GitHub public Releases API (CORS-enabled, zero user data sent).

export const UPDATE_STORAGE_KEY = 'tcd_update_v1';
export const REPO_RELEASES_API = 'https://api.github.com/repos/ppppiii/tricast-danmaku/releases/latest';
export const REPO_RELEASES_URL = 'https://github.com/ppppiii/tricast-danmaku/releases/latest';
export const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function normalizeVersion(raw) {
  return String(raw || '')
    .trim()
    .replace(/^v/i, '')
    .split('-')[0];
}

export function compareVersions(a, b) {
  const pa = normalizeVersion(a)
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const pb = normalizeVersion(b)
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

export function computeUpdateState(currentVersion, cached = null) {
  const cur = normalizeVersion(currentVersion);
  const latest = normalizeVersion(cached?.latestVersion || '');
  const hasUpdate = Boolean(latest && cur && compareVersions(latest, cur) > 0);
  const dismissed = Boolean(hasUpdate && normalizeVersion(cached?.dismissedVersion) === latest);
  return {
    currentVersion: cur,
    latestVersion: latest,
    hasUpdate,
    dismissed,
    shouldNotify: hasUpdate && !dismissed,
    releaseUrl: cached?.releaseUrl || REPO_RELEASES_URL,
    releaseName: cached?.releaseName || (latest ? `v${latest}` : ''),
    checkedAt: Number(cached?.checkedAt) || 0,
    dismissedVersion: cached?.dismissedVersion || '',
  };
}

export async function readCachedUpdate(storage = chrome?.storage?.local) {
  try {
    const res = await storage?.get?.(UPDATE_STORAGE_KEY);
    return res?.[UPDATE_STORAGE_KEY] || null;
  } catch {
    return null;
  }
}

export async function writeCachedUpdate(data, storage = chrome?.storage?.local) {
  try {
    await storage?.set?.({ [UPDATE_STORAGE_KEY]: data });
  } catch {}
}

export async function dismissUpdateVersion(version, currentVersion, storage = chrome?.storage?.local) {
  const prev = (await readCachedUpdate(storage)) || {};
  const next = {
    ...prev,
    dismissedVersion: normalizeVersion(version || prev.latestVersion),
  };
  await writeCachedUpdate(next, storage);
  return computeUpdateState(currentVersion, next);
}

export async function checkForUpdate({
  currentVersion,
  force = false,
  fetchImpl = globalThis.fetch,
  storage = chrome?.storage?.local,
  now = Date.now(),
} = {}) {
  const prev = (await readCachedUpdate(storage)) || {};
  if (!force && prev.checkedAt && now - Number(prev.checkedAt) < CHECK_INTERVAL_MS) {
    return computeUpdateState(currentVersion, prev);
  }

  try {
    const res = await fetchImpl(REPO_RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { ...computeUpdateState(currentVersion, prev), error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const latestVersion = normalizeVersion(data?.tag_name || data?.name || '');
    if (!latestVersion) {
      return computeUpdateState(currentVersion, prev);
    }
    const next = {
      ...prev,
      checkedAt: now,
      latestVersion,
      releaseUrl: typeof data?.html_url === 'string' && data.html_url ? data.html_url : REPO_RELEASES_URL,
      releaseName: String(data?.name || data?.tag_name || `v${latestVersion}`).trim().slice(0, 120),
    };
    await writeCachedUpdate(next, storage);
    return computeUpdateState(currentVersion, next);
  } catch (err) {
    return { ...computeUpdateState(currentVersion, prev), error: err?.message || 'network_error' };
  }
}
