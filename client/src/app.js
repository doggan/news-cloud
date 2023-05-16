require("./css/style.scss");

var $ = require("jquery"),
    d3 = require("d3"),
    cloud = require("d3-cloud"),
    sentiment = require("sentiment"),
    Spinner = require("spin.js");

const IGNORE_WORDS_SET = new Set(require("./stop-words"));

const MIN_WORD_DISPLAY_SIZE = 10;
const MAX_WORD_DISPLAY_SIZE = 40;

/**
 * If true, the app will run in 'offline' mode and not attempt to query the server API endpoint.
 * The original version of this app had a server running on Heroku to fulfill API requests.
 * This is wasteful and was a maintenance headache, so there is no server anymore.
 * Maybe a better solution is a Github action to periodically run the backend app to write the latest
 * JSON results to a bucket somewhere, and then the client would query that directly.
 * For now, I'm just embedding the latest results as JSON in the client app.
 * When offline is true, the app will read directly from the local JSON files.
 */
const IS_OFFLINE_MODE = true;

/**
 * String formatting util.
 * Ref: http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
 */
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != "undefined"
        ? args[number]
        : match
      ;
    });
  };
}

// Construct the URL (this is substituted via webpack config).
const URL = NEWS_API_HOST + "/api/news";

console.log("News API URL: " + URL);

function getNewsUri(source) {
  var count = source in QUERY_COUNT ? QUERY_COUNT[source] : 10;
  return "{0}?source={1}&count={2}"
    .format(URL, source, count);
}

/**
 * Takes an input text string, and returns a filtered array of strings.
 */
