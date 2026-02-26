import * as ENGINE from 'engine';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // should not be here, should be used in engine.js and have a function to load model
import { Water } from 'three/addons/objects/Water.js';
import { playerId } from 'engine';

let codec = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ? "image/jpeg" : "image/webp"; // if it's safari use jpeg because they don't support webp??!

let canvas;

let lastTime = 0;

let water;

let isDown = false;

let distantWord;

let currentBrushThickness = 20;
let currentBrushColor = "#ff0000";
let currentHue = 0;
let currentBrightness = 50;

const sliderContainer = document.createElement("div");
sliderContainer.className = "color-slider-container";

const colorSlider = document.createElement("div");
colorSlider.className = "color-slider";
const colorPicker = document.createElement("div");
colorPicker.className = "color-picker";
colorSlider.appendChild(colorPicker);

updateColorSliderGradient();

const brightnessSlider = document.createElement("div");
brightnessSlider.className = "brightness-slider";
const brightnessPicker = document.createElement("div");
brightnessPicker.className = "color-picker";
brightnessSlider.appendChild(brightnessPicker);
brightnessPicker.style.left = "50%";

const inputStyle = document.createElement("link");
inputStyle.rel = "stylesheet";
inputStyle.href = "./js/games/drawing/style.css";
const input = document.createElement("input");
document.head.appendChild(inputStyle);
document.body.appendChild(input);

if (playerId === 1) {
    input.disabled = true;
    fetch('./js/games/drawing/wordlist.json')
        .then(response => response.json())
        .then(data => {
            const randomWord = data[Math.floor(Math.random() * data.length)];
            input.value = randomWord;
            ENGINE.currentEvents.push("updateword " + randomWord);
        })
        .catch(error => console.error("Error loading wordlist:", error));
    sliderContainer.appendChild(colorSlider);
    sliderContainer.appendChild(brightnessSlider);
    document.body.appendChild(sliderContainer);
}

function updateColorSliderGradient() {
    const gradientStops = [0, 17, 33, 50, 67, 83, 100].map(percent => {
        const hue = (percent * 360) / 100;
        return `hsl(${hue}, 100%, ${currentBrightness}%) ${percent}%`;
    });
    colorSlider.style.background = `linear-gradient(to right, ${gradientStops.join(', ')})`;
}

function updateColor(event, isHue = true) {
    const slider = isHue ? colorSlider : brightnessSlider;
    const picker = isHue ? colorPicker : brightnessPicker;
    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

    picker.style.left = x * 100 + "%";
    if (isHue) {
        currentHue = x * 360;
    } else {
        currentBrightness = x * 100;
        updateColorSliderGradient();
    }
    currentBrushColor = `hsl(${currentHue}, 100%, ${currentBrightness}%)`;
    if (water) {
        water.material.uniforms.waterColor.value.set(currentBrushColor);
    }
}

function addSliderEventListeners(slider, isHue) {
    slider.addEventListener("pointerdown", (e) => {
        updateColor(e, isHue);
        const onMove = (e) => updateColor(e, isHue);
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    });
}

