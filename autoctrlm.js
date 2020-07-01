/* regex to identify what should be selected */
var number = "(-?\\d+(\\d+)*(\\.\\d+)?)";
var miscmatch = "((?<![A-Za-z]|['\"\\-])([△∇∂π]|Pi|[B-H]|[J-Z]|[b-h]|[j-z])(?![A-Za-z]|['\"\\-]))";
var definitebinaryoperator = "([+*^=<>≤≥]|\\\\\\.|@@|&&|<=|>=)";
var matchifadjacent = "(" + "[\\w\\d\\)\\(]*" + ")";
var possibleprefixoperators = "([\\(\\-\\\\])";
var possiblepostfixoperators = "([\\)])";
var possiblebinaryoperators = "([\\/\\-])";

if (typeof Match !== ' function') {
    window.Match = class {
        constructor(string, start, end, isSquare) {
            this.string = string;
            this.start = start;
            this.end = end;
            this.isSquare = isSquare;
        }
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function excerpt(content, length) {
    if (content.length > length) {
        return content.substring(0, length) + "...";
    }
    return content;
}

function floatingAlert(string, color, displayTime, fadeTime, showCloseButton) {
    var div = doc.createElement("div");
    div.style = "width: 800px; margin-top: 10px; padding: 30px; font-family: sans-serif; color: white; opacity: 1; transition: opacity " + fadeTime + "ms ease 0s; background-color: " + color;
    div.innerHTML = "<span class='closebtn' onclick=\"this.parentElement.style.display='none'; this.parentNode.parentNode.removeChild(this.parentNode);\" style='margin-left: 15px;color: white;font-weight: bold;float: right;font-size: 22px;line-height: 20px;cursor: pointer;transition: 0.3s;" + (showCloseButton ? "'" : "display:none'") + ">&times;</span><span style='font-size: 16px; font-weight:bold'>" + string + "</span>";
    notesDiv.insertBefore(div, notesDiv.childNodes[0]);
    setTimeout(function () {
        div.style.opacity = 0;
    }, displayTime - fadeTime);
    setTimeout(function () {
        div.style.display = "none";
        div.parentNode.removeChild(div);
    }, displayTime);
}

var invalidBrackets = Array(0);
function getMatchesFromTextContent(textContent, innerStringCell) {
    var counterSquare = 0;
    var counterCurly = 0;
    var matches = [];
    for (var i = 0; i < textContent.length; i++) {
        if (textContent.charAt(i) === "[") {
            counterSquare += 1;
            if (counterSquare === 1 && (matches.length == 0 || matches[matches.length - 1].end >= 0)) {
                matches.push(new Match(null, i, -1, true));
            }
        } else if (textContent.charAt(i) === "]") {
            counterSquare += -1;
            if (counterSquare === 0 && matches[matches.length - 1].isSquare) {
                var thisMatch = matches[matches.length - 1];
                thisMatch.end = i + 1;
                thisMatch.string = textContent.substring(thisMatch.start, thisMatch.end);
            }
        } else if (textContent.charAt(i) === "{") {
            counterCurly += 1;
            if (counterCurly === 1 && (matches.length == 0 || matches[matches.length - 1].end >= 0)) {
                matches.push(new Match(null, i, -1, false));
            }
        } else if (textContent.charAt(i) === "}") {
            counterCurly += -1;
            if (counterCurly === 0 && !matches[matches.length - 1].isSquare) {
                var thisMatch = matches[matches.length - 1];
                thisMatch.end = i + 1;
                thisMatch.string = textContent.substring(thisMatch.start, thisMatch.end);
            }
        }
    }
    if (counterCurly != 0 || counterSquare != 0) {
        invalidBrackets.push("<li style='display: list-item;margin-left: 4ch;list-style-type: disc;'>at <u><a style='cursor: pointer ' onclick='document.location.hash = undefined; document.location.hash = \"" + innerStringCell.id + "\";'>\"" + excerpt(textContent, 40) + "\"</a></u></li>");
    }
    var brackets;
    if (matches.length < 1) {
        brackets = "";
    } else {
        var added = false;
        brackets = "(\\w*(";
        for (var i = matches.length - 1; i >= 0; i--) {
            if (matches[i].string != null) {
                brackets += "(" + escapeRegExp(matches[i].string) + ")|";
                added = true;
            }
        }
        if (added) {
            brackets = brackets.substring(0, brackets.length - 1) + "))|";
        } else {
            brackets = "";
        }
    }
    var group1 = "(" + brackets + number + "|" + miscmatch + ")";
    var group2 = "(" + group1 + "|" + "(" + group1 + "|" + matchifadjacent + ")[ \\t]*" + definitebinaryoperator + "[ \\t]*(" + group1 + "|" + matchifadjacent + ")" + ")";
    var group3 = "(" + "(" + "(" + possibleprefixoperators + "|(" + matchifadjacent + "|" + group2 + ")" + possiblebinaryoperators + ")[ \\t]*" + ")*" + group2 + "([ \\t]*(" + possiblebinaryoperators + "(" + matchifadjacent + "|" + group2 + "))|" + possiblepostfixoperators + ")*" + ")";
    var group4 = group3 + "([ \\t]*" + group3 + ")*";
    var interest = RegExp(group4, 'g');
    return textContent.matchAll(interest);
}

function getMatches(innerStringCell) {
    var childNodeArray = getChildNodesWithoutChildren(innerStringCell);
    var textContentWithBreaks = "";
    for (var i = 0; i < childNodeArray.length; i++) {
        if (childNodeArray[i].tagName == "BR") {
            textContentWithBreaks += "\n";
        } else {
            textContentWithBreaks += childNodeArray[i].textContent;
        }
    }
    var textContentArray = textContentWithBreaks.split("\n");
    var iteratorArray = Array(textContentArray.length);
    for (var i = 0; i < iteratorArray.length; i++) {
        iteratorArray[i] = getMatchesFromTextContent(textContentArray[i], innerStringCell);
    }
    var superIterator = {
        "textContents": textContentArray,
        "iterators": iteratorArray,
        "previousLength": 0,
        "currentIterator": 0,
        "done": false,
        "next": function () {
            if (this.currentIterator >= this.iterators.length) {
                return undefined;
            }
            var iterator = this.iterators[this.currentIterator];
            if (iterator == null) {
                this.previousLength += this.textContents[this.currentIterator].length;
                this.currentIterator++;
                return this.next();
            }
            var originalNext = this.iterators[this.currentIterator].next();
            if (originalNext.done) {
                this.previousLength += this.textContents[this.currentIterator].length;
                this.currentIterator++;
                return this.next();
            }
            var match = {
                "value": {
                    0: originalNext.value[0],
                    index: this.previousLength + originalNext.value.index
                }
            }
            return match;
        }
    };
    return superIterator;
}

function getChildNodesWithoutChildren(target) {
    var nodes = target.childNodes;
    if (nodes == undefined || nodes.length === 0 || target.classList.contains("Inline")) {
        return [target];
    }
    var nodesArray = Array.prototype.slice.call(target.childNodes);
    for (var g = nodesArray.length - 1; g >= 0; g--) {
        nodesArray.splice.apply(nodesArray, [g, 1].concat(getChildNodesWithoutChildren(nodesArray[g])));
    }
    return nodesArray;
}

function getInnerStringCellOrText(element) {
    var out = element.getElementsByClassName("StringCell").item(0);
    if (out == null) {
        out = element.getElementsByClassName("Text").item(0);
    }
    return out;
}

var matches;
function controlMNext() {
    var match;
    if (!isOpen) {
        return;
    }
    do {
        match = matches.next();
    } while (match != undefined && match.value != undefined && match.value[0].match(/^\dD$/g) != null); // filter through undesirable options
    while (match == undefined || match.value == undefined) {
        if (i === allStudents.length - 1) {
            endNow();
            return;
        }
        i++;
        innerStringCell = getInnerStringCellOrText(allStudents[i]);
        doc.location.hash = innerStringCell.id;
        matches = getMatches(innerStringCell);
        match = matches.next();
    }
    currentBounds =
        [getInnerStringCellOrText(allStudents[i]),
        match.value.index, match.value.index + match.value[0].length];
    return currentBounds;
}

/**
Given an array containing a string cell and the bounds of the desired selection, it will determine the bounds relative to a node
 **/
function determineNodeOffsetBound(array) {
    if (!isOpen) {
        return;
    }
    var stringCell = array[0];
    var childNodeArray = getChildNodesWithoutChildren(stringCell);
    var currentLength = 0;
    var start = array[1];
    var startElement = undefined;
    var startOffset = 0;
    var end = array[2];
    var endElement = undefined;
    var endOffset = 0;
    for (j = 0; j < childNodeArray.length; j++) {
        if (childNodeArray[j].textContent != undefined) {
            currentLength += childNodeArray[j].textContent.length;
        }
        if (startElement === undefined && start < currentLength) {
            startElement = childNodeArray[j];
            startOffset = childNodeArray[j].textContent.length + start - currentLength;
            if (startElement.classList != undefined &&
                startElement.classList.contains("Inline"))
                return determineNodeOffsetBound(controlMNext());
        }
        if (endElement === undefined && end < currentLength + 1) {
            endElement = childNodeArray[j];
            endOffset = childNodeArray[j].textContent.length + end - currentLength;
            if (endElement.classList != undefined && endElement.classList.contains("Inline")) {
                return determineNodeOffsetBound(controlMNext());
            }
            lastHash = stringCell.id;
            return [startElement, startOffset, endElement, endOffset];
        }
    }
    return undefined;
}

function selectText(startElement, startOffset, endElement, endOffset) {
    if (!isOpen) {
        return;
    }
    win = frame.contentWindow;
    var doc = win.document,
    sel,
    range;
    if (win.getSelection && doc.createRange) {
        sel = win.getSelection();
        range = doc.createRange();
        range.setStart(startElement, startOffset);
        range.setEnd(endElement, endOffset);
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (doc.body.createTextRange) {
        range = doc.body.createTextRange();
        range.setStart(startElement, startOffset);
        range.setEnd(endElement, endOffset);
        range.select();
    }
}

function endNow() {
    if (isOpen) {
        console.log("Terminating Auto CCM");
        floatingAlert("Auto CCM has ended.", "#2196F3", 2000, 600, false);
        if (invalidBrackets.length > 0) {
            floatingAlert("Invalid curly brace/square bracket syntax may have affected performance:</br><ul>" + invalidBrackets.join(""), "#f44336", 30000, 600, true) + "</ul>";
        }
    }
    doc.location.hash = lastHash;
    console.log(lastHash);
    isOpen = false;
}

/* these are all of the tabs open in courseware */
potentialFrames = document.getElementsByClassName("x-panel x-tabpanel-child x-panel-default x-closable x-panel-closable x-panel-default-closable");
frame = undefined;
/*finds the open frame*/
var q = undefined;
var lastHash = undefined;
var doc = undefined;
var notesDiv;
for (q = 0; q < potentialFrames.length; q++) {
    if (!(potentialFrames[q].classList.contains("x-hide-offsets")))
        frame = potentialFrames[q];
}
if (potentialFrames.length <= 0 || frame == undefined) {
    doc = document;
    if (notesDiv == undefined) {
        notesDiv = doc.createElement("div");
        notesDiv.id = "notesDiv";
        doc.body.insertBefore(notesDiv, doc.body.childNodes[0]);
    }
    notesDiv.style = "position: fixed;z-index: 99;margin-right: calc(50% - 430px);margin-left: calc(50% - 430px);margin-top: 100px;width: fit-content;";
    endNow();
} else {
    frame = frame.getElementsByTagName('iframe')[0];
    doc = frame.contentDocument;
    notesDiv = doc.getElementById("notesDiv");
    if (notesDiv == undefined) {
        notesDiv = doc.createElement("div");
        notesDiv.id = "notesDiv";
        doc.body.insertBefore(notesDiv, doc.body.childNodes[0]);
    }
    notesDiv.style = "position: fixed;z-index: 99;margin-right: calc(50% - 430px);margin-left: calc(50% - 430px);margin-top: 50px;width: fit-content;";
    if (isOpen) {
        floatingAlert("Auto CCM is usurping another session of itself.", "rgb(255,127,39)", 2000, 600, false);
    } else {
        floatingAlert("Auto CCM is starting.", "#2196F3", 2000, 600, false);
    }
    var isOpen = true;
    allStudents = doc.getElementById("Notebook").getElementsByClassName("Notebook")[0].getElementsByClassName("Text Student");
    if (allStudents.length === 0) {
        endNow();
    } else {
        i = 0;
        matches =
            getMatches(getInnerStringCellOrText(allStudents[i]));
        doc.location.hash =
            getInnerStringCellOrText(allStudents[i]).id;
        currentBounds = undefined;

        frame.contentWindow.onkeyup = function (e) {
            if (e.key == '/' && e.ctrlKey) {
                if (isOpen) {
                    endNow();
                    return;
                }
            }
            if (!isOpen)
                return;
            if (e.key === 'm' && e.ctrlKey || e.key == ',' && e.ctrlKey) {
                bounds = controlMNext();
                if (bounds == undefined) {
                    endNow();
                    return;
                }
                nodeBounds = determineNodeOffsetBound(bounds);
                if (nodeBounds == undefined) {
                    endNow();
                    return;
                }
                selectText(nodeBounds[0], nodeBounds[1], nodeBounds[2], nodeBounds[3]);
            }
            if (e.key == '.' && e.ctrlKey) {
                nodeBounds = determineNodeOffsetBound(currentBounds);
                selectText(nodeBounds[0], nodeBounds[1], nodeBounds[2], nodeBounds[3]);
            }
        };

        bounds = controlMNext();
        if (bounds == undefined) {
            endNow();
        }
        nodeBounds = determineNodeOffsetBound(bounds);
        if (nodeBounds == undefined) {
            endNow();
        }
        selectText(nodeBounds[0], nodeBounds[1], nodeBounds[2], nodeBounds[3]);
    }
}
