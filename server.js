
const express = require("express");
const fs = require("fs");
const session = require("express-session");

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(session({
    secret: "adsSecret",
    resave: false,
    saveUninitialized: true
}));

app.get("/songs",(req,res)=>{
    const songs=JSON.parse(fs.readFileSync("./data/songs.json"));
    res.json(songs);
});

app.listen(PORT,()=>console.log("Running on http://localhost:"+PORT));