if (playerId === 1) {
    addSliderEventListeners(colorSlider, true);
    addSliderEventListeners(brightnessSlider, false);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const paintCanvas = document.createElement("canvas");
paintCanvas.width = 768;
paintCanvas.height = 768;
const ctx = paintCanvas.getContext("2d", { willReadFrequently: true });
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

const paintTexture = new THREE.CanvasTexture(paintCanvas);

const paintMaterial = new THREE.MeshStandardMaterial({
    map: paintTexture,
    transparent: true,
    opacity: 0.99
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
        ctx.fillStyle = currentBrushColor;
        ctx.beginPath();
        ctx.arc(x, y, currentBrushThickness / 2, 0, Math.PI * 2);
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

if (playerId === 1) {
    window.addEventListener("pointermove", (event) => {
        if (isDown) {
            onPointerMove(event);
        }
    });

    window.addEventListener("pointerdown", () => {
        isDown = true;
    });
    window.addEventListener("pointerup", () => {
        lastUv = null;
        isDown = false;
        ENGINE.currentEvents.push("updatecodec " + codec);
        ENGINE.currentEvents.push("updatecanvas " + paintCanvas.toDataURL(codec, 0.1));
    });
}

function analyseEvents() {
    for (let i = 0; i < ENGINE.distantEvents.length; i++) {
        if (ENGINE.distantEvents[i].startsWith("updatecanvas ")) {
            const img = new Image();
            img.src = ENGINE.distantEvents[i].slice(13);
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                paintTexture.needsUpdate = true;
            };
        } else if (ENGINE.distantEvents[i].startsWith("updatecodec ")) {
            codec = ENGINE.distantEvents[i].slice(12);
        } else if (ENGINE.distantEvents[i].startsWith("updateword ")) {
            distantWord = ENGINE.distantEvents[i].slice(11);
            input.click();
            input.focus();
        } else if (ENGINE.distantEvents[i] === "answer") {
            input.value = "C'est bon !";
        }
    }
    ENGINE.resetDistantEvents();
}

// Animation loop
function animate(now) {
    let interaction = ENGINE.interaction();
    ENGINE.animate();
    if (ENGINE.mixer.length > 0) {
        for (let i = 0; i < ENGINE.mixer.length; i++) {
            ENGINE.mixer[i].update(ENGINE.delta);
        }
    }
    if (water && ENGINE.quality >= 0.5 && playerId === 1) {
        water.material.uniforms['time'].value += 1.0 / 60.0;
    }
    if (distantWord) {
        if (input.value.normalize().toLowerCase() === distantWord.normalize().toLowerCase()) {
            ENGINE.currentEvents.push("answer");
            input.disabled = true;
            input.value = "C'est bon !";
        }
    }
    requestAnimationFrame(animate);
    if (now - lastTime < ENGINE.interval)
        return;
    lastTime = now;
    analyseEvents();
    ENGINE.controls.update();
    ENGINE.renderer.render(ENGINE.scene, ENGINE.camera);
}

export function game() {
    ENGINE.setPerspectiveCamera(90 - Math.min(window.innerWidth / window.innerHeight - 1, 0.5) * 30, // adapt fov to the screen size
    20, // adapt distance to the screen size
    false);
    ENGINE.camera.position.set(1.75, 20, 5);
    ENGINE.camera.rotation.set(-0.55, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xe6edc0, 0.2);
    ENGINE.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffaa00, 200, 0, 1.5);
    pointLight.position.set(-42, 30, -75);
    ENGINE.scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xffffff, 6, 0, 1.5);
    pointLight2.position.set(0, 20, 0);
    ENGINE.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xe0efff, 200, 0, 1.5);
    pointLight3.position.set(80, 30, -75);
    ENGINE.scene.add(pointLight3);

    const directionalLight = new THREE.DirectionalLight(0xf7f7e6, 1.5);
    directionalLight.position.set(30, 30, -50);
    directionalLight.castShadow = ENGINE.quality < 0.6 ? false : true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.camera.far = 200;

    directionalLight.shadow.mapSize.width = ENGINE.quality > 0.7 ? 2048 : 512;
    directionalLight.shadow.mapSize.height = ENGINE.quality > 0.7 ? 2048 : 512;
    directionalLight.shadow.bias = -0.001;
    ENGINE.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0xEDFBFF, 0xddeeff, 0.3);
    ENGINE.scene.add(hemiLight);

    const loader = new GLTFLoader();
    loader.load("assets/models/drawing/world.glb", function (gltf) {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                if (child.name.startsWith("Collision") || child.name.startsWith("Interaction") || child.name.startsWith("Canvas") || child.name.startsWith("Deletable")) {
                    if (child.name.startsWith("Collision")) {
                        ENGINE.collidableMeshList.push(child);
                    } else if (child.name.startsWith("Interaction")) {
                        ENGINE.interactibleMeshList.push(child);
                    } else if (child.name.startsWith("Canvas")) {
                        child.material = paintMaterial;
                        canvas = child;
                    } else if (child.name.startsWith("Deletable") && playerId === 0) {
                        child.visible = false;
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

    const waterGeometry = new THREE.CircleGeometry(2.75, 16);
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
    water.position.set(-4, 7.7, -3);

    if (playerId === 1) {
        ENGINE.scene.add(water);
    }

    ENGINE.addMuteButton();
    ENGINE.enableResize();
    animate();
}