function processText(text) {
  if (text === null) {
    return null;
  }

  // Strip punctuation.
  text = text
    .replace(/[.,\/!?$%\^&\*;:{}=_`~()]/g, "")
    .replace(/(\r\n|\n|\r)/gm, "")
    .replace(/'s/g, "")
    .replace(/['"]/g, "") // Make sure to remove ' after 's.
    .replace(/\B\-/g, "") // Standalone dashes appearing in some text.
    .split(" ");
  // Filter and cleanup.
  text = $.map(text, function(val) {
    val = val.trim();
    if (val === "" ||
        // Filter ignore words...
        IGNORE_WORDS_SET.has(val.toLowerCase()) ||
        // Filter standalone numbers...
        !isNaN(val)) {
      return null;
    }
    return val;
  });
  return text;
}

/**
 * Find word counts for an array of strings.
 */
function getCounts(words) {
  return words.reduce(function(stats, word) {
    word = word.toLowerCase();
    stats[word] = stats.hasOwnProperty(word) ?
      stats[word] + 1 : 1;
    return stats;
  }, {});
}

function getWordColor(word) {
  var score = sentiment(word).score;
  if (score == 0) {
    return d3.color("rgba(0,0,0,0.25)");
  }
  var t = score / 5;
  if (score < 0) {
    return d3.interpolateRgb("rgba(230,0,0,.25)", "rgba(230,0,0,1)")(-t);
  } else if (score > 0) {
    return d3.interpolateRgb("rgba(0,190,0,.25)", "rgba(0,190,0,1)")(t);
  }
}

/**
 * Build a word info array, figuring out sizes to display each word
 * based on frequency.
 */
function buildWordInfos(words) {
  var counts = getCounts(words);

  // Filter duplicates.
  // Only keep 1 case of the word (i.e. Cool or cool, but not both).
  var lowerCaseWords = $.map(words, function(val) {
    return val.toLowerCase();
  });
  words = words.filter(function(word, pos, self) {
    return lowerCaseWords.indexOf(word.toLowerCase()) == pos;
  });

  // TODO: if # of unique words is greater than some threshold,
  // devare low-frequency words to ensure import words don't get clipped.

  // Find the highest frequency word, used for normalization.
  var maxCount = 0;
  $.each(counts, function(key, val) {
    maxCount = Math.max(maxCount, val);
  });

  var wordInfos = [];

  var sizeRange = MAX_WORD_DISPLAY_SIZE - MIN_WORD_DISPLAY_SIZE;
  $.each(words, function(i, word) {
    wordInfos.push({
      text: word,
      size: MIN_WORD_DISPLAY_SIZE + (counts[word.toLowerCase()] / maxCount) * sizeRange,
      color: getWordColor(word),
    });
  });

  return wordInfos;
}

/**
 * Display a spinner while loading.
 */
function showSpinner(containerId) {
  var opts = {
    position: "relative",
    className: "spinner",
  };
  var target = document.getElementById("vis-" + containerId);
  new Spinner(opts).spin(target);
}

function buildLayout(wordInfos, containerId) {
  var fill = d3.scaleOrdinal(d3.schemeCategory20);

  var layout = cloud()
    .canvas(function() { return document.createElement("canvas"); })
    .size([300, 275])
    .words(wordInfos)
    .padding(1)
    .font("Impact")
    .fontSize(function(d) { return d.size; })
    .spiral("rectangular")
    .on("end", draw);

  layout.start();

  function draw(words) {
    var id = "#vis-" + containerId;
    d3.select(id)
      .append("svg")
        .attr("width", layout.size()[0])
        .attr("height", layout.size()[1])
      .append("g")
        .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
      .selectAll("text")
        .data(words)
      .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "Impact")
        .style("fill", function(d, i) { return d.color; })
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
    
    // Hide the spinner once the layout is displayed.
    $(id + " > .spinner").hide();
  }
}

function parseResults(response) {
  var results = [];
  $.each(response.data, function() {
    results.push.apply(results, processText(this.title));
    results.push.apply(results, processText(this.description));
  });
  return results;
}

function buildCloud(newsSource, containerId) {
  showSpinner(containerId);

  if (IS_OFFLINE_MODE) {
    // When running in offline mode, read JSON directly.
    var response = require("./data/" + newsSource + ".json");
    var results = parseResults(response);    
    var wordInfos = buildWordInfos(results);
    buildLayout(wordInfos, containerId);
  } else {
    $.get(getNewsUri(newsSource), function(response) {
      var results = parseResults(response);
      var wordInfos = buildWordInfos(results);
      buildLayout(wordInfos, containerId);
    });
  }
}

// var eg = "Inside 'fear mong' confusion Trump executive order travel ban President Donald Trump declared Pentagon Friday enacting strict measures prevent domestic terror attacks government knew meant Protesters decry Trump immigration policies Protesters gathered cities airports United States Saturday complain President Donald Trump immigration policies protests scheduled Sunday Tech leaders condemn Trump immigrant ban ink barely dry President Trump order ban immigration majority Muslim countries tech companies speaking Judge halts implementation Trump immigration order federal judge granted emergency stay Saturday night citizens Muslim majority countries arrived transit hold valid visas ruling removed decision halts President Donald Trump executive order barring citizens countries entering 90 days Read judge order Trump Travel ban working nicely CNN Video President Donald Trump executive order banning immigrants Muslim majority countries working nicely Syrian Christians turned back airport family Syrian Christian immigrants arrive Philadelphia join relatives long wait President Trump executive order turned Trump immigration ban sends shockwaves President Donald Trump seismic move ban 130 million people United States deny entry refugees reverberated worldwide Saturday chaos confusion rippled airports American law enforcement agencies foreign countries grasp Washington policy Trump fast furious week strategy President Trump overwhelming Washington series provocative executive orders aim fulfill campaign promises mask narrow election win writes Julian Zelizer Sen Chris Murphy scathing tweet President Trump CNN Video Democrat Sen Chris Murphy tweeted image dead Syrian child President Donald Trump issued executive order banning Syrian refugees indefinitely";
// var wordInfos = buildWordInfos(processText(eg));
// buildLayout(wordInfos, "1");
// buildLayout(wordInfos, "2");
// buildLayout(wordInfos, "3");

/**
 * Allow overriding the query count for certain news sources.
 * Some sources provide more words per entry.
 */
const QUERY_COUNT = {
  cnn: 20,
  fox: 60,
  cnbc: 40,
};

buildCloud("cnn", "1");
buildCloud("fox", "2");
buildCloud("cnbc", "3");
