import pkg from '../../package.json';

export const GITHUB_REPO = 'also-pain/OoE';
export const GITHUB_LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const CURRENT_APP_VERSION: string = pkg.version ?? '1.0.0';

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
}

export interface GitHubReleasePayload {
  tag_name: string;
  name?: string;
  body?: string;
  html_url: string;
  published_at?: string;
  assets?: GitHubReleaseAsset[];
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  tagName: string;
  downloadUrl: string;
  releasePageUrl: string;
  releaseNotes?: string;
  assetName?: string;
}

export function normalizeVersion(tagOrVersion: string): string {
  return tagOrVersion.trim().replace(/^v/i, '');
}

/**
 * Compares two semver strings (e.g. "1.0.1" vs "1.0.0").
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareSemver(a: string, b: string): number {
  const partsA = normalizeVersion(a)
    .split('.')
    .map((n) => Number.parseInt(n.replace(/\D.*$/, ''), 10) || 0);
  const partsB = normalizeVersion(b)
    .split('.')
    .map((n) => Number.parseInt(n.replace(/\D.*$/, ''), 10) || 0);

  const len = Math.max(partsA.length, partsB.length, 3);
  for (let i = 0; i < len; i++) {
    const va = partsA[i] ?? 0;
    const vb = partsB[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export function selectApkAsset(
  assets: GitHubReleaseAsset[] | undefined
): GitHubReleaseAsset | undefined {
  if (!assets || assets.length === 0) return undefined;
  return (
    assets.find((a) => /^MySlot_v.*\.apk$/i.test(a.name)) ??
    assets.find((a) => a.name.toLowerCase().endsWith('.apk'))
  );
}

export function parseReleaseCheck(
  release: GitHubReleasePayload,
  currentVersion: string = CURRENT_APP_VERSION
): UpdateCheckResult {
  const latestVersion = normalizeVersion(release.tag_name);
  const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;
  const apkAsset = selectApkAsset(release.assets);

  return {
    hasUpdate,
    currentVersion: normalizeVersion(currentVersion),
    latestVersion,
    tagName: release.tag_name,
    downloadUrl: apkAsset?.browser_download_url ?? release.html_url,
    releasePageUrl: release.html_url,
    releaseNotes: release.body,
    assetName: apkAsset?.name,
  };
}

export async function checkForGitHubUpdate(
  currentVersion: string = CURRENT_APP_VERSION
): Promise<UpdateCheckResult> {
  const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (response.status === 404) {
    return {
      hasUpdate: false,
      currentVersion: normalizeVersion(currentVersion),
      latestVersion: normalizeVersion(currentVersion),
      tagName: `v${normalizeVersion(currentVersion)}`,
      downloadUrl: `https://github.com/${GITHUB_REPO}/releases`,
      releasePageUrl: `https://github.com/${GITHUB_REPO}/releases`,
    };
  }

  if (!response.ok) {
    throw new Error(`GitHub update check failed (${response.status})`);
  }

  const payload = (await response.json()) as GitHubReleasePayload;
  return parseReleaseCheck(payload, currentVersion);
}
