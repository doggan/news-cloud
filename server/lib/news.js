var FeedParser = require("feedparser"),
    request = require("request"),
    striptags = require("striptags");

var SOURCE_URLS = {
  "cnn": "http://rss.cnn.com/rss/cnn_topstories.rss?format=xml",
  "fox": "http://feeds.foxnews.com/foxnews/latest?format=xml",
};

function getNews(source, count, finished, failure) {
  if (!(source in SOURCE_URLS)) {
    return failure("Source not supported: " + source);
  }

  var source_url = SOURCE_URLS[source];
  var req = request(source_url);
  var fp = new FeedParser();

  req.on("error", function(err) {
    console.error("Request error: " + err);
    return failure(err);
  });

  fp.on("error", function(err) {
    console.error("FeedParser error: " + err);
    return failure(err);
  });

  req.on("response", function(res) {
    var stream = this;

    if (res.statusCode !== 200) {
      return failure("Bad status code: " + res.statusCode);
    }
    else {
      stream.pipe(fp);
    }
  });

  var results = [];

  fp.on("readable", function() {
    var stream = this, item;
    while (item = stream.read()) {
      if (results.length >= count) {
        break;
      }

      results.push({
        "title": striptags(item.title),
        "description": striptags(item.description),
      });
    }
  });

  fp.on("end", function() {
    finished(results);
  });
}

module.exports = function(router) {
  router.route("/news")
    .get(function(req, res) {
      var source = req.query.source;
      if (!source) {
        res.status(400).send("'source' not specified.");
        return;
      }
      source = source.toLowerCase();
      var count = req.query.count || 10;
      getNews(source, count,
        function(results) {
          res.json({
            data: results,
          });
        }, function(err) {
          res.status(500).send("Something bad happened: " + err);
      });
    });
};
