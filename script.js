// Replace this with your actual OMDb API key.
const API_KEY = "913d3c0c";
const API_URL = "https://www.omdbapi.com/";
const FALLBACK_POSTER =
  "https://placehold.co/400x600/191f2e/c4b5fd?text=No+Poster";

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const movieGrid = document.getElementById("movieGrid");
const sectionTitle = document.getElementById("sectionTitle");
const resultCount = document.getElementById("resultCount");
const sortSelect = document.getElementById("sortSelect");
const movieModal = document.getElementById("movieModal");
const modalBody = document.getElementById("modalBody");

let movies = [];
let requestNumber = 0;

// Request data from OMDb.
async function fetchMovieData(params) {
  const url = new URL(API_URL);

  url.search = new URLSearchParams({
    apikey: API_KEY,
    ...params
  }).toString();

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Network error. Please try again.");
  }

  const data = await response.json();

  if (data.Response === "False") {
    throw new Error(data.Error || "No movies found.");
  }

  return data;
}

// Search movies by title.
async function searchMovies(query) {
  query = query.trim();
  if (!query) return;

  if (API_KEY === "YOUR_OMDB_API_KEY") {
    showMessage(
      "🔑",
      "API key required",
      "Add your OMDb API key at the top of script.js."
    );
    return;
  }

  const currentRequest = ++requestNumber;

  searchBtn.disabled = true;
  searchBtn.textContent = "Loading...";
  sectionTitle.textContent = `Results for "${query}"`;
  resultCount.textContent = "Searching movies...";

  movieGrid.innerHTML = `
    <div class="message">
      <div class="loader"></div>
      <h3>Finding your movies...</h3>
      <p>Please wait while we search.</p>
    </div>
  `;

  try {
    const data = await fetchMovieData({
      s: query,
      type: "movie",
      page: "1"
    });

    if (currentRequest !== requestNumber) return;

    movies = data.Search || [];
    resultCount.textContent =
      `${data.totalResults || movies.length} results found`;

    renderMovies();
  } catch (error) {
    if (currentRequest !== requestNumber) return;

    movies = [];
    resultCount.textContent = "Try another search";
    showMessage("🎞️", "No movies found", error.message);
  } finally {
    if (currentRequest === requestNumber) {
      searchBtn.disabled = false;
      searchBtn.textContent = "Search ↗";
    }
  }
}

// Render movie cards.
function renderMovies() {
  let sortedMovies = [...movies];

  if (sortSelect.value === "year") {
    sortedMovies.sort((a, b) => getYear(b.Year) - getYear(a.Year));
  } else if (sortSelect.value === "oldest") {
    sortedMovies.sort((a, b) => getYear(a.Year) - getYear(b.Year));
  } else if (sortSelect.value === "title") {
    sortedMovies.sort((a, b) => a.Title.localeCompare(b.Title));
  }

  if (!sortedMovies.length) {
    showMessage("🍿", "No movies available", "Try another search.");
    return;
  }

  movieGrid.innerHTML = sortedMovies.map((movie, index) => `
    <article class="movie-card" style="animation-delay:${index * 35}ms">
      <div class="poster-wrap">
        <img
          class="poster"
          src="${safeImage(movie.Poster)}"
          alt="${escapeHTML(movie.Title)} poster"
          loading="lazy"
          onerror="this.onerror=null;this.src='${FALLBACK_POSTER}'"
        >
        <span class="type-badge">${escapeHTML(movie.Type || "movie")}</span>
      </div>

      <div class="movie-info">
        <h3 class="movie-title">${escapeHTML(movie.Title)}</h3>

        <div class="movie-meta">
          <span>${escapeHTML(movie.Year || "N/A")}</span>
          <span class="rating">★ IMDb</span>
        </div>

        <button class="details-btn"
          data-imdb="${escapeHTML(movie.imdbID)}">
          View Details ↗
        </button>
      </div>
    </article>
  `).join("");
}

