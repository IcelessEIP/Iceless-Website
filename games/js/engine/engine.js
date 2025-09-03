"use strict";

import * as MULTI from 'multiplayer';
import * as THREE from 'three';
import * as CONTROLS from 'engine/controls.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// vars
export let tempVector = new THREE.Vector3();
export let upVector = new THREE.Vector3(0, 1, 0);

export let clock = new THREE.Clock();
export let delta = 1;

export let playerId = 0;
export let otherPlayerId = 0;
export let isOtherConnected = false

export let collidableMeshList = [];
export let disabledCollidableMeshList = [];
export let interactibleMeshList = [];

export let triangleClicked = false;

export let mixer = [], clips = [], idleAnimation = [], walkAnimation = [], action = [];

export let currentEvents = [];
export let distantEvents = [];

export const targetFps = 60;
export let interval = 1000 / targetFps;

export let quality = new URLSearchParams(window.location.search).get("quality") || 0.5;


export function otherConnected() {
    isOtherConnected = true;
}

export function resetDistantEvents() {
    distantEvents = [];
}

export function resetCurrentEvents() {
    currentEvents = [];
}

export function setDistantEvents(events) {
    distantEvents = events;
}

export function addBackToCollidableMeshList(id) {
    if (collidableMeshList.find(m => m.name === "Collision" + parseInt(id, 10))) {
        return;
    }
    let currentMesh = disabledCollidableMeshList.find(m => m.name === "Collision" + parseInt(id, 10));
    collidableMeshList.push(currentMesh);
    scene.add(currentMesh);
    disabledCollidableMeshList = disabledCollidableMeshList.filter(m => m.name !== "Collision" + parseInt(id, 10));
}

export function removeFromCollidableMeshList(id) {
    if (disabledCollidableMeshList.find(m => m.name === "Collision" + parseInt(id, 10))) {
        return;
    }
    let currentMesh = collidableMeshList.find(m => m.name === "Collision" + parseInt(id, 10));
    disabledCollidableMeshList.push(currentMesh);
    currentMesh.parent.remove(currentMesh);
    collidableMeshList = collidableMeshList.filter(m => m.name !== "Collision" + parseInt(id, 10));
}

export function triangleClickedTrue() {
    triangleClicked = true;
}

export function triangleReset() {
    triangleClicked = false;
}

export function setPlayerId(id) {
    console.log("setPlayerId(" + id + ")");
    playerId = id;
}

export function setOtherPlayerId(id) {
    console.log("setOtherPlayerId(" + id + ")");
    otherPlayerId = id;
}

export var playerModels = [];

export function setPlayerModel(newPlayerModel, i) {
    playerModels[i] = newPlayerModel;
}

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

export const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.CineonToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.setPixelRatio(window.devicePixelRatio * quality); // 1 - Normal, 0.5 - Performance
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add OrbitControls so that we can pan around with the mouse.
export var controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = 25;
controls.minDistance = 25;
controls.maxPolarAngle = Math.PI / 4;
controls.minPolarAngle = Math.PI / 4;
controls.autoRotate = false;
controls.autoRotateSpeed = 0;
controls.rotateSpeed = 0.4;
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.enableZoom = false;
controls.enablePan = false;
controls.enableRotate = false;
controls.minAzimuthAngle = - Math.PI / 2;
controls.maxAzimuthAngle = Math.PI / 2;

MULTI.multiplayerStart();

export function forceUpdatePlayer(position, yRotation = 0) {
    playerModels[playerId].position.copy(position);
    const offset = new THREE.Vector3(0, 8, 25);
    const rotatedOffset = offset.clone().applyAxisAngle(upVector, yRotation);
    camera.position.copy(position).add(rotatedOffset);
    controls.target.copy(position);
    controls.update();
}

export function updatePlayer(position) {
    if (CONTROLS.joystickPower > 0) {
        tempVector
            .set(0, 0, CONTROLS.joystickPower >= 0.2 ? 0.2 * (delta * 60) : CONTROLS.joystickPower * (delta * 60))
            .applyAxisAngle(upVector, CONTROLS.joystickAngle)
                position.addScaledVector(
                    tempVector,
                    1
                )
    }
    // reposition camera
    camera.position.sub(controls.target)
};

// Handle window resize
export function enableResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
}

export function addJoystick() {
    CONTROLS.addJoystick();
}

export function addTriangle() {
    CONTROLS.addTriangle();
}

export function addMuteButton() {
    CONTROLS.addMuteButton();
}

export function invertMute() {
    MULTI.invertMute();
}

export function animate() {
    delta = clock.getDelta();
}

export function collision() {
    const Player = playerModels[playerId];
    if (!Player) return;

    const playerBox = new THREE.Box3().setFromCenterAndSize(
        Player.position,
        new THREE.Vector3(0.3, 1.0, 0.2)
    );

    for (let i = 0; i < collidableMeshList.length; i++) {
        const mesh = collidableMeshList[i];
        if (!mesh.parent) continue;

        mesh.geometry.computeBoundingBox();
        const worldBox = mesh.geometry.boundingBox.clone();
        worldBox.applyMatrix4(mesh.matrixWorld);

        if (playerBox.intersectsBox(worldBox)) {
            return true;
        }
    }
    return false;
}


export function interaction() {
    const Player = playerModels[playerId];
    if (!Player) return;

    let PlayerMesh = null;
    Player.traverse((child) => {
        if (child.isMesh) {
            PlayerMesh = child;
        }
    });
    if (!PlayerMesh) return;

    PlayerMesh.geometry.computeBoundingBox();
    const playerBox = PlayerMesh.geometry.boundingBox.clone();
    playerBox.applyMatrix4(PlayerMesh.matrixWorld);

    for (let i = 0; i < interactibleMeshList.length; i++) {
        const mesh = interactibleMeshList[i];
        if (!mesh.geometry.boundingBox) {
            mesh.geometry.computeBoundingBox();
        }
        const worldBox = mesh.geometry.boundingBox.clone();
        worldBox.applyMatrix4(mesh.matrixWorld);

        if (playerBox.intersectsBox(worldBox)) {
            return parseInt(interactibleMeshList[i].name.match(/\d+/), 10);
        }
    }
    return 0;
}

// Prevent double click zoom
document.addEventListener('dblclick', function(event) {
    event.preventDefault();
}, { passive: false });
