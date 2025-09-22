import * as ENGINE from 'engine';
import * as THREE from 'three';
import * as CONTROLS from 'engine/controls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // should not be here, should be used in engine.js and have a function to load model
import { Water } from 'three/addons/objects/Water.js';

let lastPlayerPosition;

let canvas;

let lastTime = 0;

let water;

let currentBrushThickness = 40;
let currentBrushColor = "#ff0000";

const colorSlider = document.createElement("div");
colorSlider.className = "color-slider";
const colorPicker = document.createElement("div");
colorPicker.className = "color-picker";
colorSlider.appendChild(colorPicker);
document.body.appendChild(colorSlider);

const colorSliderStyle = document.createElement("link");
colorSliderStyle.rel = "stylesheet";
colorSliderStyle.href = "./js/games/drawing/colorSlider.css";
document.head.appendChild(colorSliderStyle);

function updateColor(event) {
    const rect = colorSlider.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    colorPicker.style.left = x * 100 + "%";

    const hue = x * 360;
    currentBrushColor = `hsl(${hue}, 100%, 50%)`;

    if (water) {
        water.material.uniforms.waterColor.value.set(currentBrushColor);
    }
}

colorSlider.addEventListener("mousedown", (e) => {
    updateColor(e);
    const onMove = (e) => updateColor(e);
    const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const paintCanvas = document.createElement("canvas");
paintCanvas.width = 1024;
paintCanvas.height = 1024;
const ctx = paintCanvas.getContext("2d");
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

const paintTexture = new THREE.CanvasTexture(paintCanvas);

const paintMaterial = new THREE.MeshStandardMaterial({
    map: paintTexture
});

let lastUv = null;

function drawOnTexture(uv) {
    const x = uv.x * paintCanvas.width;
    const y = (1 - uv.y) * paintCanvas.height;

    if (lastUv) {
        const lastX = lastUv.x * paintCanvas.width;
        const lastY = (1 - lastUv.y) * paintCanvas.height;

        ctx.strokeStyle = currentBrushColor;
        ctx.lineWidth = currentBrushThickness;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    paintTexture.needsUpdate = true;
    lastUv = uv;
}

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, ENGINE.camera);
    const intersects = raycaster.intersectObject(canvas);

    if (intersects.length > 0) {
        const uv = intersects[0].uv;
        if (uv) {
            drawOnTexture(uv);
        }
    }
}

window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", () => {lastUv = null;});

function analyseEvents() {
    for (let i = 0; i < ENGINE.distantEvents.length; i++) {
        if (i === ENGINE.distantEvents.length - 1) {
            ENGINE.resetDistantEvents();
        }
    }
}

// Animation loop
function animate(now) {
    let isCollide = false;
    let interaction = ENGINE.interaction();
    ENGINE.animate();
    if (ENGINE.playerModels[0] != undefined) {
        if (lastPlayerPosition && !lastPlayerPosition.equals(ENGINE.playerModels[ENGINE.playerId].position)) {
            isCollide = ENGINE.collision();
            if (isCollide) {
                ENGINE.playerModels[ENGINE.playerId].position.copy(lastPlayerPosition);
            }
            ENGINE.action[ENGINE.playerId].timeScale = (CONTROLS.joystickPower * 2 + 1);
            const walkAction = ENGINE.mixer[ENGINE.playerId].clipAction(ENGINE.walkAnimation[ENGINE.playerId]);
            if (ENGINE.action[ENGINE.playerId] !== walkAction) {
                if (ENGINE.action[ENGINE.playerId]) ENGINE.action[ENGINE.playerId].fadeOut(0.2);
                walkAction.reset().fadeIn(0.2).play();
                ENGINE.action[ENGINE.playerId] = walkAction;
            }
        } else {
            ENGINE.action[ENGINE.playerId].timeScale = 1.0;
            const idleAction = ENGINE.mixer[ENGINE.playerId].clipAction(ENGINE.idleAnimation[ENGINE.playerId]);
            if (ENGINE.action[ENGINE.playerId] !== idleAction) {
                if (ENGINE.action[ENGINE.playerId]) ENGINE.action[ENGINE.playerId].fadeOut(0.2);
                idleAction.reset().fadeIn(0.2).play();
                ENGINE.action[ENGINE.playerId] = idleAction;
            }
        }
        if (!isCollide) {
            lastPlayerPosition = ENGINE.playerModels[ENGINE.playerId].position.clone();
        }
        ENGINE.updatePlayer(ENGINE.playerModels[ENGINE.playerId].position);
        ENGINE.controls.target.set(ENGINE.playerModels[ENGINE.playerId].position.x, ENGINE.playerModels[ENGINE.playerId].position.y, ENGINE.playerModels[ENGINE.playerId].position.z);
        ENGINE.playerModels[ENGINE.playerId].updateMatrixWorld();
        ENGINE.controls.target.copy(ENGINE.playerModels[ENGINE.playerId].position)
        ENGINE.camera.position.add(ENGINE.playerModels[ENGINE.playerId].position)
        ENGINE.playerModels[ENGINE.playerId].rotation.set(0, CONTROLS.joystickAngle - 1.5, 0);
    }
    if (ENGINE.mixer.length > 0) {
        for (let i = 0; i < ENGINE.mixer.length; i++) {
            ENGINE.mixer[i].update(ENGINE.delta);
        }
    }
    if (ENGINE.quality >= 0.5) {
        water.material.uniforms['time'].value += 1.0 / 60.0;
    }
    requestAnimationFrame(animate);
    if (now - lastTime < ENGINE.interval)
        return;
    lastTime = now;
    analyseEvents();
    ENGINE.triangleReset();
    ENGINE.controls.update();
    ENGINE.renderer.render(ENGINE.scene, ENGINE.camera);
}

export function game() {
    ENGINE.setPerspectiveCamera(105 - Math.min(window.innerWidth / window.innerHeight - 1, 0.5) * 30, // adapt fov to the screen size
    20); // adapt distance to the screen size
    ENGINE.controls.maxPolarAngle = Math.PI / 10;
    ENGINE.controls.minPolarAngle = Math.PI / 10;
    const ambientLight = new THREE.AmbientLight(0xaaccff, 2.0);
    ENGINE.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xE4EEFF, 3.0);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = ENGINE.quality < 0.6 ? false : true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.camera.far = 500;

    directionalLight.shadow.mapSize.width = ENGINE.quality > 0.7 ? 2048 : 512;
    directionalLight.shadow.mapSize.height = ENGINE.quality > 0.7 ? 2048 : 512;
    directionalLight.shadow.bias = -0.001;
    ENGINE.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0xaaccff, 0xddeeff, 1.0);
    ENGINE.scene.add(hemiLight);

    const pointLight = new THREE.PointLight(0xaaccff, 0.5, 100);
    pointLight.position.set(0, 3, 0);
    ENGINE.scene.add(pointLight);

    const loader = new GLTFLoader();
    loader.load("assets/models/drawing/world.glb", function (gltf) {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                if (child.name.startsWith("Collision") || child.name.startsWith("Interaction") || child.name.startsWith("Canvas")) {
                    if (child.name.startsWith("Collision")) {
                        ENGINE.collidableMeshList.push(child);
                    } else if (child.name.startsWith("Interaction")) {
                        ENGINE.interactibleMeshList.push(child);
                    } else if (child.name.startsWith("Canvas")) {
                        child.material = paintMaterial;
                        canvas = child;
                    }
                    child.castShadow = false;
                    child.receiveShadow = false;
                } else {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            }
        });
        gltf.scene.position.set(0, 0, 0);
        gltf.scene.rotation.set(0, 0, 0);
        gltf.scene.name = "world";
        ENGINE.scene.add(gltf.scene);
    }, undefined, function (error) {
        console.error(error);
    });

    const waterGeometry = new THREE.CircleGeometry(2.5, 16);
    const waterNormals = new THREE.TextureLoader().load("assets/textures/water_normal.jpg");
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

    water = new Water(
        waterGeometry,
        {
            waterNormals: waterNormals,
            waterColor: currentBrushColor,
            sunColor: "#000000"
        }
    );

    colorPicker.style.left = "0%";

    water.material.transparent = true;
    water.material.uniforms.alpha.value = 0.9;
    water.rotation.x = - Math.PI / 2;
    water.position.set(-9.5, -0.2, 15);

    ENGINE.scene.add(water);

    ENGINE.addMuteButton();
    ENGINE.enableResize();
    animate();
}
