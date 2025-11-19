import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './productpage.css';

function Products() {
  const [feed, setFeed] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("user_id");
  const navigate = useNavigate();

  const fetchFeed = async () => {
    if (!token || !userId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/user/${userId}/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFeed(Array.isArray(data.feed) ? data.feed : []);
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscover = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/posts/discover?search=${encodeURIComponent(searchTerm)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setFeed(Array.isArray(data.posts) ? data.posts : []);
    } catch (err) {
      console.error("Failed to fetch discover results:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim()) {
      fetchDiscover();
    } else {
      fetchFeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`http://localhost:8000/post/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeed(prev =>
          prev.map(post =>
            post.post_id === postId
              ? { ...post, likes_count: (post.likes_count || 0) + 1 }
              : post
          )
        );
      }
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  const handleRequestTrade = async (post) => {
    const post_id = post.post_id;

    try {
      const res = await fetch(`http://localhost:8000/post/${post_id}/trade-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          buyer_id: userId,
          message: "Hi, I’m interested in this post!"
        })
      });

      const data = await res.json();
      if (res.ok && data.chat) {
        navigate("/messagespage", { state: { chat: data.chat } });
      } else {
        console.error("Trade request failed:", data.detail || data);
      }
    } catch (err) {
      console.error("Error sending trade request:", err);
    }
  };

  const visitOwnerProfile = (ownerId) => {
    navigate(`/profile/${ownerId}`);
  };

  const toggleDetails = (postId) => {
    setSelectedPostId(prev => (prev === postId ? null : postId));
  };

  return (
    <div className="products-page">
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="product-feed">
        {loading ? (
          <p className="loading">Loading products...</p>
        ) : feed.length === 0 ? (
          <p className="no-products">🚫 No products available.</p>
        ) : (
          feed.map((product) => {
            const owner = product.user || {};
            const username = owner.username || `User ${owner.user_id || "?"}`;
            const isSelected = selectedPostId === product.post_id;

            return (
              <div key={product.post_id} className="product-row">
                <div className="product-card">
                  <div className="product-header">
                    <span
                      className="owner-link"
                      onClick={() => visitOwnerProfile(owner.user_id)}
                    >
                      👤 {username}
                    </span>
                    <span
                      className="three-dots"
                      onClick={() => toggleDetails(product.post_id)}
                    >
                      ⋯
                    </span>
                  </div>

                  <div className="product-media">
                    {product.file_url?.endsWith(".mp4") ? (
                      <video src={`http://localhost:8000${product.file_url}`} controls />
                    ) : (
                      <img
                        src={`http://localhost:8000${product.file_url}` || "https://via.placeholder.com/500x300?text=No+Media"}
                        alt={product.caption || "Untitled"}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/500x300?text=No+Media";
                        }}
                      />
                    )}
                  </div>

                  <h3 className="product-title">{product.caption || "Untitled Post"}</h3>

                  <div className="product-actions">
                    <button onClick={() => handleLike(product.post_id)}>❤️ Like</button>
                    <button onClick={() => handleRequestTrade(product)}>🤝 Request Trade</button>
                  </div>

                  <div className="product-meta">
                    👍 Likes: {product.likes_count || 0}
                  </div>
                </div>

                {isSelected && (
                  <div className="product-details">
                    <h4>Post Details</h4>
                    <p><strong>Posted by:</strong> {username}</p>
                    <p><strong>Trust Score:</strong> {owner.trust_score || "N/A"}</p>
                    <p><strong>Tags:</strong> {Array.isArray(product.tags) ? product.tags.join(', ') : "None"}</p>
                    <p><strong>Status:</strong> {product.status || "Unknown"}</p>
                    <p><strong>Created:</strong> {new Date(product.created_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Products;