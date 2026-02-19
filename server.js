
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(session({
  secret: process.env.SESSION_SECRET || "newMusicHubSecret",
  resave: false,
  saveUninitialized: false
}));

const USERNAME = "Kingo Records";
const PASSWORD = "Kingo12";

function checkAuth(req, res, next) {
  if (req.session && req.session.auth === true) return next();
  return res.redirect("/login.html");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    req.session.auth = true;
    return res.redirect("/dashboard.html?login=success");
  }
  return res.redirect("/login.html?error=1");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.post("/upload", checkAuth, upload.single("music"), (req, res) => {
  if (!req.file) return res.redirect("/dashboard.html?upload=nofile");

  const songsPath = path.join(__dirname, "data/songs.json");
  const songs = JSON.parse(fs.readFileSync(songsPath, "utf8"));

  songs.push({
    title: req.body.title || req.file.originalname,
    file: "/uploads/" + req.file.filename
  });

  fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2));
  return res.redirect("/dashboard.html?upload=success");
});

app.post("/embed", checkAuth, (req, res) => {
  const { title, youtube } = req.body;
  let videoId = "";

  if (youtube && youtube.includes("watch?v=")) {
    videoId = youtube.split("watch?v=")[1].split("&")[0];
  } else if (youtube && youtube.includes("youtu.be/")) {
    videoId = youtube.split("youtu.be/")[1].split("?")[0];
  } else if (youtube && youtube.includes("youtube.com/embed/")) {
    videoId = youtube.split("youtube.com/embed/")[1].split("?")[0];
  }

  if (!videoId) return res.redirect("/dashboard.html?embed=badlink");

  const songsPath = path.join(__dirname, "data/songs.json");
  const songs = JSON.parse(fs.readFileSync(songsPath, "utf8"));

  songs.push({ title: title || "YouTube Track", youtube: videoId });

  fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2));
  return res.redirect("/dashboard.html?embed=success");
});

app.post("/delete", checkAuth, (req, res) => {
  const index = parseInt(req.body.index, 10);
  const songsPath = path.join(__dirname, "data/songs.json");
  let songs = JSON.parse(fs.readFileSync(songsPath, "utf8"));

  if (Number.isNaN(index) || index < 0 || index >= songs.length) {
    return res.redirect("/dashboard.html?delete=badindex");
  }

  const song = songs[index];
  if (song && song.file) {
    const localPath = path.join(__dirname, song.file);
    if (fs.existsSync(localPath)) {
      try { fs.unlinkSync(localPath); } catch(e) {}
    }
  }

  songs.splice(index, 1);
  fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2));
  return res.redirect("/dashboard.html?delete=success");
});

app.get("/songs", (req, res) => {
  const songs = JSON.parse(fs.readFileSync(path.join(__dirname, "data/songs.json"), "utf8"));
  res.json(songs);
});

app.post("/contact", (req, res) => {
  const messagesPath = path.join(__dirname, "data/messages.json");
  const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));

  messages.push({
    name: req.body.name || "",
    email: req.body.email || "",
    message: req.body.message || "",
    time: new Date().toISOString()
  });

  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
  res.redirect("/contact.html?sent=1");
});

app.get("/messages", checkAuth, (req, res) => {
  const messages = JSON.parse(fs.readFileSync(path.join(__dirname, "data/messages.json"), "utf8"));
  res.json(messages);
});

app.listen(PORT, () => console.log("Running on port " + PORT));
