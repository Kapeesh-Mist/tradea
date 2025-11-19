import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./upload.css"; // Optional: style this page

function UploadPost() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [link, setLink] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setLink(""); // Clear link if file is selected
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    const form = new FormData();
    form.append("caption", caption);
    form.append("tags_raw", tags);
    if (file) {
      form.append("file", file);
    } else if (link) {
      form.append("link", link);
    }

    try {
      const res = await fetch("http://localhost:8000/post/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await res.json();
      console.log("Upload success:", data);
      navigate("/profile"); // Redirect to profile after upload
    } catch (error) {
      console.error("Upload error:", error.message);
    }
  };

  return (
    <div className="upload-page">
      <h2>Upload a Post</h2>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label>
          Select File:
          <input type="file" accept="image/*,video/mp4" onChange={handleFileChange} />
        </label>

        {previewUrl && (
          <div className="preview-container">
            <p>Preview:</p>
            <img src={previewUrl} alt="Preview" className="preview-image" />
          </div>
        )}

        <label>
          Or Paste Link:
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com/image.jpg"
            disabled={!!file}
          />
        </label>

        <label>
          Caption:
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
          />
        </label>

        <label>
          Tags (comma-separated):
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. design, freelance, logo"
          />
        </label>

        <button type="submit">Upload Post</button>
      </form>
    </div>
  );
}

export default UploadPost;