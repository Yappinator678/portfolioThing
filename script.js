const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const fovSlider = document.getElementById("fov");
const fovSliderReading = document.getElementById("fovReading");
const xReading = document.getElementById("xReading");
const zReading = document.getElementById("zReading");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.9;
    draw();
}


function drawLine(x1,y1,x2,y2) {
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
}


class Mesh {
    constructor(points,lines) {
        this.points = points;
        this.lines = lines;
    }

    static cuboid(x1,y1,z1,x2,y2,z2){
        let points = [[x1, y1, z1], [x2, y1, z1], [x2, y2, z1], [x1, y2, z1],
                       [x1, y1, z2], [x2, y1, z2], [x2, y2, z2], [x1, y2, z2]];
        let lines = [[0, 1], [1, 2], [2, 3], [3, 0],
                      [4, 5], [5, 6], [6, 7], [7, 4],
                      [0, 4], [1, 5], [2, 6], [3, 7]];
        return new Mesh(points,lines);
    }

    translate(tX,tY,tZ){
        return new Mesh(this.points.map(p => [p[0] + tX, p[1] + tY, p[2] + tZ]), this.lines);
    }

    rotate(rX,rY,rZ) {
        let newPoints = [];
        
        for (var point of this.points) {
            let newPoint = point;

            // rotate around x
            newPoint = [newPoint[0],
                        newPoint[1] * Math.cos(rX) - newPoint[2] * Math.sin(rX),
                        newPoint[1] * Math.sin(rX) + newPoint[2] * Math.cos(rX)];

            // rotate around y
            newPoint = [newPoint[0] * Math.cos(rY) + newPoint[2] * Math.sin(rY),
                        newPoint[1],
                        newPoint[2] * Math.cos(rY) - newPoint[0] * Math.sin(rY)];
            
            // rotate around z
            newPoint = [newPoint[0] * Math.cos(rZ) - newPoint[1] * Math.sin(rZ),
                        newPoint[0] * Math.sin(rZ) + newPoint[1] * Math.cos(rZ),
                        newPoint[2]];

            newPoints.push(newPoint);
        }

        return new Mesh(newPoints, this.lines);
    }

    render(fov, near) {
        let focalLength = (canvas.height / 2) / Math.tan(fov / 2);
        for (var line of this.lines) {
            let [i1, i2] = line;
            let [x1, y1, z1] = this.points[i1];
            let [x2, y2, z2] = this.points[i2];

            if (z1 < near && z2 < near) {
                continue;
            }

            if (z1 < near) {
                let t = (near - z1) / (z2 - z1);
                let x_clipped = x1 + t * (x2 - x1);
                let y_clipped = y1 + t * (y2 - y1);
                [x1, y1, z1] = [x_clipped, y_clipped, near];
            }

            if (z2 < near) {
                let t = (near - z2) / (z2 - z1);
                let x_clipped = x2 + t * (x1 - x2);
                let y_clipped = y2 + t * (y1 - y2);
                [x2, y2, z2] = [x_clipped, y_clipped, near];
            }

            let midX = canvas.width / 2;
            let midY = canvas.height / 2;

            let screenX1 = (x1 / z1 * focalLength) + midX;
            let screenY1 = (y1 / z1 * focalLength) + midY;
            let screenX2 = (x2 / z2 * focalLength) + midX;
            let screenY2 = (y2 / z2 * focalLength) + midY;

            drawLine(screenX1, screenY1, screenX2, screenY2);
        }
    }
}


class Scene {
    constructor(meshes) {
        this.meshes = meshes;
    }

    render(fov, near) {
        for (var mesh of this.meshes) {
            mesh.render(fov, near);
        }
    }

    translate(tX,tY,tZ) {
        return new Scene(this.meshes.map(m => m.translate(tX,tY,tZ)));
    }

    rotate(rX,rY,rZ) {
        return new Scene(this.meshes.map(m => m.rotate(rX,rY,rZ)));
    }
}


class Player {
    constructor(x,z,angle,vel,aVel) {
        this.x = x;
        this.z = z;
        this.yaw = angle;
        this.pitch = 0;
        this.vel = vel;
        this.aVel = aVel;
        this.movingForward = false;
        this.movingBackward = false;
        this.movingLeft = false;
        this.movingRight = false;
        this.sensitivity = 0.015;

    }

    update() {
        this.x += this.vel * ((this.movingForward - this.movingBackward) * Math.sin(this.yaw) + (this.movingRight - this.movingLeft) * Math.cos(this.yaw));  
        this.z += this.vel * ((this.movingForward - this.movingBackward) * Math.cos(this.yaw) + (this.movingLeft - this.movingRight) * Math.sin(this.yaw));

        
        xReading.textContent = this.x;
        zReading.textContent = this.z;
    }

    handleMouseMove(e) {
        if (document.pointerLockElement === canvas) {
            const movementX = e.movementX;
            const movementY = e.movementY;

        this.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitch - movementY * this.sensitivity));
        this.yaw += movementX * this.sensitivity;
        }
    }

    handleKey(key, action) {
        var moving = Boolean(action);

        switch (key.toLowerCase()) {
            case "w":
                this.movingForward = moving;
                break;
            case "s":
                this.movingBackward = moving;
                break;
            case "a":
                this.movingLeft = moving;
                break;
            case "d":
                this.movingRight = moving;
                break;
        }

    }

    handleKeyDown(e) {
        this.handleKey(e.key, 1);
    }

    handleKeyUp(e) {
        this.handleKey(e.key, 0);
    }
} 


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);   
    let translatedScene = scene.translate(-player.x,0,-player.z);
    //let rotatedScene = translatedScene.rotate(0,0,0);
    let rotatedScene = translatedScene.rotate(0,-player.yaw,0);
    rotatedScene = rotatedScene.rotate(-player.pitch,0,0);
    rotatedScene.render((fovSlider.value/180) * Math.PI,5);
}   

function update() {
    player.update();
}

function tick() {
    update();
    draw();
}


var cube = Mesh.cuboid(50,50,50,-50,-50,-50).translate(0,0,200);
var scene = new Scene([cube]);
var player = new Player(0,0,0,6,Math.PI/60);

resizeCanvas();

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (e) => player.handleKeyDown(e));
window.addEventListener("keyup", (e) => player.handleKeyUp(e));
fovSlider.addEventListener("input", (e) => {
    fovSliderReading.textContent = fovSlider.value;
});
canvas.addEventListener("click", () => canvas.requestPointerLock());
window.addEventListener("mousemove", (e) => player.handleMouseMove(e));

setInterval(tick,30);

