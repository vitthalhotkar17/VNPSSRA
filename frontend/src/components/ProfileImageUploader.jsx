import { useEffect, useRef, useState } from "react";
import { FiCamera, FiCheckCircle, FiUploadCloud, FiXCircle } from "react-icons/fi";
import toast from "react-hot-toast";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export default function ProfileImageUploader({ image, onSave }) {
  const [preview, setPreview] = useState(image || "");
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(image || "");
    setSelectedFile(null);
    setError("");
  }, [image]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (file) => {
    if (!file) {
      setError("No file selected.");
      toast.error("Please select an image file.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, JPEG, PNG, and WEBP formats are supported.");
      toast.error("Unsupported file type. Please choose an image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File size must be 5 MB or less.");
      toast.error("The selected file is too large.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result || "");
      setSelectedFile(file);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleSave = () => {
    if (!selectedFile) {
      setError("No new image selected.");
      toast.error("Please choose an image before saving.");
      return;
    }
    onSave(selectedFile);
    setSelectedFile(null);
  };

  const handleCancel = () => {
    setPreview(image || "");
    setSelectedFile(null);
    setError("");
  };

  return (
    <div className="space-y-4">
      <div
        className="group relative mx-auto h-40 w-40 rounded-full overflow-hidden border border-slate-700 bg-slate-950 shadow-soft transition duration-200"
        onClick={openFilePicker}
      >
        {preview ? (
          <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-900 text-slate-400">
            <FiCamera size={36} />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/0 text-xs font-semibold text-slate-700 opacity-0 transition duration-200 group-hover:bg-slate-900/10 group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-md">
            <FiUploadCloud size={14} /> Upload
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleInputChange}
      />
      <p className="text-xs text-slate-500">Only JPG, JPEG, PNG, and WEBP are allowed. Max file size 5 MB.</p>

      {selectedFile && (
        <>
          <div className="text-center text-xs text-slate-500">
            Selected: {selectedFile.name} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:shadow-indigo-500/35 sm:w-auto"
            >
              <FiCheckCircle size={18} /> Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 sm:w-auto"
            >
              <FiXCircle size={18} /> Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
