import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Dashboard.css";
import { useNavigate } from 'react-router-dom';
import { BarChart3, MessageSquare, CheckCircle2, Clock } from 'lucide-react';

// Create custom marker icons
const createMarkerIcon = (color) => {
  return L.divIcon({
    className: `custom-marker ${color}`,
    html: `<div class="marker-pin" style="background-color: ${color}"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

const markerIcons = {
  pending: createMarkerIcon("#ffa500"),
  "in-progress": createMarkerIcon("#2196f3"),
  resolved: createMarkerIcon("#4caf50"),
};

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [mapCenter] = useState([19.0216852, 72.8701941]);
  const [mapZoom] = useState(18);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3000/auth/posts`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received data:", data);

      const postsArray = Array.isArray(data) ? data : 
                        (data.posts ? data.posts : []);

      setPosts(postsArray);
      
      // Calculate stats without changing map center
      if (postsArray.length > 0) {
        const stats = postsArray.reduce(
          (acc, post) => {
            acc.total++;
            if (post.status === 'in-progress') {
              acc.inProgress++;
            } else {
              acc[post.status]++;
            }
            return acc;
          },
          { total: 0, pending: 0, inProgress: 0, resolved: 0 }
        );
        setStats(stats);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to fetch posts. Please try again later.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (postId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:3000/auth/posts/${postId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", 
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchPosts(); // Refresh posts after successful update
    } catch (error) {
      console.error("Error updating post status:", error);
      alert("Failed to update status. Please try again.");
    }
  };


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleStatCardClick = (status) => {
    // For 'all' status, pass all posts
    if (status === 'all') {
      navigate('/admin/reports', { 
        state: { 
          status: 'all', 
          posts: posts,
          title: 'All Reports'
        } 
      });
    } else {
      // For specific status, filter posts
      const filteredPosts = posts.filter(post => post.status === status);
      navigate('/admin/reports', { 
        state: { 
          status, 
          posts: filteredPosts,
          title: `${status.charAt(0).toUpperCase() + status.slice(1)} Reports`
        } 
      });
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0" style={{fontWeight: '600' }}>Admin Dashboard</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ backgroundColor: '#475569' }} onClick={() => handleStatCardClick('all')}>
          <div className="d-flex justify-content-between align-items-center">
            <h3>Total Reports</h3>
            <BarChart3 size={24} />
          </div>
          <p className="stat-number">{stats.total}</p>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#F97316' }} onClick={() => handleStatCardClick('pending')}>
          <div className="d-flex justify-content-between align-items-center">
            <h3>Pending</h3>
            <MessageSquare size={24} />
          </div>
          <p className="stat-number">{stats.pending}</p>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#3B82F6' }} onClick={() => handleStatCardClick('in-progress')}>
          <div className="d-flex justify-content-between align-items-center">
            <h3>In Progress</h3>
            <Clock size={24} />
          </div>
          <p className="stat-number">{stats.inProgress}</p>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#22C55E' }} onClick={() => handleStatCardClick('resolved')}>
          <div className="d-flex justify-content-between align-items-center">
            <h3>Resolved</h3>
            <CheckCircle2 size={24} />
          </div>
          <p className="stat-number">{stats.resolved}</p>
        </div>
      </div>

      <div className="map-container mt-4">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "70vh", width: "100%", borderRadius: "12px" }}
          options={{
            minZoom: 14,
            maxZoom: 30,
            maxBounds: [
              [19.0216852 - 0.001, 72.8701941 - 0.001],
              [19.0216852 + 0.001, 72.8701941 + 0.001]
            ],
            maxBoundsViscosity: 1.0,
            dragging: true,
            scrollWheelZoom: true,
            bounceAtZoomLimits: true
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <Circle
            center={[19.0216852, 72.8701941]}
            radius={100}
            pathOptions={{
              color: '#012970',
              fillColor: '#012970',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5',
            }}
          >
            <Popup>
              <div className="popup-content">
                <h3>Geofence Boundary</h3>
                <p>100m radius around college</p>
              </div>
            </Popup>
          </Circle>

          <Marker
            position={[19.0216852, 72.8701941]}
            icon={L.divIcon({
              className: 'college-marker',
              html: `<div style="background-color: #012970; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>`,
              iconSize: [15, 15],
              iconAnchor: [7, 7]
            })}
          >
            <Popup>
              <div className="popup-content">
                <h3>Your College Name</h3>
                <p>Your College Address</p>
              </div>
            </Popup>
          </Marker>
          {Array.isArray(posts) && posts.map((post) => (
            <Marker
              key={post._id}
              position={[post.location.latitude, post.location.longitude]}
              icon={markerIcons[post.status]}
            >
              <Popup>
                <div className="popup-content">
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                  <p>
                    <strong>Status:</strong> {post.status}
                  </p>
                  <p><strong>Category:</strong> {post.category || "Uncategorized"}</p>
                  <p>
                    <strong>Created:</strong> {formatDate(post.createdAt)}
                  </p>
                  <p>
                    <strong>Location:</strong>{" "}
                    {post.location.address || "No address available"}
                  </p>
                  {post.image && (
                    <img
                      src={post.image}
                      alt="Report"
                      style={{ maxWidth: "200px", marginTop: "10px" }}
                    />
                  )}
                  <select
                    value={post.status}
                    onChange={(e) => handleStatusChange(post._id, e.target.value)}
                    className={`status-select ${post.status}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  
                  {/* {post.status === 'resolved' && (
                    <button 
                      onClick={() => handleDelete(post._id)}
                      className="delete-button"
                    >
                      
                      Delete Report
                    </button>
                  )} */}
                </div>
                
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Dashboard;