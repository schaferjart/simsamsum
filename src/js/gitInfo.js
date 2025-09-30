/**
 * Fetch git metadata from the backend and render into header.
 */
export async function initGitInfo({ refreshMs = 60000 } = {}) {
  const branchEl = document.getElementById('gitBranch');
  const commitEl = document.getElementById('gitCommit');
  const linkEl = document.getElementById('repoLink');
  const container = document.getElementById('gitMeta');
  if (!branchEl || !commitEl || !linkEl || !container) return;

  const render = (info) => {
    if (!info || info.available === false) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'inline-flex';
    branchEl.textContent = info.branch || 'unknown';
    const parts = [];
    if (info.commit?.message) parts.push(info.commit.message);
    if (info.commit?.shortSha) parts.push(`(${info.commit.shortSha})`);
    commitEl.textContent = parts.join(' ');
    if (info.repoUrl) linkEl.href = info.repoUrl;
  };

  async function fetchInfo() {
    try {
      const res = await fetch('/api/git-info', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      render(json);
    } catch (e) {
      // On error, hide the container to avoid showing stale or empty info
      container.style.display = 'none';
    }
  }

  await fetchInfo();
  if (refreshMs > 0) setInterval(fetchInfo, refreshMs);
}
