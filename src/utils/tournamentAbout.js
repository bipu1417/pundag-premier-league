export const canEditTournamentAbout = (tournament, auth) => Boolean(
  tournament?.id && auth.user && (
    tournament.ownerId === auth.user.uid || auth.isCreator || auth.role === "platformAdmin"
  )
);

export const newAboutId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const safeAboutImage = (value) => {
  if (typeof value !== "string") return "";
  // Bundled legacy images are served from the app; editor images use HTTPS URLs.
  if (value.startsWith("/static/media/")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
};

export const validateAbout = (page) => {
  if (page.intro.length > 2000 || page.sections.length > 20) {
    throw new Error("Use up to 2,000 introduction characters and 20 sections.");
  }
  for (const section of page.sections) {
    if (!section.title.trim() || section.title.length > 120 || section.body.length > 6000 || section.entries.length > 30) {
      throw new Error("Each section needs a title (up to 120 characters), up to 6,000 text characters and at most 30 cards.");
    }
    for (const entry of section.entries) {
      if (!entry.title.trim() || entry.title.length > 120 || entry.subtitle.length > 200 || entry.description.length > 2000) {
        throw new Error("Each card needs a title (up to 120 characters), a subtitle up to 200 characters and details up to 2,000 characters.");
      }
      if (entry.imageUrl && !safeAboutImage(entry.imageUrl)) {
        throw new Error("Use a valid HTTPS image URL.");
      }
    }
  }
  return page;
};

export const readAbout = (data = {}) => ({
  intro: typeof data.intro === "string" ? data.intro : "",
  sections: Array.isArray(data.sections) ? data.sections.slice(0, 20).filter(section => section && typeof section.title === "string").map((section, index) => ({
    id: typeof section.id === "string" ? section.id : `section-${index}`,
    title: section.title,
    body: typeof section.body === "string" ? section.body : "",
    entries: Array.isArray(section.entries) ? section.entries.slice(0, 30).filter(entry => entry && typeof entry.title === "string").map((entry, entryIndex) => ({
      id: typeof entry.id === "string" ? entry.id : `entry-${entryIndex}`,
      title: entry.title,
      subtitle: typeof entry.subtitle === "string" ? entry.subtitle : "",
      description: typeof entry.description === "string" ? entry.description : "",
      imageUrl: safeAboutImage(entry.imageUrl),
    })) : [],
  })) : [],
});
