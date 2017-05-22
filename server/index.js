var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    cors = require("cors");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cors());

var port = process.env.PORT || 5000;

var router = express.Router();

router.get("/", function(req, res) {
  res.json({ message: "ok" });
});

require("./lib/news")(router);

app.use("/api", router);

app.listen(port);
console.log("Listening on port: " + port);
