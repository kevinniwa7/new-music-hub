
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const SONGS_PATH = path.join(DATA_DIR, "songs.json");
const MESSAGES_PATH = path.join(DATA_DIR, "messages.json");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SONGS_PATH)) fs.writeFileSync(SONGS_PATH, "[]");
if (!fs.existsSync(MESSAGES_PATH)) fs.writeFileSync(MESSAGES_PATH, "[]");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || "newMusicHubSecret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: "auto" }
}));

const USERNAME = "Kingo Records";
const PASSWORD = "Kingo12";

function checkAuth(req, res, next) {
  if (req.session && req.session.auth === true) return next();
  return res.redirect("/login.html");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; } }
function writeJsonSafe(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2)); }

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    req.session.auth = true;
    return res.redirect("/dashboard.html?login=success");
  }
  return res.redirect("/login.html?error=1");
});

app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

app.post("/upload", checkAuth, (req, res) => {
  upload.single("music")(req, res, (err) => {
    if (err) {
      console.error("UPLOAD ERROR:", err);
      return res.redirect("/dashboard.html?upload=error");
    }
    if (!req.file) return res.redirect("/dashboard.html?upload=nofile");
    const songs = readJsonSafe(SONGS_PATH);
    songs.push({ title: req.body.title || req.file.originalname, file: "/uploads/" + req.file.filename });
    try { writeJsonSafe(SONGS_PATH, songs); } catch (e) { console.error("WRITE ERROR:", e); return res.redirect("/dashboard.html?upload=error"); }
    return res.redirect("/dashboard.html?upload=success");
  });
});

app.post("/embed", checkAuth, (req, res) => {
  try {
    const { title, youtube } = req.body;
    let videoId = "";
    if (youtube && youtube.includes("watch?v=")) videoId = youtube.split("watch?v=")[1].split("&")[0];
    else if (youtube && youtube.includes("youtu.be/")) videoId = youtube.split("youtu.be/")[1].split("?")[0];
    else if (youtube && youtube.includes("youtube.com/embed/")) videoId = youtube.split("youtube.com/embed/")[1].split("?")[0];
    if (!videoId) return res.redirect("/dashboard.html?embed=badlink");
    const songs = readJsonSafe(SONGS_PATH);
    songs.push({ title: title || "YouTube Track", youtube: videoId });
    writeJsonSafe(SONGS_PATH, songs);
    return res.redirect("/dashboard.html?embed=success");
  } catch (e) {
    console.error("EMBED ERROR:", e);
    return res.redirect("/dashboard.html?embed=error");
  }
});

app.post("/delete", checkAuth, (req, res) => {
  try {
    const index = parseInt(req.body.index, 10);
    let songs = readJsonSafe(SONGS_PATH);
    if (Number.isNaN(index) || index < 0 || index >= songs.length) return res.redirect("/dashboard.html?delete=badindex");
    const song = songs[index];
    if (song && song.file) {
      const rel = song.file.startsWith("/") ? song.file.slice(1) : song.file;
      const localPath = path.join(__dirname, rel);
      if (fs.existsSync(localPath)) { try { fs.unlinkSync(localPath); } catch(e) {} }
    }
    songs.splice(index, 1);
    writeJsonSafe(SONGS_PATH, songs);
    return res.redirect("/dashboard.html?delete=success");
  } catch (e) {
    console.error("DELETE ERROR:", e);
    return res.redirect("/dashboard.html?delete=error");
  }
});


// Blog posts (public)
app.get("/posts", (req, res) => {
  try {
    const posts = JSON.parse(fs.readFileSync(path.join(__dirname, "data/posts.json"), "utf8"));
    res.json(posts);
  } catch (e) {
    res.json([]);
  }
});

app.get("/songs", (req, res) => res.json(readJsonSafe(SONGS_PATH)));

app.post("/contact", (req, res) => {
  try {
    const messages = readJsonSafe(MESSAGES_PATH);
    messages.push({ name: req.body.name || "", email: req.body.email || "", message: req.body.message || "", time: new Date().toISOString() });
    writeJsonSafe(MESSAGES_PATH, messages);
    res.redirect("/contact.html?sent=1");
  } catch (e) {
    console.error("CONTACT ERROR:", e);
    res.redirect("/contact.html?sent=0");
  }
});

app.get("/messages", checkAuth, (req, res) => res.json(readJsonSafe(MESSAGES_PATH)));

app.get("/health", (req, res) => res.send("ok"));

app.listen(PORT, () => console.log("Running on port " + PORT));
