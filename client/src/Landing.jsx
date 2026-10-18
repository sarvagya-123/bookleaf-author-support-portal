import "./landing.css";

const ROLES = [
  {
    id: "author",
    audience: "For authors",
    title: "Author workspace",
    hint: "Titles, earnings, and direct support.",
  },
  {
    id: "admin",
    audience: "For the BookLeaf team",
    title: "Operations desk",
    hint: "Triage the queue and keep every author moving.",
  },
];

function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
    </svg>
  );
}

export default function Landing({ onSelect, notice = "" }) {
  return (
    <main className="lp">
      <section className="lp-photo" aria-label="BookLeaf publishing">
        <div className="lp-media">
          <img
            className="lp-image"
            src="/media/bookleaf-reading.jpg"
            alt="A stack of books on a desk"
            width="1189"
            height="768"
            fetchPriority="high"
          />
        </div>
        <span className="lp-spine" aria-hidden="true" />
        <p className="lp-caption">Every book starts as someone’s idea.</p>
        <div className="lp-leaf" aria-hidden="true">
          <span className="lp-leaf-mark">BookLeaf</span>
        </div>
      </section>

      <section className="lp-content">
        <header className="lp-masthead">
          <span className="lp-brand">
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8" />
            </svg>
            BookLeaf
          </span>
          <span className="lp-masthead-label">Publishing support</span>
        </header>

        <div className="lp-copy">
          <p className="lp-copy-kicker">THE BOOKLEAF WORKSPACE</p>
          <h1 className="lp-title">
            <span className="lp-line">Your publishing,</span>
            <span className="lp-line lp-line-accent">in clear view.</span>
          </h1>
          <p className="lp-sub">
            Follow your titles, understand your royalties, and reach the people
            behind your books.
          </p>
        </div>

        {notice && (
          <p className="lp-notice" role="alert">
            {notice}
          </p>
        )}

        <div className="lp-roles-heading">
          <h2>Choose your workspace</h2>
          <span>Secure access</span>
        </div>
        <div className="lp-roles" role="group" aria-label="Choose a portal">
          {ROLES.map((role, index) => (
            <button
              key={role.id}
              type="button"
              className={`lp-role lp-role-${role.id}`}
              style={{ "--i": index }}
              onClick={() => onSelect(role.id)}
            >
              <span className="lp-role-copy">
                <small className="lp-role-audience">{role.audience}</small>
                <strong>{role.title}</strong>
                <small>{role.hint}</small>
              </span>
              <Arrow />
            </button>
          ))}
        </div>

        <footer className="lp-footer">
          BookLeaf author support and communication portal
        </footer>
      </section>
    </main>
  );
}
