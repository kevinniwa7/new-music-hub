
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(session({
    secret: "fullAdminSecret",
    resave: false,
    saveUninitialized: true
}));

const USERNAME = "Kingo Records";
const PASSWORD = "Kingo12";

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage: storage });

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === USERNAME && password === PASSWORD) {
        req.session.auth = true;
        res.redirect("/dashboard.html?login=success");
    } else {
        res.send("Wrong credentials");
    }
});

function checkAuth(req, res, next) {
    if (req.session.auth) return next();
    res.redirect("/login.html");
}

// Upload MP3
app.post("/upload", checkAuth, upload.single("music"), (req, res) => {
    if (!req.file) return res.send("No file selected!");
    const songsPath = "./data/songs.json";
    const songs = JSON.parse(fs.readFileSync(songsPath));
    songs.push({ title: req.body.title, file: "/uploads/" + req.file.filename });
    fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2));
    res.redirect("/dashboard.html?upload=success");
});

// Embed YouTube
app.post("/embed", checkAuth, (req, res) => {
    const { title, youtube } = req.body;
    let videoId = "";
    if (youtube.includes("watch?v=")) {
        videoId = youtube.split("watch?v=")[1].split("&")[0];
    } else if (youtube.includes("youtu.be/")) {
        videoId = youtube.split("youtu.be/")[1].split("?")[0];
    }
    if (!videoId) return res.send("Invalid YouTube link");

    const songsPath = "./data/songs.json";
    const songs = JSON.parse(fs.readFileSync(songsPath));
    songs.push({ title: title, youtube: videoId });
    fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2));
    res.redirect("/dashboard.html?embed=success");
});

// Delete song
app.post("/delete", checkAuth, (req, res) => {
    const { index } = req.body;
    const songsPath = "./data/songs.json";
    let songs = JSON.parse(fs.readFileSync(songsPath));
    const song = songs[index];
    if(song?.file) {
        const filePath = path.join(__dirname, song.file);
        if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    songs.splice(index, 1);
    fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2));
    res.redirect("/dashboard.html?delete=success");
});

// Get songs
app.get("/songs", (req, res) => {
    const songs = JSON.parse(fs.readFileSync("./data/songs.json"));
    res.json(songs);
});

// Contact messages
app.post("/contact", (req, res) => {
    const messagesPath = "./data/messages.json";
    const messages = JSON.parse(fs.readFileSync(messagesPath));
    messages.push(req.body);
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
    res.send("Message Sent Successfully!");
});

// Get messages (admin only)
app.get("/messages", checkAuth, (req, res) => {
    const messages = JSON.parse(fs.readFileSync("./data/messages.json"));
    res.json(messages);
});

app.listen(PORT, () => console.log("Running on http://localhost:" + PORT));
