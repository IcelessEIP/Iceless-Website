import * as ENGINE from 'engine';
import * as THREE from 'three';
import * as CONTROLS from 'engine/controls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // should not be here, should be used in engine.js and have a function to load model
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

var interactions = [];

let lastPlayerPosition;

let lastTime = 0;

let curtains;
let curtainsState = 0;

let spotLight;
let spotLight2;
let angle = 0;

let directionalLight;

let quizClock = new THREE.Clock(false);
let quizState = -1;

let questions;
let currentQuestion;
let questionAnswer = -1;
let usedQuestions = new Set();
let worldQuestion = [];
let distantIndex = -1;
let firstConnection = true;
let currentIndex;

let lastPressingSent = -1;
let distantPressing = "-1";

let plateformes = [];

let globalFont;

const materialGreen = new THREE.MeshStandardMaterial({
                        color: 'green',
                        roughness: 0.5
                    });

const materialRed = new THREE.MeshStandardMaterial({
                        color: 'red',
                        roughness: 0.5
                    });

const materialGray = new THREE.MeshStandardMaterial({
                        color: '#3F3F3F',
                        roughness: 0.5
                    });

const materialWhite = new THREE.MeshStandardMaterial({
                        color: 'white',
                        roughness: 0.5
                    });

const materialGold = new THREE.MeshStandardMaterial({
                        color: 'gold',
                        roughness: 0.5
                    });

