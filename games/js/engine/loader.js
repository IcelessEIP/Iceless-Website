import { gamesList } from 'games/gamesList.js';

const gameID = new URLSearchParams(window.location.search).get("game") || "mine";

function startGame(gameName) {
    if (!new URLSearchParams(window.location.search).get("game")) {
        console.warn("No game is defined in the URL, using fallback game");
    }
    if (gameName === "random") {
        var keys = Object.keys(gamesList);
        gameName = keys[keys.length * Math.random() << 0];
    }
    if (!gamesList[gameName]) {
        console.error(`Game "${gameName}" not found`);
        return;
    }
    import(gamesList[gameName]).then((gameModule) => {
        gameModule.game();
    });
}

startGame(gameID);
