import { playerId, otherPlayerId, setPlayerId, setOtherPlayerId, playerModels, mixer, clips, idleAnimation, walkAnimation, action, currentEvents, setDistantEvents, resetCurrentEvents, otherConnected } from 'engine';
import * as THREE from 'three';

const roomID = new URLSearchParams(window.location.search).get("roomID");

var otherRoomID = ""
var peer;
var localStream = null;

let currentInterval;

export function invertMute() {
    const path = document.querySelector("#microphone svg path");
    const fill = window.getComputedStyle(path).fill;

    let muted = false;
    if (fill === "rgb(166, 166, 166)") {
        path.style.fill = "rgb(255, 103, 103)";
        muted = true;
    } else {
        path.style.fill = "rgb(166, 166, 166)";
        muted = false;
    }

    if (localStream) {
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !muted;
        });
    }
}

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            localStream = stream;
            if (typeof playerId !== 'undefined' && playerId === 0 && typeof connectToOtherPeer === 'function') {
                connectToOtherPeer();
            }
        })
        .catch(err => {
            console.error('Microphone access denied:', err);
        });
} else {
    console.error('getUserMedia is not supported in this browser or context.');
}

function setupAudioCall(conn) {
    if (localStream && peer && otherRoomID) {
        const call = peer.call(otherRoomID, localStream);
        call.on('stream', remoteStream => {
            playRemoteAudio(remoteStream);
        });
        call.on('close', () => {
            stopRemoteAudio();
        });
    }
}

function waitForLocalStreamThenCall(conn) {
    if (localStream) {
        setupAudioCall(conn);
    } else {
        console.log('Waiting for localStream to be ready...');
        setTimeout(() => waitForLocalStreamThenCall(conn), 200);
    }
}

function playRemoteAudio(stream) {
    let audio = document.getElementById('remoteAudio');
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'remoteAudio';
        audio.autoplay = true;
        document.body.appendChild(audio);
    }
    audio.srcObject = stream;
    audio.muted = false;
    audio.volume = 1.0;
    console.log('Playing remote audio stream');
    invertMute();
}

function stopRemoteAudio() {
    let audio = document.getElementById('remoteAudio');
    if (audio) {
        audio.srcObject = null;
    }
}

export function multiplayerStart() {
    if (roomID.endsWith("-2")) {
        otherRoomID = roomID.slice(0, -2);
        setPlayerId(0);
        setOtherPlayerId(1);
    } else {
        otherRoomID = roomID + "-2";
        setPlayerId(1);
        setOtherPlayerId(0);
    }
    peer = new Peer(roomID, {
        // host: 'api.iceless.app',
        // port: 80,
        // path: '/',
        // secure: true,
    });
    peer.on('open', id => {
        console.log('My peer ID is: ' + id);
    });

    peer.on('connection', conn => {
        console.log('Connected!', conn);

        conn.on('data', data => {
            if (!playerModels[otherPlayerId].position.equals(new THREE.Vector3(JSON.parse(data).data.x, 0, JSON.parse(data).data.y))) {
                action[otherPlayerId].timeScale = (0.1 * 2 + 1);
                const walkAction = mixer[otherPlayerId].clipAction(walkAnimation[otherPlayerId]);
                if (action[otherPlayerId] !== walkAction) {
                    if (action[otherPlayerId]) action[otherPlayerId].fadeOut(0.2);
                    walkAction.reset().fadeIn(0.2).play();
                    action[otherPlayerId] = walkAction;
                }
                playerModels[otherPlayerId].position.set(JSON.parse(data).data.x, 0, JSON.parse(data).data.y);
            } else {
                action[otherPlayerId].timeScale = 1.0;
                const idleAction = mixer[otherPlayerId].clipAction(idleAnimation[otherPlayerId]);
                if (action[otherPlayerId] !== idleAction) {
                    if (action[otherPlayerId]) action[otherPlayerId].fadeOut(0.2);
                    idleAction.reset().fadeIn(0.2).play();
                    action[otherPlayerId] = idleAction;
                }
            }
            playerModels[otherPlayerId].rotation.set(0, JSON.parse(data).data.angle, 0);
            if ("events" in JSON.parse(data).data) {
                setDistantEvents(JSON.parse(data).data.events);
                // console.log("YES EVENT");
            }
        });

        conn.on('open', function() {
            console.log('Connection opened with:', conn.peer);
            otherConnected();
            currentInterval = setInterval(() => {
                let pos = {
                    x: playerModels[playerId].position.x,
                    y: playerModels[playerId].position.z,
                    angle: playerModels[playerId].rotation.y
                };
                if (currentEvents.length > 0) {
                    pos.events = currentEvents;
                    resetCurrentEvents();
                }
                conn.send(JSON.stringify({ type: "pos", data: pos }));
            }, 25);
        });

        conn.on('error', function(err) {
            console.error('Connection error:', err);
        });

        conn.on('close', function() {
            console.log('Connection closed with:', conn.peer);
            clearInterval(currentInterval);
        });
    });

    peer.on('call', call => {
        if (localStream) {
            call.answer(localStream);
            call.on('stream', remoteStream => {
                playRemoteAudio(remoteStream);
            });
            call.on('close', () => {
                stopRemoteAudio();
            });
        } else {
            call.answer();
        }
    });
}