function analyseEvents() {
    for (let i = 0; i < ENGINE.distantEvents.length; i++) {
        if (ENGINE.distantEvents[i].startsWith("question ")) {
            quizClock.stop();
            quizClock.elapsedTime = 0;
            distantIndex = parseInt(ENGINE.distantEvents[i].split(" ")[1]);
            quizState = -1;
            curtainsState = 0;
            worldQuestion.forEach((element) => {
                ENGINE.scene.remove(element);
            });
            for (let i = 0; i < plateformes.length; i++) {
                plateformes[i].material = materialGray;
            }
            getRandomQuestion();
        }
        if (ENGINE.distantEvents[i].startsWith("pressing ")) {
            let current = ENGINE.distantEvents[i].split(" ")[1];
            if (quizState === -1 || quizState === 1) {
                distantPressing = current;
            }
        }
        if (i === ENGINE.distantEvents.length - 1) {
            ENGINE.resetDistantEvents();
        }
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function splitText(text) {
    if (text.length < 50) return [text];

    const mid = Math.floor(text.length / 2);
    let splitPos = text.lastIndexOf(' ', mid);
    if (splitPos === -1) splitPos = mid;

    return [text.slice(0, splitPos), text.slice(splitPos + 1)];
}

function generateRandomQuestion() {
    splitText(currentQuestion.question).forEach((line, i) => {
        const geometry = new TextGeometry(line, {
            font: globalFont,
            size: 2,
            height: 10,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 3
        });

        geometry.computeBoundingBox();

        if (geometry.boundingBox) {
            geometry.translate(-geometry.boundingBox.max.x / 2, 0, 0);
        }

        const material = new THREE.MeshStandardMaterial({
            color: 'white',
            roughness: 0.5
        });

        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.set(0, 12 - i * 3, -40);
        textMesh.scale.z = 0.005;
        worldQuestion.push(textMesh);
        ENGINE.scene.add(textMesh);
    })
    currentQuestion.choices.forEach((line, i) => {
        const geometry = new TextGeometry(line, {
            font: globalFont,
            size: 2,
            height: 10,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 3
        });

        geometry.computeBoundingBox();

        if (geometry.boundingBox) {
            geometry.translate(-geometry.boundingBox.max.x / 2, 0, 0);
        }

        const material = new THREE.MeshStandardMaterial({
            color: 'white',
            roughness: 0.5
        });

        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.set(-22 + i * 22, 5, -25);
        textMesh.scale.z = 0.005;
        worldQuestion.push(textMesh);
        ENGINE.scene.add(textMesh);
    })
}

// PlayerId(1) === l'original
function getRandomQuestion() {
    if (ENGINE.playerId === 1) {
        if (usedQuestions.length === questions.length) {
            console.log("ALL QUESTIONS ANSWERED!!");
            return;
        }
        for (let i = 0; i < questions.length; i++) {
            currentIndex = getRandomInt(0, questions.length - 1);
            if (!usedQuestions.has(currentIndex)) {
                usedQuestions.add(currentIndex);
                currentQuestion = questions[currentIndex];
                distantIndex = currentIndex;
                break;
            }
        }
        ENGINE.currentEvents.push("question " + currentIndex);
        generateRandomQuestion();
    } else {
        const checker = setInterval(() => {
            if (distantIndex !== -1) {
                clearInterval(checker);
                currentIndex = distantIndex;
                currentQuestion = questions[currentIndex];
                firstConnection = false;
                generateRandomQuestion();
            }
        }, 25);
    }
}

// Animation loop
function animate(now) {
    let isCollide = false;
    let interaction = ENGINE.interaction();
    ENGINE.animate();
    if (ENGINE.playerModels[0] != undefined) {
        if (firstConnection && ENGINE.isOtherConnected) {
            firstConnection = false;
            getRandomQuestion();
        }
        if (distantIndex >= 0 && ENGINE.isOtherConnected) {
            if (interaction > 0) {
                questionAnswer = interaction - 1;
                if (lastPressingSent !== interaction) {
                    console.log(interaction);
                    console.log(lastPressingSent);
                    ENGINE.currentEvents.push("pressing " + interaction);
                    lastPressingSent = interaction;
                }
            } else {
                questionAnswer = -1;
                if (lastPressingSent !== -1) {
                    ENGINE.currentEvents.push("pressing -1");
                    lastPressingSent = -1;
                }
            }
            if (quizState === -1 || quizState === 1) {
                for (let i = 0; i < plateformes.length; i++) {
                    if (plateformes[i].name.substr(plateformes[i].name.length - 1) === interaction.toString() &&
                        plateformes[i].name.substr(plateformes[i].name.length - 1) === distantPressing) {
                        plateformes[i].material = materialGold;
                    } else if (plateformes[i].name.substr(plateformes[i].name.length - 1) === interaction.toString() ||
                        plateformes[i].name.substr(plateformes[i].name.length - 1) === distantPressing) {
                        plateformes[i].material = materialWhite;
                    } else {
                        plateformes[i].material = materialGray;
                    }
                }
            }
            if (curtains && curtains.position.y < 35 && curtainsState === 1) {
                if (now - lastTime >= ENGINE.interval) {
                    curtains.position.y += 0.15;
                    angle += 0.15;
                    spotLight.target.position.y = Math.cos(angle) * 5;
                    spotLight.target.position.z = Math.sin(angle) * 5;
                    spotLight2.target.position.y = Math.cos(angle + 15) * 5;
                    spotLight2.target.position.z = Math.sin(angle + 15) * 5;
                }
            } else if (curtains && curtainsState === 1 && directionalLight.intensity < 3) {
                if (now - lastTime >= ENGINE.interval) {
                    directionalLight.intensity += 0.1;
                    spotLight.intensity -= 0.6;
                    spotLight2.intensity -= 0.6;
                }
            } else if (curtains && curtains.position.y === 35) {
                curtainsState = 2;
            } else if (curtains && curtains.position.y > 15 && curtainsState === 3) {
                if (now - lastTime >= ENGINE.interval) {
                    curtains.position.y -= 0.15;
                    if (directionalLight.intensity > 1.5) {
                        directionalLight.intensity -= 0.1;
                        spotLight.intensity += 0.6;
                        spotLight2.intensity += 0.6;
                    }
                }
            } else if (curtains && curtains.position.y === 15) {
                curtainsState = 4;
            }
            if (quizState === 1 || quizState === 2) {
                quizClock.getElapsedTime();
            }
            if (quizState === 0) {
                // Rideau qui monte
                quizClock.start();
                questionAnswer = -1;
                quizState = 2;
            } else if (quizState === -1) {
                // Pause
                quizClock.start();
                quizState = 1;
                curtainsState = 1;
            } else if (quizClock.elapsedTime >= 5 && quizState === 2) {
                // Fin de la pause
                quizState = -1;
                curtainsState = 0;
                worldQuestion.forEach((element) => {
                    ENGINE.scene.remove(element);
                });
                for (let i = 0; i < plateformes.length; i++) {
                    plateformes[i].material = materialGray;
                }
                getRandomQuestion();
                quizClock.stop();
                quizClock.elapsedTime = 0;
            } else if (quizClock.elapsedTime >= 10 && quizState === 1) {
                // Baissage de rideau/résultat
                for (let i = 0; i < plateformes.length; i++) {
                    if ((currentQuestion.answer + 1).toString() === plateformes[i].name.substr(plateformes[i].name.length - 1)) {
                        plateformes[i].material = materialGreen;
                    } else {
                        plateformes[i].material = materialRed;
                    }
                }
                quizState = 0;
                curtainsState = 3
                if (questionAnswer === currentQuestion.answer) {
                    console.log("CORRECT ANSWER!!");
                } else {
                    console.log("Wrong answer :(");
                }
                quizClock.stop();
                quizClock.elapsedTime = 0;
            }
        }
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
        ENGINE.camera.position.set(ENGINE.playerModels[ENGINE.playerId].position.x, 15, 50);
        ENGINE.camera.rotation.set(-0.3, 0, 0);
        ENGINE.playerModels[ENGINE.playerId].updateMatrixWorld();
        ENGINE.playerModels[ENGINE.playerId].rotation.set(0, CONTROLS.joystickAngle - 1.5, 0);
    }
    if (ENGINE.mixer.length > 0) {
        for (let i = 0; i < ENGINE.mixer.length; i++) {
            ENGINE.mixer[i].update(ENGINE.delta);
        }
    }
    requestAnimationFrame(animate);
    if (now - lastTime < ENGINE.interval) {
        return;
    }
    lastTime = now;
    analyseEvents();
    ENGINE.triangleReset();
    ENGINE.renderer.render(ENGINE.scene, ENGINE.camera);
}

export function game() {
    ENGINE.camera.position.set(0, 5, 50);
    ENGINE.controls.maxPolarAngle = Math.PI / 3;
    ENGINE.controls.minPolarAngle = Math.PI / 3;
    ENGINE.controls.maxDistance = 50;
    ENGINE.controls.minDistance = 50;

    const ambientLight = new THREE.AmbientLight(0xaaccff, 1.0);
    ENGINE.scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xE4EEFF, 1.5);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.camera.far = 400;

    directionalLight.shadow.mapSize.width = ENGINE.quality > 0.7 ? 2048 : 512;
    directionalLight.shadow.mapSize.height = ENGINE.quality > 0.7 ? 2048 : 512;
    directionalLight.shadow.bias = -0.001;

    ENGINE.scene.add(directionalLight);

    spotLight = new THREE.SpotLight(0xE4EEFF, 10);
    spotLight.position.set(10, 5, 50);
    spotLight.castShadow = true;
    spotLight.angle = Math.PI / 10;
    spotLight.penumbra = 0.3;
    spotLight.decay = 0;
    spotLight.distance = 200;
    spotLight.target.position.set(0, Math.cos(angle) * 5,  Math.sin(angle) * 5)
    spotLight.shadow.mapSize.width = ENGINE.quality > 0.7 ? 2048 : 512;
    spotLight.shadow.mapSize.height = ENGINE.quality > 0.7 ? 2048 : 512;
    spotLight.shadow.bias = -0.001;

    spotLight2 = new THREE.SpotLight(0xE4EEFF, 10);
    spotLight2.position.set(-10, 5, 50);
    spotLight2.castShadow = true;
    spotLight2.angle = Math.PI / 10;
    spotLight2.penumbra = 0.3;
    spotLight2.decay = 0;
    spotLight2.distance = 200;
    spotLight2.target.position.set(0, Math.cos(angle + 15) * 5,  Math.sin(angle + 15) * 5)
    spotLight2.shadow.mapSize.width = ENGINE.quality > 0.7 ? 2048 : 512;
    spotLight2.shadow.mapSize.height = ENGINE.quality > 0.7 ? 2048 : 512;
    spotLight2.shadow.bias = -0.001;

    ENGINE.scene.add(spotLight);
    ENGINE.scene.add(spotLight.target);
    ENGINE.scene.add(spotLight2);
    ENGINE.scene.add(spotLight2.target);

    const loader = new GLTFLoader();
    loader.loadAsync("assets/models/pinguin/pinguin_both.glb")
    .then(gltf => {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        gltf.scene.position.set(0, 0, -3);
        gltf.scene.rotation.set(0, -1.5, 0);
        ENGINE.mixer.push(new THREE.AnimationMixer(gltf.scene));
        ENGINE.clips.push(gltf.animations);
        ENGINE.setPlayerModel(gltf.scene, 0);
        ENGINE.scene.add(gltf.scene);
        ENGINE.idleAnimation.push(THREE.AnimationClip.findByName(ENGINE.clips[0], 'ArmatureAction'));
        ENGINE.walkAnimation.push(THREE.AnimationClip.findByName(ENGINE.clips[0], 'Armature|Armature|ArmatureAction_Armature'));
        ENGINE.action.push(ENGINE.mixer[0].clipAction(ENGINE.idleAnimation[0]));
        ENGINE.action[0].play();
    })
    .catch(error => {
        console.error(error);
    });

    loader.loadAsync("assets/models/interaction/interaction.glb")
    .then(gltf => {
        const positions = [
            new THREE.Vector3(-7, 6, 1.5),
            new THREE.Vector3(-7, 6, -21.5),
            new THREE.Vector3(0, 5, -5),
            new THREE.Vector3(0, 6, -20.5),
            new THREE.Vector3(-7, 6, -33.5),
            new THREE.Vector3(7, 6, -33.5)
        ];

        positions.forEach((pos) => {
            const clone = gltf.scene.clone(true);

            clone.position.copy(pos);
            clone.rotation.set(0, -6.27, 0);

            interactions.push(clone);
            ENGINE.scene.add(clone);
            ENGINE.renderer.compile(ENGINE.scene, ENGINE.camera);

            clone.visible = false;
        });
    })
    .catch(error => {
        console.error(error);
    });

    loader.loadAsync("assets/models/pinguin/pinguin_both.glb")
    .then(gltf => {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        gltf.scene.position.set(0, 0, 3);
        gltf.scene.rotation.set(0, 1.6, 0);
        ENGINE.mixer.push(new THREE.AnimationMixer(gltf.scene));
        ENGINE.clips.push(gltf.animations);
        ENGINE.setPlayerModel(gltf.scene, 1);
        ENGINE.scene.add(gltf.scene);
        ENGINE.idleAnimation.push(THREE.AnimationClip.findByName(ENGINE.clips[1], 'ArmatureAction'));
        ENGINE.walkAnimation.push(THREE.AnimationClip.findByName(ENGINE.clips[1], 'Armature|Armature|ArmatureAction_Armature'));
        ENGINE.action.push(ENGINE.mixer[1].clipAction(ENGINE.idleAnimation[1]));
        ENGINE.action[1].play();
    })
    .catch(error => {
        console.error(error);
    });

    loader.load("assets/models/quiz/world.glb", function (gltf) {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                if (child.name === "Curtains") {
                    curtains = child;
                }
                if (child.name.startsWith("Plateforme")) {
                    plateformes.push(child);
                }
                if (child.name.startsWith("Collision") || child.name.startsWith("Interaction") || child.name.startsWith("NoShadow")) {
                    if (child.name.startsWith("Collision")) {
                        ENGINE.collidableMeshList.push(child);
                    } else if (child.name.startsWith("Interaction")) {
                        ENGINE.interactibleMeshList.push(child);
                    }
                    child.castShadow = false;
                    child.receiveShadow = false;
                } else {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child.name.startsWith("Rope")) {
                    child.visible = false;
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

    fetch("js/games/quiz/questions.json")
    .then(response => {
        if (!response.ok) {
            throw new Error('Erreur réseau : ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        questions = data.questions;
        fontLoader.load("assets/fonts/helvetiker_bold.typeface.json", function (font) {
            globalFont = font;
        });
    })
    .catch(error => {
        console.error('Erreur lors de la récupération du fichier JSON :', error);
    });

    const fontLoader = new FontLoader();


    ENGINE.addJoystick();
    ENGINE.addTriangle();
    ENGINE.addMuteButton();
    ENGINE.enableResize();
    animate();
}
