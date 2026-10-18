const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "book",
  "can",
  "for",
  "from",
  "have",
  "help",
  "how",
  "issue",
  "just",
  "my",
  "not",
  "please",
  "query",
  "request",
  "that",
  "the",
  "this",
  "with",
  "would",
  "you",
  "your",
]);

function getKeywords(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}

function getOverlap(left, right) {
  const shared = [...left].filter((word) => right.has(word));
  const unionSize = new Set([...left, ...right]).size;

  return {
    shared,
    ratio: unionSize ? shared.length / unionSize : 0,
  };
}

export function findSimilarTickets(selectedTicket, tickets, limit = 3) {
  if (!selectedTicket || !Array.isArray(tickets)) return [];

  const selectedId = String(selectedTicket.id ?? selectedTicket.ticket_id ?? "");
  const subjectKeywords = getKeywords(selectedTicket.subject);
  const descriptionKeywords = getKeywords(selectedTicket.description);
  const selectedCategory = String(selectedTicket.category || "").toLowerCase();

  return tickets
    .filter((ticket) => {
      const ticketId = String(ticket.id ?? ticket.ticket_id ?? "");
      return ticketId && ticketId !== selectedId;
    })
    .map((ticket) => {
      const subjectOverlap = getOverlap(
        subjectKeywords,
        getKeywords(ticket.subject)
      );
      const descriptionOverlap = getOverlap(
        descriptionKeywords,
        getKeywords(ticket.description)
      );
      const sameCategory =
        selectedCategory &&
        selectedCategory === String(ticket.category || "").toLowerCase();
      const sharedTerms = [
        ...new Set([...subjectOverlap.shared, ...descriptionOverlap.shared]),
      ].slice(0, 4);
      const score =
        subjectOverlap.ratio * 0.55 +
        descriptionOverlap.ratio * 0.3 +
        (sameCategory ? 0.15 : 0);

      return {
        ticket,
        score,
        sharedTerms,
        sameCategory: Boolean(sameCategory),
      };
    })
    .filter(({ score, sharedTerms }) => score >= 0.2 && sharedTerms.length > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(0, limit));
}
