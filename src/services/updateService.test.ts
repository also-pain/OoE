import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareSemver,
  parseReleaseCheck,
  selectApkAsset,
  type GitHubReleasePayload,
} from './updateService';

describe('updateService', () => {
  it('compares semantic versions accurately', () => {
    assert.equal(compareSemver('v1.0.1', '1.0.0'), 1);
    assert.equal(compareSemver('1.10.0', '1.2.0'), 1);
    assert.equal(compareSemver('v1.0.0', '1.0.0'), 0);
    assert.equal(compareSemver('1.0.0', 'v1.2.0'), -1);
  });

  it('prefers MySlot_vx.y.z.apk asset over other assets', () => {
    const asset = selectApkAsset([
      { name: 'checksums.txt', browser_download_url: 'https://example.com/sums.txt' },
      { name: 'other.apk', browser_download_url: 'https://example.com/other.apk' },
      {
        name: 'MySlot_v1.2.0.apk',
        browser_download_url: 'https://example.com/MySlot_v1.2.0.apk',
      },
    ]);
    assert.equal(asset?.name, 'MySlot_v1.2.0.apk');
  });

  it('detects newer GitHub release tag and returns APK download URL', () => {
    const payload: GitHubReleasePayload = {
      tag_name: 'v1.1.0',
      html_url: 'https://github.com/also-pain/OoE/releases/tag/v1.1.0',
      body: 'Added new widgets and bug fixes.',
      assets: [
        {
          name: 'MySlot_v1.1.0.apk',
          browser_download_url:
            'https://github.com/also-pain/OoE/releases/download/v1.1.0/MySlot_v1.1.0.apk',
        },
      ],
    };

    const result = parseReleaseCheck(payload, '1.0.0');
    assert.equal(result.hasUpdate, true);
    assert.equal(result.latestVersion, '1.1.0');
    assert.equal(result.assetName, 'MySlot_v1.1.0.apk');
    assert.equal(
      result.downloadUrl,
      'https://github.com/also-pain/OoE/releases/download/v1.1.0/MySlot_v1.1.0.apk'
    );
  });

  it('reports no update when latest tag matches current version', () => {
    const payload: GitHubReleasePayload = {
      tag_name: 'v1.0.0',
      html_url: 'https://github.com/also-pain/OoE/releases/tag/v1.0.0',
      assets: [],
    };
    const result = parseReleaseCheck(payload, '1.0.0');
    assert.equal(result.hasUpdate, false);
    assert.equal(result.downloadUrl, payload.html_url);
  });
});
