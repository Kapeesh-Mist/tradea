import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [userData, setUserData] = useState({});
  const [posts, setPosts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [newPost, setNewPost] = useState({ caption: '', file: null });
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("user_id");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !userId) return;

    // Fetch profile info
    fetch(`http://localhost:8000/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setUserData(data));

    // Fetch posts
    fetch(`http://localhost:8000/user/${userId}/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setPosts(data.posts || []));

    // Fetch trade requests
    fetch(`http://localhost:8000/user/${userId}/trade-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setRequests(data.requests || []));
  }, [token, userId]);

  const handleOpenChat = (req) => {
    navigate(`/chat/${req.sender_id}?post=${req.post_id}`);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newPost.caption || !newPost.file) return;

    const formData = new FormData();
    formData.append("caption", newPost.caption);
    formData.append("tags_raw", ""); // Optional: add tags later
    formData.append("file", newPost.file);

    const res = await fetch("http://localhost:8000/post/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (res.ok) {
      setNewPost({ caption: '', file: null });
      // Refresh posts
      fetch(`http://localhost:8000/user/${userId}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => setPosts(data.posts || []));
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: 'auto' }}>
      {/* Profile Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
        <h1>{userData.username || 'Your Profile'}</h1>
        <p><strong>Trust Score:</strong> {userData.trust_score ?? '—'}</p>
        <p><strong>Overlap Score:</strong> {userData.overlap_score ?? '—'}</p>
        <p><strong>Total Likes:</strong> {userData.total_likes ?? '—'}</p>
      </div>

      {/* Upload New Post */}
      <div style={{ marginBottom: '2rem' }}>
        <h2>Upload New Post</h2>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Caption"
            value={newPost.caption}
            onChange={(e) => setNewPost(prev => ({ ...prev, caption: e.target.value }))}
            required
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewPost(prev => ({ ...prev, file: e.target.files[0] }))}
            required
          />
          <button type="submit">Upload</button>
        </form>
      </div>

      {/* Posts Grid */}
      <div style={{ marginBottom: '3rem' }}>
        <h2>Your Posts</h2>
        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            {posts.map(post => (
              <div key={post.post_id} style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: '#f9f9f9'
              }}>
                {post.file_url && (
                  <img
                    src={`http://localhost:8000/${post.file_url}`}
                    alt={post.caption}
                    style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5rem' }}
                  />
                )}
                <h4>{post.caption}</h4>
                <p><strong>Likes:</strong> {post.likes_count}</p>
                <button onClick={() => navigate(`/post/${post.post_id}`)}>View Post</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Requests */}
      <div>
        <h2>Message Requests</h2>
        {requests.length === 0 ? (
          <p>No incoming requests.</p>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {requests.map((req, index) => (
              <div key={index} style={{
                borderBottom: '1px solid #ddd',
                padding: '1rem 0'
              }}>
                <p><strong>From:</strong> User {req.sender_id}</p>
                <p><strong>Post:</strong> {req.post_title}</p>
                <p><strong>Message:</strong> {req.preview}</p>
                <button onClick={() => handleOpenChat(req)}>Open Chat</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;