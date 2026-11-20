import { useState } from "react";
import { AlertModal } from "./ui/AppModal";

export default function AdminTournamentUpload() {
  const [files, setFiles] = useState([]);
  const [alert, setAlert] = useState(null);

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleUpload = () => {
    setAlert({
      title: "Upload ready",
      message: `${files.length} file${files.length === 1 ? "" : "s"} selected. Connect this action to Firebase Storage or your backend to complete media publishing.`,
      tone: "info",
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-3 sm:p-6">
      <h2 className="mb-4 text-2xl font-bold text-white">
        Upload Tournament Media
      </h2>

      <div className="surface space-y-4 rounded-2xl p-5 sm:p-6">
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="block w-full p-2 text-sm text-slate-300
          file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:bg-yellow-400 file:font-semibold file:text-slate-950
          hover:file:bg-yellow-300"
        />

        <button
          onClick={handleUpload}
          className="rounded-xl bg-gradient-to-r from-yellow-300 to-amber-400 px-6 py-2.5 font-bold text-slate-950 shadow-lg shadow-yellow-500/15 transition hover:brightness-105"
        >
          Upload Media
        </button>

        <p className="text-sm text-slate-400">
          Supported: JPG, PNG, MP4, MOV
        </p>
      </div>
      <AlertModal
        open={Boolean(alert)}
        title={alert?.title}
        message={alert?.message}
        tone={alert?.tone}
        onClose={() => setAlert(null)}
      />
    </div>
  );
}
