// wheel.js - Wheel spinning mechanics and results

let wheelState = {
    isSpinning: false,
    wheelType: null,
    onComplete: null,
    rotation: 0
};

function getShadowWheelConfig() {
    const state = getState();
    const player = state.players.find(p => p.id === state.playerId);
    const shadowTurns = player.shadowTurns || 1;

    const wheel = [
        { label: 'Invite Friend', color: '#4a7043' },
        { label: '-1 Gold', color: '#703434' }
    ];

    const returnHomeCount = Math.min(shadowTurns, 6);
    for (let i = 0; i < returnHomeCount; i++) {
        wheel.push({ label: 'Return Home', color: '#4a7043' });
    }

    const nothingCount = 8 - wheel.length;
    for (let i = 0; i < nothingCount; i++) {
        wheel.push({ label: 'Nothing', color: '#2b2b2b' });
    }

    return wheel;
}

function showWheel(wheelType, onComplete) {
    const state = getState();
    wheelState.wheelType = wheelType;
    wheelState.onComplete = onComplete;
    wheelState.rotation = 0;
    document.getElementById('wheel-modal').style.display = 'flex';
    document.getElementById('wheel-container').style.display = 'flex';
    drawWheel();

    const spinButton = document.getElementById('spin-button');
    if (state.currentPlayer === state.playerId) {
        spinButton.style.display = 'block';
        spinButton.disabled = false;
        spinButton.innerText = 'Click to Spin';
    } else {
        spinButton.style.display = 'none';
    }

    document.getElementById('wheel-result').style.display = 'none';
}

function drawWheel() {
    const svg = document.getElementById('wheel-svg');
    svg.innerHTML = '';

    let wheelData;
    if (wheelState.wheelType === 'shadow') {
        wheelData = getShadowWheelConfig();
    } else {
        wheelData = wheelConfig[wheelState.wheelType];
    }

    const segmentAngle = 360 / wheelData.length;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', 'wheel-group');
    group.style.transform = `rotate(0deg)`;
    group.style.transformOrigin = '200px 200px';
    group.style.transition = 'none';

    wheelData.forEach((segment, index) => {
        const startAngle = (index * segmentAngle) * (Math.PI / 180);
        const endAngle = ((index + 1) * segmentAngle) * (Math.PI / 180);

        const x1 = 200 + 150 * Math.cos(startAngle - Math.PI / 2);
        const y1 = 200 + 150 * Math.sin(startAngle - Math.PI / 2);
        const x2 = 200 + 150 * Math.cos(endAngle - Math.PI / 2);
        const y2 = 200 + 150 * Math.sin(endAngle - Math.PI / 2);

        const largeArc = segmentAngle > 180 ? 1 : 0;

        const pathData = `M 200 200 L ${x1} ${y1} A 150 150 0 ${largeArc} 1 ${x2} ${y2} Z`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', segment.color);
        path.setAttribute('stroke', '#000');
        path.setAttribute('stroke-width', '2');

        group.appendChild(path);

        const textAngle = (index + 0.5) * segmentAngle;
        const textRad = textAngle * (Math.PI / 180);
        const textX = 200 + 85 * Math.cos(textRad - Math.PI / 2);
        const textY = 200 + 85 * Math.sin(textRad - Math.PI / 2);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', textX);
        text.setAttribute('y', textY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '10');
        text.setAttribute('font-weight', 'bold');
        text.textContent = segment.label;

        group.appendChild(text);
    });

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '200');
    circle.setAttribute('cy', '200');
    circle.setAttribute('r', '30');
    circle.setAttribute('fill', '#d4a017');
    circle.setAttribute('stroke', '#000');
    circle.setAttribute('stroke-width', '2');

    const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerText.setAttribute('x', '200');
    centerText.setAttribute('y', '200');
    centerText.setAttribute('text-anchor', 'middle');
    centerText.setAttribute('dominant-baseline', 'middle');
    centerText.setAttribute('fill', '#2b2b2b');
    centerText.setAttribute('font-size', '14');
    centerText.setAttribute('font-weight', 'bold');
    centerText.textContent = 'SPIN';

    svg.appendChild(group);
    svg.appendChild(circle);
    svg.appendChild(centerText);
}

function spinWheel() {
    if (wheelState.isSpinning) return;

    wheelState.isSpinning = true;
    document.getElementById('spin-button').disabled = true;
    document.getElementById('spin-button').innerText = 'Spinning...';

    let wheelData;
    if (wheelState.wheelType === 'shadow') {
        wheelData = getShadowWheelConfig();
    } else {
        wheelData = wheelConfig[wheelState.wheelType];
    }

    const segmentAngle = 360 / wheelData.length;

    const startTime = Date.now();
    const duration = 3000;
    const randomSegment = Math.floor(Math.random() * wheelData.length);
    const randomOffset = Math.random() * segmentAngle;
    const finalRotation = 10 * 360 + randomSegment * segmentAngle + randomOffset;

    const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRotation = finalRotation * easeOut;

        const wheelGroup = document.getElementById('wheel-group');
        if (wheelGroup) {
            wheelGroup.style.transform = `rotate(${currentRotation}deg)`;
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            wheelState.isSpinning = false;
            document.getElementById('spin-button').style.display = 'none';
            document.getElementById('spin-button').disabled = false;

            const normalizedRotation = finalRotation % 360;
            const segmentAtTop = Math.floor((360 - normalizedRotation) / segmentAngle) % wheelData.length;
            const result = wheelData[segmentAtTop].label;

            document.getElementById('wheel-result').innerText = `Result: ${result}`;
            document.getElementById('wheel-result').style.display = 'block';

            setTimeout(() => {
                document.getElementById('wheel-modal').style.display = 'none';
                if (wheelState.onComplete) {
                    wheelState.onComplete(result);
                }
            }, 1500);
        }
    };

    requestAnimationFrame(animate);
}