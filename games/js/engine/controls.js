import * as ENGINE from 'engine';

export let joyManager;
export let joystickAngle = 0.0;
export let joystickPower = 0;

export function addJoystick() {
    document.getElementById("joystickWrapper1").style.display = "block";
    const options = {
        zone: document.getElementById('joystickWrapper1'),
        size: 120,
        multitouch: true,
        maxNumberOfNipples: 2,
        mode: 'static',
        restJoystick: true,
        shape: 'circle',
        position: { top: '60px', left: '60px' },
        dynamicPage: true,
    }
    joyManager = nipplejs.create(options);

    joyManager['0'].on('move', function (evt, data) {
        const forward = data.distance;

        if (forward > 0) {
            joystickPower = Math.abs(forward) / 100;
        } else if (forward < 0) {
            joystickPower = -Math.abs(forward) / 100;
        }
        joystickAngle = data.angle.radian + 1.57;
    })

    joyManager['0'].on('end', function (evt) {
        joystickPower = 0
    })
}

export function addTriangle() {
    document.getElementById("joystickWrapper2").style.display = "block";
    document.getElementById("jumpButton").addEventListener("click", function (evt) {
        ENGINE.triangleClickedTrue();
    });
}

export function addMuteButton() {
    document.getElementById("microphone").addEventListener("click", function (evt) {
        ENGINE.invertMute();
    });
}
