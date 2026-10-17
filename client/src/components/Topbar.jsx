import './Topbar.css';

const Topbar = ({ pageTitle, eyebrow, userEmail, onRefresh }) => {
  return (
    <div className="topbar">
      <div className="topbar-title">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{pageTitle}</h1>
      </div>

      <div className="topbar-actions">
        <button
          className="refresh-btn"
          onClick={onRefresh}
          title="Refresh page data"
        >
          Refresh
        </button>
        <div className="user-pill">
          <span className="user-status"></span>
          <span className="user-email">{userEmail}</span>
        </div>
      </div>
    </div>
  );
};

export default Topbar;