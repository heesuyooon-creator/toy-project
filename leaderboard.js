(function (global) {
  var MAX_RANK = 10;
  var clientPromise = null;

  function localKey(game) {
    return game + "Rankings";
  }

  function loadLocal(game) {
    try {
      var raw = JSON.parse(localStorage.getItem(localKey(game)) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocal(game, list) {
    localStorage.setItem(localKey(game), JSON.stringify(list.slice(0, MAX_RANK)));
  }

  function sortList(list) {
    return list.slice().sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return (a.at || 0) - (b.at || 0);
    });
  }

  function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = (async function () {
      if (!global.supabase || !global.supabase.createClient) return null;
      try {
        var res = await fetch("/api/public-config");
        if (!res.ok) return null;
        var cfg = await res.json();
        if (!cfg.url || !cfg.anonKey) return null;
        return global.supabase.createClient(cfg.url, cfg.anonKey);
      } catch (e) {
        return null;
      }
    })();
    return clientPromise;
  }

  async function isOnline() {
    var client = await getClient();
    return !!client;
  }

  async function fetchRankings(game) {
    var client = await getClient();
    if (!client) return sortList(loadLocal(game)).slice(0, MAX_RANK);

    var result = await client
      .from("rankings")
      .select("name, score, created_at")
      .eq("game", game)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(MAX_RANK);

    if (result.error) {
      console.warn("[leaderboard]", result.error.message);
      return sortList(loadLocal(game)).slice(0, MAX_RANK);
    }

    return (result.data || []).map(function (row) {
      return {
        name: row.name,
        score: row.score,
        at: row.created_at ? Date.parse(row.created_at) : 0
      };
    });
  }

  async function submitScore(game, name, score) {
    var entry = {
      name: String(name || "").trim().slice(0, 12),
      score: Number(score) || 0,
      at: Date.now()
    };

    var local = loadLocal(game);
    local.push(entry);
    saveLocal(game, sortList(local));

    var client = await getClient();
    if (client && entry.name) {
      var result = await client.from("rankings").insert({
        game: game,
        name: entry.name,
        score: entry.score
      });
      if (result.error) {
        console.warn("[leaderboard]", result.error.message);
      }
    }

    return fetchRankings(game);
  }

  global.ToyLeaderboard = {
    MAX_RANK: MAX_RANK,
    isOnline: isOnline,
    fetchRankings: fetchRankings,
    submitScore: submitScore
  };
})(window);
