// gh-contribs.js — compact “micro-card” renderer
(function(){
  const SOURCE = '/public/contributions.json';
  const GITHUB_USER = 'uxillary';
  const GITHUB_EVENTS = `https://api.github.com/users/${GITHUB_USER}/events/public`;
  const FALLBACK_AVATAR = 'https://avatars.githubusercontent.com/u/22217717?v=4';
  const mount = document.getElementById('ossList');
  if(!mount) return;

  const dot = (repo = '') => {
    const r = repo.toLowerCase();
    if (r.includes('hex') || r.includes('labs')) return '#55e6a5';
    if (r.includes('infinitecurios')) return '#60a5fa';
    if (r.includes('synthtax')) return '#a78bfa';
    return '#ff6b6b';
  };

  const pillLabel = (t) => {
    const m = (t || '').toLowerCase();
    if (m === 'commit') return 'Commit';
    if (m === 'push') return 'Push';
    if (m === 'issue' || m === 'issues') return 'Issue';
    if (m === 'pr' || m === 'pullrequest' || m === 'pull_request') return 'PR';
    if (m.includes('merge') || m === 'merged') return 'Merged';
    return t ? t : 'Update';
  };

  const parseRelativeToSeconds = (value) => {
    if(!value) return null;
    if(/just now/i.test(value)) return 0;
    const normalized = String(value).toLowerCase().trim().replace(/about\s+|approximately\s+/g, '');
    const match = normalized.match(/(?:(\d+)|an?|one)\s*(second|sec|minute|min|hour|day|week|month|year)s?/);
    if(!match) return null;
    const amount = match[1] ? parseInt(match[1], 10) : 1;
    const unit = match[2];
    const seconds = unit.startsWith('year') ? amount * 365 * 24 * 3600
      : unit.startsWith('month') ? amount * 30 * 24 * 3600
      : unit.startsWith('week') ? amount * 7 * 24 * 3600
      : unit.startsWith('day') ? amount * 24 * 3600
      : unit.startsWith('hour') ? amount * 3600
      : unit.startsWith('min') ? amount * 60
      : amount;
    return seconds;
  };

  const formatRelativeFromSeconds = (seconds) => {
    if(seconds <= 0) return 'just now';
    if (seconds < 60) return `${Math.floor(seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  const formatRelativeLabel = (value) => {
    if(!value) return '';
    const seconds = parseRelativeToSeconds(value);
    if(seconds == null) return value;
    return formatRelativeFromSeconds(seconds);
  };

  let baseGeneratedAt = Date.now();
  let ticker = null;

  const resolveTimestamp = (item) => {
    if(!item || typeof item !== 'object') return NaN;
    const direct = item.date || item.createdAt || item.timestamp || item.datetime || item.time || item.occurredAt;
    if(direct !== undefined){
      if(typeof direct === 'number' && Number.isFinite(direct)) return direct;
      const parsed = new Date(direct);
      const ms = parsed.getTime();
      if(!Number.isNaN(ms)) return ms;
    }
    const seconds = parseRelativeToSeconds(item.timeAgo);
    if(seconds == null) return NaN;
    const origin = Number.isFinite(baseGeneratedAt) ? baseGeneratedAt : Date.now();
    return origin - seconds * 1000;
  };

  const formatInitialTime = (item, ts) => {
    if(Number.isFinite(ts)){
      const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      return formatRelativeFromSeconds(seconds);
    }
    return formatRelativeLabel(item.timeAgo);
  };

  const updateTimes = () => {
    const now = Date.now();
    mount.querySelectorAll('[data-ts]').forEach((node) => {
      const ts = Number(node.getAttribute('data-ts'));
      if(!Number.isFinite(ts)) return;
      const seconds = Math.max(0, Math.floor((now - ts) / 1000));
      node.textContent = formatRelativeFromSeconds(seconds);
    });
  };

  const ensureTicker = () => {
    if(ticker) return;
    ticker = setInterval(updateTimes, 60 * 1000);
  };

  const uniqueItems = (items) => {
    if(!Array.isArray(items)) return [];
    const seen = new Set();
    return items.filter((item) => {
      if(!item || typeof item !== 'object') return false;
      const key = item.url || `${item.repo || ''}:${item.title || ''}:${item.type || ''}`;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const repoLabel = (value = '') => {
    if(!value) return 'repo';
    return value.toString().split('/').pop() || value;
  };

  const clean = (value = '') => value.toString().split('\n')[0].trim();

  const commitHtmlUrl = (repoFullName, sha, apiUrl) => {
    if(apiUrl && apiUrl.startsWith('https://api.github.com/repos/')){
      return apiUrl.replace('https://api.github.com/repos/', 'https://github.com/').replace('/commits/', '/commit/');
    }
    if(repoFullName && sha){
      return `https://github.com/${repoFullName}/commit/${sha}`;
    }
    return `https://github.com/${repoFullName || GITHUB_USER}`;
  };

  const normaliseEvents = (events) => {
    if(!Array.isArray(events)) return [];
    const items = [];
    for(const event of events){
      if(!event || typeof event !== 'object') continue;
      const repoFullName = event.repo && event.repo.name ? event.repo.name : '';
      const repo = repoLabel(repoFullName);
      const createdAt = event.created_at;
      const avatar = event.actor && event.actor.avatar_url ? event.actor.avatar_url : FALLBACK_AVATAR;
      const base = { repo, avatar, date: createdAt };

      const pushCommits = () => {
        const commits = event.payload && Array.isArray(event.payload.commits) ? event.payload.commits : [];
        if(!commits.length){
          return [{
            ...base,
            title: `Pushed to ${event.payload && event.payload.ref ? event.payload.ref.replace('refs/heads/', '') : repo}`,
            type: 'Push',
            url: `https://github.com/${repoFullName}`,
            shortRef: event.payload && event.payload.head ? event.payload.head.slice(0, 10) : ''
          }];
        }
        return commits.map((commit) => ({
          ...base,
          title: clean(commit && commit.message ? commit.message : 'Updated commit'),
          type: 'Commit',
          url: commitHtmlUrl(repoFullName, commit && commit.sha, commit && commit.url),
          shortRef: commit && commit.sha ? commit.sha.slice(0, 10) : ''
        }));
      };

      const pullRequest = () => {
        const pr = event.payload && event.payload.pull_request;
        if(!pr) return [];
        const merged = pr.merged || (event.payload.action === 'closed' && pr.merged_at);
        const type = merged ? 'Merged' : 'PR';
        return [{
          ...base,
          title: clean(pr.title || 'Pull request update'),
          type,
          url: pr.html_url || pr.url,
          shortRef: pr.number != null ? `#${pr.number}` : ''
        }];
      };

      const issue = () => {
        const issue = event.payload && event.payload.issue;
        if(!issue) return [];
        const action = event.payload.action;
        const type = action === 'opened' ? 'Issue' : action === 'closed' ? 'Closed' : 'Issue';
        return [{
          ...base,
          title: clean(issue.title || 'Issue update'),
          type,
          url: issue.html_url || issue.url,
          shortRef: issue.number != null ? `#${issue.number}` : ''
        }];
      };

      const issueComment = () => {
        const issue = event.payload && event.payload.issue;
        const comment = event.payload && event.payload.comment;
        if(!issue || !comment) return [];
        return [{
          ...base,
          title: clean(`Commented: ${issue.title || 'Issue'}`),
          type: 'Comment',
          url: comment.html_url || issue.html_url || comment.url,
          shortRef: issue.number != null ? `#${issue.number}` : ''
        }];
      };

      const review = () => {
        const pr = event.payload && event.payload.pull_request;
        const review = event.payload && event.payload.review;
        if(!pr) return [];
        const action = event.payload.action || (review && review.state);
        const type = action ? `Review ${action}` : 'Review';
        return [{
          ...base,
          title: clean(pr.title || 'Pull request review'),
          type,
          url: (review && review.html_url) || pr.html_url || pr.url,
          shortRef: pr.number != null ? `#${pr.number}` : ''
        }];
      };

      const release = () => {
        const release = event.payload && event.payload.release;
        if(!release) return [];
        return [{
          ...base,
          title: clean(release.name || release.tag_name || 'Release'),
          type: 'Release',
          url: release.html_url || release.url,
          shortRef: release.tag_name || ''
        }];
      };

      const create = () => {
        const refType = event.payload && event.payload.ref_type;
        const ref = event.payload && event.payload.ref;
        if(!refType) return [];
        return [{
          ...base,
          title: ref ? `Created ${refType} ${ref}` : `Created ${refType}`,
          type: 'Create',
          url: `https://github.com/${repoFullName}`,
          shortRef: ref || ''
        }];
      };

      const del = () => {
        const refType = event.payload && event.payload.ref_type;
        const ref = event.payload && event.payload.ref;
        if(!refType) return [];
        return [{
          ...base,
          title: ref ? `Deleted ${refType} ${ref}` : `Deleted ${refType}`,
          type: 'Delete',
          url: `https://github.com/${repoFullName}`,
          shortRef: ref || ''
        }];
      };

      const fork = () => {
        const forkee = event.payload && event.payload.forkee;
        return [{
          ...base,
          title: clean(forkee && forkee.full_name ? `Forked to ${forkee.full_name}` : 'Forked repository'),
          type: 'Fork',
          url: forkee && forkee.html_url ? forkee.html_url : `https://github.com/${repoFullName}`,
          shortRef: ''
        }];
      };

      const watch = () => [{
        ...base,
        title: 'Starred repository',
        type: 'Star',
        url: `https://github.com/${repoFullName}`,
        shortRef: ''
      }];

      const publicised = () => [{
        ...base,
        title: 'Made repository public',
        type: 'Public',
        url: `https://github.com/${repoFullName}`,
        shortRef: ''
      }];

      const mapping = {
        PushEvent: pushCommits,
        PullRequestEvent: pullRequest,
        IssuesEvent: issue,
        IssueCommentEvent: issueComment,
        PullRequestReviewEvent: review,
        PullRequestReviewCommentEvent: review,
        ReleaseEvent: release,
        CreateEvent: create,
        DeleteEvent: del,
        ForkEvent: fork,
        WatchEvent: watch,
        PublicEvent: publicised
      };

      const resolver = mapping[event.type];
      const result = resolver ? resolver() : [];
      for(const item of result){
        if(item && typeof item === 'object') items.push(item);
      }

      if(items.length >= 16) break;
    }
    return items;
  };

  const fetchGitHubContributions = async () => {
    const res = await fetch(GITHUB_EVENTS, {
      cache: 'no-store',
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if(!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    const items = normaliseEvents(data);
    if(!items.length) throw new Error('No GitHub events');
    return {
      generatedAt: Date.now(),
      items
    };
  };

  const fetchBackupContributions = async () => {
    const res = await fetch(SOURCE, { cache: 'reload' });
    const data = await res.json();
    const generatedAt = data && data.generatedAt ? new Date(data.generatedAt).getTime() : Date.now();
    const raw = Array.isArray(data) ? data : (data && data.items) || [];
    return {
      generatedAt,
      items: uniqueItems(raw)
    };
  };

  const loader = () => {
    mount.setAttribute('aria-busy','true');
    mount.classList.add('oss-grid');
    mount.innerHTML = `
      <div class="t-card flex items-center justify-center min-h-[140px]">
        <div class="tetris-loader" role="status" aria-label="Loading contributions">
          ${Array.from({ length: 12 }).map(() => '<span></span>').join('')}
        </div>
      </div>
    `;
  };

  const render = (items) => {
    mount.classList.add('oss-grid');
    if(!items.length){
      mount.innerHTML = `<div class="t-card">No recent contributions found.</div>`;
      mount.removeAttribute('aria-busy');
      return;
    }

    mount.innerHTML = items.map((it) => {
      const href = it.url || it.link || '#';
      const avatar = it.avatar || it.userAvatar || FALLBACK_AVATAR;
      const repo = it.repo || it.repository || it.project || 'repo';
      const title = it.title || it.message || it.subtitle || '';
      const type = pillLabel(it.type || it.kind);
      const ref = (it.shortRef || it.sha || it.id || it.number || '').toString().trim();
      const hash = ref ? ref.slice(0, 10) : '';
      const ts = resolveTimestamp(it);
      const when = formatInitialTime(it, ts);
      const timeAttr = Number.isFinite(ts) ? ` data-ts="${ts}"` : '';

      return `
        <a class="oss-card" href="${href}" rel="noopener noreferrer">
          <div class="oss-head">
            <img class="oss-ava" src="${avatar}" alt="" loading="lazy" decoding="async" />
            <div class="flex-1 min-w-0">
              <div class="oss-repo clamp-1">${repo}</div>
              <div class="oss-title clamp-2">${title}</div>
            </div>
            <span class="oss-dot" style="background:${dot(repo)}"></span>
          </div>
          <span class="oss-pill">${type}</span>
          <div class="oss-meta">
            ${hash ? `<span class="oss-sha">${hash}</span><span class="sep">•</span>` : ''}
            <span class="oss-time"${timeAttr}>${when}</span>
          </div>
        </a>
      `;
    }).join('');
    mount.removeAttribute('aria-busy');
    updateTimes();
    ensureTicker();
  };

  async function load(){
    loader();
    try{
      const { generatedAt, items } = await fetchGitHubContributions();
      baseGeneratedAt = Number.isNaN(generatedAt) ? Date.now() : generatedAt;
      render(uniqueItems(items).slice(0, 8));
      return;
    }catch(err){
      console.warn('GitHub contributions unavailable, falling back to backup feed.', err);
    }

    try{
      const { generatedAt, items } = await fetchBackupContributions();
      baseGeneratedAt = Number.isNaN(generatedAt) ? Date.now() : generatedAt;
      render(items.slice(0, 8));
    }catch(e){
      console.error('contribs load failed', e);
      mount.innerHTML = `<div class="t-card">Couldn’t load contributions.</div>`;
      mount.removeAttribute('aria-busy');
    }
  }

  load();
  const btn = document.getElementById('refreshContribs');
  if(btn) btn.addEventListener('click', load);
})();
