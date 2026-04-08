import * as ENGINE from 'engine';
import * as THREE from 'three';
import * as CONTROLS from 'engine/controls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // should not be here, should be used in engine.js and have a function to load model
import { Sky } from 'three/addons/objects/Sky.js'; // same as above

let lastPlayerPosition;

let lastTime = 0;

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
    ENGINE.setPerspectiveCamera(80 - Math.min(window.innerWidth / window.innerHeight - 1, 0.5) * 30, // adapt fov to the screen size
    20); // adapt distance to the screen size
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

    const sky = new Sky();
    sky.scale.setScalar(200);

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

    loader.load("assets/models/empty/plane.glb", function (gltf) {
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

    ENGINE.addJoystick();
    ENGINE.addTriangle();
    ENGINE.addMuteButton();
    ENGINE.enableResize();
    animate();
}