function connectToOtherPeer() {
    const conn = peer.connect(otherRoomID, {
        // host: 'api.iceless.app',
        // port: 80,
        // path: '/',
        // secure: true,
    });

    console.log("Connecting to peer " + otherRoomID + "...");

    conn.on('open', () => {
        console.log("Connected!")
        // Only playerId == 0 initiates audio call, and only when localStream is ready
        if (playerId == 0) {
            waitForLocalStreamThenCall(conn);
        }
        otherConnected();
        currentInterval = setInterval(() => {
            const pos = {
                x: playerModels[playerId].position.x,
                y: playerModels[playerId].position.z,
                angle: playerModels[playerId].rotation.y
            };
            if (currentEvents.length > 0) {
                pos.events = currentEvents;
                resetCurrentEvents();
            }
            conn.send(JSON.stringify({ type: "pos", data: pos }));
        }, 25);
    });

    conn.on('error', err => {
        console.log('Connection failed, retrying...', err);
    });

    conn.on('close', function() {
        console.log('Connection closed with:', conn.peer);
        clearInterval(currentInterval);
    });

    conn.on('data', data => {
        if (!playerModels[otherPlayerId].position.equals(new THREE.Vector3(JSON.parse(data).data.x, 0, JSON.parse(data).data.y))) {
            action[otherPlayerId].timeScale = (0.1 * 2 + 1);
            const walkAction = mixer[otherPlayerId].clipAction(walkAnimation[otherPlayerId]);
            if (action[otherPlayerId] !== walkAction) {
                if (action[otherPlayerId]) action[otherPlayerId].fadeOut(0.2);
                walkAction.reset().fadeIn(0.2).play();
                action[otherPlayerId] = walkAction;
            }
            playerModels[otherPlayerId].position.set(JSON.parse(data).data.x, 0, JSON.parse(data).data.y);
        } else {
            action[otherPlayerId].timeScale = 1.0;
            const idleAction = mixer[otherPlayerId].clipAction(idleAnimation[otherPlayerId]);
            if (action[otherPlayerId] !== idleAction) {
                if (action[otherPlayerId]) action[otherPlayerId].fadeOut(0.2);
                idleAction.reset().fadeIn(0.2).play();
                action[otherPlayerId] = idleAction;
            }
        }
        playerModels[otherPlayerId].rotation.set(0, JSON.parse(data).data.angle, 0);
        if ("events" in JSON.parse(data).data) {
            setDistantEvents(JSON.parse(data).data.events);
            // console.log("YES EVENT");
        }
    });
}
