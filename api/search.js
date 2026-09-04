module.exports = async function handler(req, res) {
  try {
    const term =
      typeof req.query?.term === "string" ? req.query.term.trim() : "";

    if (!term) {
      return res.status(400).json({
        error: "Missing search term",
      });
    }

    const appleURL =
      "https://itunes.apple.com/search" +
      "?term=" +
      encodeURIComponent(term) +
      "&country=NG" +
      "&media=music" +
      "&entity=song" +
      "&limit=30";

    const response = await fetch(appleURL);

    if (!response.ok) {
      return res.status(502).json({
        error: "Apple Music search returned HTTP " + response.status,
      });
    }

    const data = await response.json();

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

    return res.status(200).json(data);
  } catch (error) {
    console.error("TONEARM API ERROR:", error);

    return res.status(500).json({
      error: "Music search service failed",
      details: error.message,
    });
  }
};
