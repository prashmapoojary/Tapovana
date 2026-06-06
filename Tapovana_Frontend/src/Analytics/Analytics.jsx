import React from 'react';
import './Analytics.css';

/**
 * Analytics Component – uses the same dashboard data as Home.jsx.
 * The /api/analytics/dashboard endpoint is not yet implemented on the backend,
 * so this page shows the analytics charts embedded from Home.jsx instead.
 */
const Analytics = () => {
  return (
    <div className="analytics-container">
      <h2 className="analytics-title">Tapovana Analytics Hub</h2>
      <p style={{ color: '#7b8a9a', fontSize: 14, marginTop: 8 }}>
        Detailed analytics are available on the <strong>Dashboard (Home)</strong> page.
        This page will be expanded with full reporting features in the next release.
      </p>
    </div>
  );
};

export default Analytics;
