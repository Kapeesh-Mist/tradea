import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ username: "", bio: "", avatar: null });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    async function fetchData() {
      try {
        const profileRes = await fetch("http://localhost:8000/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!profileRes.ok) throw new Error(await profileRes.text());
        const profileData = await profileRes.json();
        setProfile(profileData);
        setFormData({
          username: profileData.username || "",
          bio: profileData.bio || "",
          avatar: null
        });

        const postsRes = await fetch(`http://localhost:8000/user/${profileData.user_id}/posts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!postsRes.ok) throw new Error(await postsRes.text());
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      } catch (error) {
        console.error("Error fetching profile or posts:", error.message);
      }
    }

    fetchData();
  }, []);

  const handleEditToggle = () => setEditing(prev => !prev);
  const handleUploadClick = () => navigate("/upload");

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      setPreviewUrl(URL.createObjectURL(files[0]));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !profile?.user_id) return;

    const form = new FormData();
    form.append("username", formData.username);
    form.append("bio", formData.bio);
    if (formData.avatar) form.append("avatar", formData.avatar);

    try {
      const res = await fetch(`http://localhost:8000/user/${profile.user_id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!res.ok) throw new Error(await res.text());

      const refreshed = await fetch("http://localhost:8000/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!refreshed.ok) throw new Error(await refreshed.text());
      const updatedProfile = await refreshed.json();
      setProfile(updatedProfile);
      setEditing(false);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error updating profile:", error.message);
    }
  };

  const handleLike = (postId) => {
    setPosts(prev =>
      prev.map(post =>
        post.post_id === postId
          ? { ...post, likes_count: (post.likes_count || 0) + 1 }
          : post
      )
    );
  };

  const handleShare = (postId) => {
    const url = `http://localhost:3000/post/${postId}`;
    navigator.clipboard.writeText(url);
    alert("Post link copied to clipboard!");
  };

  const renderTags = (tags) => {
    if (Array.isArray(tags)) return tags.join(", ");
    if (typeof tags === "string") {
      try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed.join(", ") : "None";
      } catch {
        return "None";
      }
    }
    return "None";
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <img
          src={
            editing && previewUrl
              ? previewUrl
              : profile?.avatar_url
              ? `http://localhost:8000${profile.avatar_url}`
              : "https://placehold.co/120x120"
          }
          alt="Profile"
          className="profile-avatar"
          onError={(e) => {
            e.target.src = "https://placehold.co/120x120";
          }}
        />
        <div className="profile-info">
          <h2>{profile?.username || "Username"}</h2>
          <p>{profile?.bio || "No bio yet"}</p>
          <div className="profile-meta">
            <span>Trade Score: {profile?.score ?? "..."}</span>
            <span>Posts: {posts.length}</span>
          </div>
          <div className="profile-actions">
            <button onClick={handleEditToggle}>Edit Profile</button>
            <button onClick={handleUploadClick}>Upload Post</button>
          </div>
        </div>
      </div>

      {editing && (
        <form className="edit-form" onSubmit={handleFormSubmit}>
          <label>
            Upload Photo:
            <input type="file" name="avatar" accept="image/*" onChange={handleFormChange} />
          </label>
          <label>
            Username:
            <input type="text" name="username" value={formData.username} onChange={handleFormChange} />
          </label>
          <label>
            Bio:
            <textarea name="bio" value={formData.bio} onChange={handleFormChange} />
          </label>
          <button type="submit">Save Changes</button>
        </form>
      )}

      <div className="post-grid">
        {posts.length > 0 ? (
          posts.map(post => (
            <img
              key={post.post_id}
              src={`http://localhost:8000${post.thumbnail_url || post.file_url}`}
              alt={post.caption}
              className="post-thumbnail"
              onClick={() => {
                setSelectedPost(post);
                setShowModal(true);
              }}
              onError={(e) => {
                e.target.src = "https://placehold.co/300x300";
              }}
            />
          ))
        ) : (
          <p className="no-posts">No posts yet</p>
        )}
      </div>

      {showModal && selectedPost && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={`http://localhost:8000${selectedPost.file_url}`}
              alt={selectedPost.caption}
              className="modal-image"
              onError={(e) => {
                e.target.src = "https://placehold.co/500x500";
              }}
            />
            <div className="modal-details">
              <h3>{selectedPost.caption}</h3>
              <p><strong>Tags:</strong> {renderTags(selectedPost.tags)}</p>
              <p><strong>Status:</strong> {selectedPost.status}</p>
              <p><strong>Posted:</strong> {new Date(selectedPost.created_at).toLocaleString()}</p>
              <div className="modal-actions">
                <button onClick={() => handleLike(selectedPost.post_id)}>❤️ Like</button>
                <span>{selectedPost.likes_count || 0} likes</span>
                <button onClick={() => handleShare(selectedPost.post_id)}>🔗 Share</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;