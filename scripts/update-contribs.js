#!/usr/bin/env node
import fs from 'fs/promises';
import {execSync} from 'child_process';

const GH_USER = 'uxillary';
const LIMIT = 8; // keep most recent N items
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Shell: '#89e051',
  Java: '#b07219'
};

function cleanMessage(msg){
  return msg.replace(/^(feat|chore|fix|refactor|docs|test|style|perf|ci|build)(\(.+\))?:\s*/i,'').trim();
}

function fetchJson(url){
  const token = process.env.GITHUB_TOKEN;
  const auth = token ? `-H "Authorization: Bearer ${token}"` : '';
  const out = execSync(`curl -fsSL ${auth} ${url}`, {encoding:'utf8'});
  return JSON.parse(out);
}

async function main(){
  const data = fetchJson(`https://api.github.com/users/${GH_USER}/events/public`);
  const mapped = data
    .filter(e=>['PushEvent','PullRequestEvent','IssuesEvent','ReleaseEvent'].includes(e.type))
    .map(e=>{
      const item = { repo: e.repo.name, date: e.created_at };
      switch(e.type){
        case 'PushEvent': {
          const c = e.payload.commits && e.payload.commits[0];
          item.kind = 'Commit';
          if(c){
            item.message = c.message;
            item.sha = c.sha;
            item.link = `https://github.com/${e.repo.name}/commit/${c.sha}`;
          }else{
            item.message = 'Pushed commits';
            item.link = `https://github.com/${e.repo.name}`;
          }
          break;
        }
        case 'PullRequestEvent':
          item.kind = 'PR';
          item.merged = e.payload.pull_request.merged;
          item.number = e.payload.pull_request.number;
          item.message = e.payload.pull_request.title;
          item.link = e.payload.pull_request.html_url;
          break;
        case 'IssuesEvent':
          item.kind = 'Issue';
          item.number = e.payload.issue.number;
          item.message = e.payload.issue.title;
          item.link = e.payload.issue.html_url;
          break;
        case 'ReleaseEvent':
          item.kind = 'Release';
          item.tag = e.payload.release.tag_name;
          item.message = e.payload.release.name || item.tag;
          item.link = e.payload.release.html_url;
          break;
      }
      item.message = cleanMessage(item.message);
      return item;
    });

  const items = [];
  const seen = new Set();
  for(const item of mapped){
    const key = item.repo + '|' + item.message;
    if(seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if(items.length === LIMIT) break;
  }

  const repos = [...new Set(items.map(i=>i.repo))];
  for(const repo of repos){
    try{
      const j = fetchJson(`https://api.github.com/repos/${repo}`);
      items.filter(i=>i.repo === repo).forEach(i => {
        i.stars = j.stargazers_count;
        i.language = j.language;
        i.avatar = j.owner && j.owner.avatar_url;
        i.langColor = LANG_COLORS[j.language] || '#999';
      });
    }catch{}
  }

  items.forEach(i=>{
    if(i.kind==='Commit' && i.sha) i.shortSha = i.sha.slice(0,7);
    if(i.language && !i.langColor) i.langColor = '#999';
  });

  await fs.writeFile('public/contributions.json', JSON.stringify(items, null, 2) + '\n');
  console.log(`Wrote ${items.length} items to public/contributions.json`);
}

main().catch(err=>{
  console.error(err);
  process.exit(1);
});
