export default function MediaCard({ media }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl shadow-black/25 transition duration-300 hover:-translate-y-1 hover:border-yellow-300/30 hover:shadow-yellow-500/10">
      {media.type === "image" ? (
        <img
          src={media.url}
          alt="Tournament glimpse"
          loading="lazy"   // ✅ Lazy Loading
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <video
          src={media.url}
          controls
          preload="none"   // ✅ Lazy load video
          className="h-56 w-full object-cover"
        />
      )}
    </div>
  );
}
