// Utility to fetch episodes and their draft counts for the dashboard
import { getApiUrl, fetchWithAuth } from "../utils/api";

export async function fetchEpisodesWithDrafts(projectId) {
  const episodesApiUrl = getApiUrl(`/api/projects/${projectId}/episodes`);
  const res = await fetchWithAuth(episodesApiUrl);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.episodes) return [];
  let scriptsList = [];
  try {
    const scriptsApiUrl = getApiUrl(`/api/${projectId}/script-list`);
    const scriptsRes = await fetchWithAuth(scriptsApiUrl);
    const scriptsData = await scriptsRes.json();
    if (scriptsRes.ok && Array.isArray(scriptsData)) {
      scriptsList = scriptsData;
    }
  } catch (e) {
    scriptsList = [];
  }

  const latestScriptByEpisode = new Map();
  scriptsList.forEach((script) => {
    const episodeNumber = String(script?.episodeNumber ?? "").trim();
    if (!episodeNumber) return;
    if (!latestScriptByEpisode.has(episodeNumber)) {
      latestScriptByEpisode.set(episodeNumber, script);
    }
  });

  // Each episode: { ep_number, ep_name, scripts, scripts_count, latest_draft_name }
  return data.episodes.map(ep => {
    const epNumberKey = String(ep?.ep_number ?? "").trim();
    const latestScript = epNumberKey ? latestScriptByEpisode.get(epNumberKey) : null;
    return {
    ep_number: ep.ep_number,
    ep_name: ep.ep_name,
    drafts: Array.isArray(ep.scripts) ? ep.scripts.length : (ep.scripts_count || 0),
    latest_draft_name: latestScript?.name || null,
    latest_draft_id: latestScript?.id || null,
  };
  });
}
