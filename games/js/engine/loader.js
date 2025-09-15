import { gamesList } from 'games/gamesList.js';

const gameID = new URLSearchParams(window.location.search).get("game") || "mine";

function startGame(gameName) {
    if (!new URLSearchParams(window.location.search).get("game")) {
        console.warn("No game is defined in the URL, using fallback game");
    }
    if (!gamesList[gameName]) {
        throw new Error(`Game "${gameName}" not found.`);
    }
    import(gamesList[gameName]).then((gameModule) => {
        gameModule.game();
    });
}

startGame(gameID);
