"use strict"

// Variables initialization

const languageLinks = document.querySelectorAll("a");
const languageNames = ["enEnglish", "frFrançais"];
const bootAnimation = document.getElementById("boot");
const overlay = document.getElementById("overlay");

var lang = (window.location.href.split('/').pop().length === 2 ? window.location.href.split('/').pop() : "en");

// Event listeners

window.addEventListener("submit", function() {
    document.getElementById("contact-form").style.display = "none";
    document.getElementById("contact-text").style.display = "block";
    document.getElementById("detail").style.display = "none";
});

languageLinks.forEach(function(elem) {
    elem.addEventListener("click", function (e) {
        e.preventDefault();
        elem.innerHTML = languageNames.find(item => item.startsWith(lang)).slice(2);
        var oldLang = lang;
        lang = (e.target.href.split('/').pop() || "en");
        if (lang === "en") {
            window.history.pushState("", "", "/");
        } else  {
            window.history.pushState("", "", e.target.href);
        }
        elem.href = oldLang === "en" ? "/" : oldLang;
        changeLanguage(lang);
    });
});

// Functions

function changeLanguage(_lang) {
    fetch("lang/lang-" + _lang + ".json")
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('[data-translate]').forEach(el => {
                const key = el.getAttribute('data-translate');
                const translationText = data.text[key];
                var isTextReplaced = false;

                el.childNodes.forEach(node => {
                  if (node.nodeType === Node.TEXT_NODE && !isTextReplaced && translationText) {
                    node.textContent = translationText;
                    isTextReplaced = true;
                  }
                });
            });
            document.documentElement.lang = _lang;
            document.title = "Iceless | " + data.text["title"];
        });
}

function main() {
    console.log("JS started");
    bootAnimation.play();
}

// Event listeners

bootAnimation.addEventListener("complete", () => {
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    document.documentElement.style.overflowY = "auto";
});

main();
