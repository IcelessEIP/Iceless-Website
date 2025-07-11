import { gamesList } from 'games/gamesList.js';

const gameID = new URLSearchParams(window.location.search).get("game");

function startGame(gameName) {
    if (!gamesList[gameName]) {
        throw new Error(`Game "${gameName}" not found.`);
    }
    import(gamesList[gameName]).then((gameModule) => {
        gameModule.game();
    });
}

startGame(gameID);
