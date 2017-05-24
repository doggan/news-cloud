require("./css/style.scss");

let $ = require("jquery"),
    d3 = require("d3"),
    cloud = require("d3-cloud"),
    sentiment = require("sentiment");

const IGNORE_WORDS = require("./stop-words");

const MIN_WORD_DISPLAY_SIZE = 10;
const MAX_WORD_DISPLAY_SIZE = 40;

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

function getNewsUri(source) {
  const COUNT = 10;
  return "http://localhost:5000/api/news?source={0}&count={1}"
    .format(source, COUNT);
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
    .replace(/['"]/g, "")  // Make sure to remove ' after 's.
    .split(" ");
  // Filter and cleanup.
  text = $.map(text, function(val) {
    val = val.trim();
    if (val === "" || $.inArray(val.toLowerCase(), IGNORE_WORDS) !== -1) {
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

/**
 * A linear interpolator for hexadecimal colors
 */
function lerpColor(a, b, t) { 
  var ah = parseInt(a.replace(/#/g, ""), 16),
    ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
    bh = parseInt(b.replace(/#/g, ""), 16),
    br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
    rr = ar + t * (br - ar),
    rg = ag + t * (bg - ag),
    rb = ab + t * (bb - ab);
  return "#" + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}

function getWordColor(word) {
  let score = sentiment(word).score;
  if (score == 0) {
    return "#000000";
  } else if (score < 0) {
    return lerpColor("#000000", "#ff0000", -score / 5);
  } else if (score > 0) {
    return lerpColor("#000000", "#00ff00", score / 5);
  }
}

/**
 * Build a word info array, figuring out sizes to display each word
 * based on frequency.
 */
function buildWordInfos(words) {
  let counts = getCounts(words);

  // Filter duplicates.
  words = words.filter(function(word, pos, self) {
    return self.indexOf(word) == pos;
  });

  // TODO: if # of unique words is greater than some threshold,
  // delete low-frequency words to ensure import words don't get clipped.

  // Find the highest frequency word, used for normalization.
  let maxCount = 0;
  $.each(counts, function(key, val) {
    maxCount = Math.max(maxCount, val);
  });

  let wordInfos = [];

  let sizeRange = MAX_WORD_DISPLAY_SIZE - MIN_WORD_DISPLAY_SIZE;
  $.each(words, function(i, word) {
    wordInfos.push({
      text: word,
      size: MIN_WORD_DISPLAY_SIZE + (counts[word.toLowerCase()] / maxCount) * sizeRange,
      color: getWordColor(word),
    });
  });

  return wordInfos;
}

function buildLayout(wordInfos, containerId) {
  let fill = d3.scaleOrdinal(d3.schemeCategory20);

  let layout = cloud()
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
    d3.select("#vis-" + containerId)
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
  }
}

function buildCloud(newsSource, containerId) {
  $.get(getNewsUri(newsSource), function(response) {
    let results = [];
    $.each(response.data, function() {
      results.push.apply(results, processText(this.title));
      results.push.apply(results, processText(this.description));
    });

    let wordInfos = buildWordInfos(results);
    buildLayout(wordInfos, containerId);
  });
}

// let eg = "Inside 'fear mong' confusion Trump executive order travel ban President Donald Trump declared Pentagon Friday enacting strict measures prevent domestic terror attacks government knew meant Protesters decry Trump immigration policies Protesters gathered cities airports United States Saturday complain President Donald Trump immigration policies protests scheduled Sunday Tech leaders condemn Trump immigrant ban ink barely dry President Trump order ban immigration majority Muslim countries tech companies speaking Judge halts implementation Trump immigration order federal judge granted emergency stay Saturday night citizens Muslim majority countries arrived transit hold valid visas ruling removed decision halts President Donald Trump executive order barring citizens countries entering 90 days Read judge order Trump Travel ban working nicely CNN Video President Donald Trump executive order banning immigrants Muslim majority countries working nicely Syrian Christians turned back airport family Syrian Christian immigrants arrive Philadelphia join relatives long wait President Trump executive order turned Trump immigration ban sends shockwaves President Donald Trump seismic move ban 130 million people United States deny entry refugees reverberated worldwide Saturday chaos confusion rippled airports American law enforcement agencies foreign countries grasp Washington policy Trump fast furious week strategy President Trump overwhelming Washington series provocative executive orders aim fulfill campaign promises mask narrow election win writes Julian Zelizer Sen Chris Murphy scathing tweet President Trump CNN Video Democrat Sen Chris Murphy tweeted image dead Syrian child President Donald Trump issued executive order banning Syrian refugees indefinitely";
// let wordInfos = buildWordInfos(processText(eg));
// buildLayout(wordInfos, "1");
// buildLayout(wordInfos, "2");

buildCloud("cnn", "1");
buildCloud("fox", "2");
// buildCloud("cnbc", "2");
