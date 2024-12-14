const express = require("express");
const bodyParser = require("body-parser");
const app = express();

const api = require("./routes/index");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.get('/', (req, res) => {
//   res.send('hi');
// });

app.use("/api/v1", api);
// app.use('/api',...);

module.exports = app;
