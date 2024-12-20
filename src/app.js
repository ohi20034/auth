const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

const api = require("./routes/index");


app.use(
    cors({
        origin: process.env.CORS_ORIGIN, // need to learn
        credentials: true // need to learn
    })
);

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"));
app.use(cookieParser());

app.use((err,req,res,next)=>{
    // console.log(err);
    res.status(err.status || 500).json({ error: err.message });
});

app.use("/api/v1", api);

module.exports = { app };