// Fetch full movie information.
async function showMovieDetails(imdbID) {
  movieModal.classList.add("open");
  document.body.style.overflow = "hidden";

  modalBody.innerHTML = `
    <div class="message" style="grid-column:1/-1">
      <div class="loader"></div>
      <h3>Loading movie details...</h3>
    </div>
  `;

  try {
    const movie = await fetchMovieData({
      i: imdbID,
      plot: "full"
    });

    modalBody.innerHTML = "";

    const poster = document.createElement("img");
    poster.className = "modal-poster";
    poster.src = safeImage(movie.Poster);
    poster.alt = movie.Title + " poster";
    poster.onerror = () => {
      poster.onerror = null;
      poster.src = FALLBACK_POSTER;
    };

    const info = document.createElement("div");
    info.className = "modal-info";

    const badge = document.createElement("span");
    badge.className = "tag";
    badge.textContent = (movie.Type || "movie").toUpperCase();

    const title = document.createElement("h2");
    title.id = "modalTitle";
    title.textContent = movie.Title;

    const subtitle = document.createElement("p");
    subtitle.className = "modal-subtitle";
    subtitle.textContent = [
      movie.Year, movie.Rated, movie.Runtime
    ].filter(isAvailable).join(" • ");

    const rating = document.createElement("div");
    rating.className = "modal-rating";
    rating.textContent = "★ IMDb " +
      (isAvailable(movie.imdbRating)
        ? movie.imdbRating + "/10"
        : "Not rated");

    const plot = document.createElement("p");
    plot.className = "plot";
    plot.textContent = isAvailable(movie.Plot)
      ? movie.Plot
      : "No plot summary available.";

    info.append(badge, title, subtitle, rating, plot);

    const fields = [
      ["Genre", movie.Genre],
      ["Director", movie.Director],
      ["Cast", movie.Actors],
      ["Writer", movie.Writer],
      ["Language", movie.Language],
      ["Country", movie.Country],
      ["Awards", movie.Awards],
      ["Box Office", movie.BoxOffice]
    ];

    fields.forEach(([label, value]) => {
      if (!isAvailable(value)) return;

      const row = document.createElement("p");
      row.className = "detail-row";

      const strong = document.createElement("strong");
      strong.textContent = label + ": ";

      row.append(strong, document.createTextNode(value));
      info.appendChild(row);
    });

    if (movie.imdbID) {
      const link = document.createElement("a");
      link.className = "imdb-link";
      link.href =
        "https://www.imdb.com/title/" +
        encodeURIComponent(movie.imdbID) + "/";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View on IMDb ↗";
      info.appendChild(link);
    }

    modalBody.append(poster, info);
  } catch (error) {
    modalBody.innerHTML = "";

    const message = document.createElement("p");
    message.className = "plot";
    message.textContent = "Could not load details: " + error.message;
    modalBody.appendChild(message);
  }
}

// Helper functions.
function safeImage(poster) {
  return poster && poster !== "N/A" ? poster : FALLBACK_POSTER;
}

function isAvailable(value) {
  return Boolean(value && value !== "N/A");
}

function getYear(year) {
  const match = String(year || "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(emoji, heading, description) {
  movieGrid.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "message";

  const icon = document.createElement("div");
  icon.className = "empty-icon";
  icon.textContent = emoji;

  const title = document.createElement("h3");
  title.textContent = heading;

  const text = document.createElement("p");
  text.textContent = description;

  wrapper.append(icon, title, text);
  movieGrid.appendChild(wrapper);
}

// Event listeners.
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchMovies(searchInput.value);
});

document.querySelectorAll(".chip").forEach(button => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.query;
    searchMovies(button.dataset.query);
  });
});

sortSelect.addEventListener("change", renderMovies);

movieGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-imdb]");
  if (button) showMovieDetails(button.dataset.imdb);
});

function closeModal() {
  movieModal.classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("closeModal")
  .addEventListener("click", closeModal);

movieModal.addEventListener("click", event => {
  if (event.target === movieModal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});