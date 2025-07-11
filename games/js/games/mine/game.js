import * as ENGINE from 'engine';
import * as THREE from 'three';
import * as CONTROLS from 'engine/controls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // should not be here, should be used in engine.js and have a function to load model
import { Sky } from 'three/addons/objects/Sky.js'; // same as above

var interactions = [];
var spinning = [];
let velocities = [];

let snowParticles, snowCount;

let lastPlayerPosition;

let inSpinningMode = -1;

let lastTime = 0;

let lastInteraction = 1;

let ropeClock = new THREE.Clock(false);
let ropeValidation = [false, false];
let ropeState = 0;

function analyseEvents() {
    for (let i = 0; i < ENGINE.distantEvents.length; i++) {
        if (ENGINE.distantEvents[i].startsWith("spinning0 ")) {
            spinning[0].rotation.y = parseFloat(ENGINE.distantEvents[i].split(" ")[1]);
           if (spinning[0].rotation.y > 2.7 && spinning[0].rotation.y < 3.5) {
                // ENGINE.removeFromCollidableMeshList(7);
                ENGINE.collidableMeshList.find(m => m.name === "Collision7").position.z = -6.5;
            } else if (ENGINE.collidableMeshList.find(m => m.name === "Collision7")) {
                // ENGINE.addBackToCollidableMeshList(7);
                ENGINE.collidableMeshList.find(m => m.name === "Collision7").position.z = -4.5;
            }
            if (ENGINE.playerId === 1) {
                lastInteraction = 0;
            } else {
                lastInteraction = 1;
            }
        }
        if (ENGINE.distantEvents[i] === ("ropeValidation")) {
            if (ENGINE.playerId === 0) {
                ropeValidation[1] = true;
            } else {
                ropeValidation[0] = true;
            }
        }
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
        if ((ENGINE.triangleClicked && interaction === 1 && ENGINE.playerId === 1) ||
            (ENGINE.triangleClicked && interaction === 2)) {
                spinning[0].rotation.y -= 0.2;
                if (spinning[0].rotation.y <= 0) {
                    spinning[0].rotation.y = 6.3;
                }
                ENGINE.currentEvents.push("spinning0 " + spinning[0].rotation.y);
                if (spinning[0].rotation.y > 2.7 && spinning[0].rotation.y < 3.5) {
                    // ENGINE.removeFromCollidableMeshList(7);
                    ENGINE.collidableMeshList.find(m => m.name === "Collision7").position.z = -6.5;
                } else if (ENGINE.collidableMeshList.find(m => m.name === "Collision7")) {
                    // ENGINE.addBackToCollidableMeshList(7);
                    ENGINE.collidableMeshList.find(m => m.name === "Collision7").position.z = -4.5;
                }
        } else if ((ENGINE.triangleClicked && interaction === 4 && ENGINE.playerId === 0) ||
                   (ENGINE.triangleClicked && interaction === 4 && lastInteraction === 0)) {
            inSpinningMode = 0;
        } else if ((ENGINE.triangleClicked && interaction === 5 && ENGINE.playerId === 0) ||
                    ENGINE.triangleClicked && interaction === 5 && lastInteraction === 0) {
            inSpinningMode = -1;
            ENGINE.forceUpdatePlayer(new THREE.Vector3(0, 0, -23.5));
        } else if (ENGINE.triangleClicked && interaction === 3 && ENGINE.playerId === 0) {
            ENGINE.currentEvents.push("ropeValidation");
            ropeValidation[0] = true;
        } else if (ENGINE.triangleClicked && interaction === 6 && ENGINE.playerId === 1) {
            ENGINE.currentEvents.push("ropeValidation");
            ropeValidation[1] = true;
        } else if (interaction === 8) {
            let script = document.createElement("script");
            script.textContent = "showWinScreen();"
            document.head.appendChild(script);
        }
        if (ropeState === 1) {
            ropeClock.getElapsedTime();
        }
        if ((ropeValidation[0] === true || ropeValidation[1] === true) && ropeState === 0) {
            // console.log("Start");
            ropeClock.start();
            ropeState = 1;
        } else if (ropeValidation[0] === true && ropeValidation[1] === true && ropeState != 2) {
            // console.log("OPEN in time !!");
            ropeClock.stop();
            ropeState = 2;
            ENGINE.removeFromCollidableMeshList(20);
            ENGINE.scene.children.find(child => child.name === "world").children.find(child => child.name === "Rope").children.forEach((rope) => {
                rope.visible = true;
            })
        } else if (ropeClock.elapsedTime >= 1) {
            // console.log("Reset");
            ropeClock.stop();
            ropeState = 0;
            ropeClock.elapsedTime = 0;
            ropeValidation[0] = false;
            ropeValidation[1] = false;
        }
        if (lastPlayerPosition && !lastPlayerPosition.equals(ENGINE.playerModels[ENGINE.playerId].position)) {
            if (interaction === 1 && ENGINE.playerId === 1) {
                interactions[0].visible = true;
            } else if (interaction === 2) {
                interactions[1].visible = true;
            } else if ((interaction === 4 && ENGINE.playerId === 0 && ENGINE.collidableMeshList.find(m => m.name === "Collision7").position.z === -6.5 && inSpinningMode === -1) ||
                        (interaction === 4 && lastInteraction === 0 && ENGINE.collidableMeshList.find(m => m.name === "Collision7").position.z === -6.5 && inSpinningMode === -1)) {
                interactions[2].visible = true;
            } else if ((interaction === 5 && ENGINE.playerId === 0 && inSpinningMode === 0) ||
                        (interaction === 5 && lastInteraction === 0 && inSpinningMode === 0)) {
                interactions[3].visible = true;
            } else if (interaction === 3 && ENGINE.playerId === 0){
                interactions[4].visible = true;
            } else if (interaction === 6 && ENGINE.playerId === 1){
                interactions[5].visible = true;
            } else {
                for (let i = 0; i < interactions.length; i++) {
                    interactions[i].visible = false;
                }
            }
            isCollide = ENGINE.collision();
            if (isCollide && inSpinningMode === -1) {
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
        if (inSpinningMode >= 0) {
            ENGINE.forceUpdatePlayer(
                new THREE.Vector3(
                    spinning[inSpinningMode].position.x + Math.sin(spinning[inSpinningMode].rotation.y + Math.PI) * 6,
                    ENGINE.playerModels[ENGINE.playerId].position.y,
                    spinning[inSpinningMode].position.z + Math.cos(spinning[inSpinningMode].rotation.y + Math.PI) * 6
                )
            );
            // ENGINE.playerModels[ENGINE.playerId].updateMatrixWorld();
        } else {
            ENGINE.updatePlayer(ENGINE.playerModels[ENGINE.playerId].position);
        }
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

    const positionsAttr = snowParticles.geometry.getAttribute('position');

    for (let i = 0; i < snowCount; i++) {
        positionsAttr.array[i * 3 + 1] -= velocities[i];

        if (positionsAttr.array[i * 3 + 1] < -5) {
            positionsAttr.array[i * 3 + 1] = 30 + Math.random() * 10;
        }
    }
    requestAnimationFrame(animate);
    if (now - lastTime < ENGINE.interval)
        return;
    lastTime = now;
    positionsAttr.needsUpdate = true;
    analyseEvents();
    ENGINE.triangleReset();
    ENGINE.controls.update();
    ENGINE.renderer.render(ENGINE.scene, ENGINE.camera);
}

export function game() {
    const ambientLight = new THREE.AmbientLight(0xaaccff, 2.0);
    ENGINE.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xE4EEFF, 3.0);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;

    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0001;

    ENGINE.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0xaaccff, 0xddeeff, 1.0);
    ENGINE.scene.add(hemiLight);

    const pointLight = new THREE.PointLight(0xaaccff, 0.5, 100);
    pointLight.position.set(0, 3, 0);
    ENGINE.scene.add(pointLight);

    const sky = new Sky();
    sky.scale.setScalar(5000);

    const effectController = {
        turbidity: 1.0,
        rayleigh: 2.5,
        mieCoefficient: 0.002,
        mieDirectionalG: 0.6,
        elevation: 70,
        azimuth: 180,
    };

    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);
    const sunPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;
    uniforms['sunPosition'].value = sunPosition;

    ENGINE.scene.add(sky);


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

    loader.load("assets/models/mine/letruc.glb", function (gltf) {
        gltf.scene.scale.set(1.2, 1.2, 1.2);
        gltf.scene.position.set(0, -2.17, -11.6);
        gltf.scene.rotation.set(0, 6.3, 0);
        spinning.push(gltf.scene);
        ENGINE.scene.add(spinning[0]);
    }, undefined, function (error) {
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

    loader.load("assets/models/mine/world.glb", function (gltf) {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                if (child.name.startsWith("Collision") || child.name.startsWith("Interaction")) {
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

    const snowTexture = new THREE.TextureLoader().load('assets/textures/snowball.png');

    const snowMaterial = new THREE.PointsMaterial({
        size: 0.25,
        map: snowTexture,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        opacity: 0.8
    });

    let snowGeometry = new THREE.BufferGeometry();

    const gridX = 3;
    const gridZ = 6;
    const snowPerTile = 40;
    const positions = [];
    const tileSize = 20;
    snowCount = gridX * gridZ * snowPerTile;

    for (let gx = 0; gx < gridX; gx++) {
        for (let gz = 0; gz < gridZ; gz++) {
            const offsetX = (gx - gridX / 2) * tileSize;
            const offsetZ = (gz - gridZ / 2) * tileSize;

            for (let i = 0; i < snowPerTile; i++) {
                const x = offsetX + (Math.random() - 0.5) * tileSize;
                const y = Math.random() * 30 + 10;
                const z = offsetZ + (Math.random() - 0.5) * tileSize;
                positions.push(x, y, z);
                velocities.push(0.01 + Math.random() * 0.02);
            }
        }
    }

    snowGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    );

    snowParticles = new THREE.Points(snowGeometry, snowMaterial);
    ENGINE.scene.add(snowParticles);

    ENGINE.addJoystick();
    ENGINE.addTriangle();
    ENGINE.addMuteButton();
    ENGINE.enableResize();
    animate();
}
