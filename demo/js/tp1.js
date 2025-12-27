import * as THREE from 'three';
import { OrbitControls } from 'orbitcontrols';

function GenRandomNum(a, b) {
    return Math.random() * (b - a) + a;
}

function MakeCube(width = 1, height = 1, depth = 1, color = 0x101010, texture_name = ""){
    let geom = new THREE.BoxGeometry(width, height, depth);
    let mat;
    if (texture_name != ""){
        let texture = new THREE.TextureLoader().load(texture_name);
        mat = new THREE.MeshPhongMaterial({ map : texture});
    }else{
        mat = new THREE.MeshPhongMaterial({color: color})
    }
    return new THREE.Mesh( geom, mat );
}
function MakeSphere(radius = 1, width_segment = 1, height_segment = 1, color = 0xFFFFFF){
    let geom = new THREE.SphereGeometry(radius, width_segment, height_segment);
    let mat = new THREE.MeshPhongMaterial({color: color})
    return new THREE.Mesh( geom, mat );
}
function MakePlan(width = 1, height = 1, color = 0xFFFFFF, texture_name = ""){
    let geom = new THREE.PlaneGeometry( width, height );
    let mat;
    if (texture_name != ""){
        let texture = new THREE.TextureLoader().load(texture_name);
        mat = new THREE.MeshPhongMaterial({map : texture, side : THREE.DoubleSide} ); 
    }else{
        mat = new THREE.MeshPhongMaterial({color: color, side : THREE.DoubleSide} ); 
    }
    return new THREE.Mesh( geom, mat );
}

class AABBox {
    constructor() {
        this.min = new THREE.Vector3();
        this.max = new THREE.Vector3();
        this.pos = new THREE.Vector3();
    }

    initWithCube(cube) {
        this.pos = cube.position;
        let width = cube.geometry.parameters.width;
        let height = cube.geometry.parameters.height;
        let depth = cube.geometry.parameters.depth;
        this.min = new THREE.Vector3(this.pos.x - width / 2, this.pos.y - height / 2, this.pos.z - depth / 2);
        this.max = new THREE.Vector3(this.pos.x + width / 2, this.pos.y + height / 2, this.pos.z + depth / 2);
    }

    collision(anotherAabb) {
        if (this.max.x < anotherAabb.min.x || this.min.x > anotherAabb.max.x)
            return false;
        if (this.max.y < anotherAabb.min.y || this.min.y > anotherAabb.max.y)
            return false;
        if (this.max.z < anotherAabb.min.z || this.min.z > anotherAabb.max.z)
            return false;
        return true;
    }
}





let canvas = document.querySelector('#myCanvas');
let renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(1, 1, 1);
//camera.rotateY(Math.PI / 180 * 90); vu de coté pour voir les sphere disparaitre
scene.add(camera);

let ambientlight = new THREE.AmbientLight(0xFFFFFF, 4);
scene.add(ambientlight);

let DirectionalLight = new THREE.DirectionalLight(0XFFFFFF, 4);
DirectionalLight.position.set(4, 20, 10);
DirectionalLight.target.position.set(4,0,-1);
DirectionalLight.castShadow = true;
scene.add( DirectionalLight.target );


window.addEventListener('keydown', keydown_fun, false);

function keydown_fun(e){
    if (e.code == 'Space' && !hasPressedSpace){
        hasPressedSpace = true;
    }
}

let allSpheres = [];

function addsphere(nb, firstTime = 0) {
    for (let i = 0; i < nb; i++) {
        let s = MakeSphere(0.5, 3, 2);

        s.position.x = GenRandomNum(camera.position.x - 300, camera.position.x + 300);
        s.position.y = GenRandomNum(camera.position.y - 300, camera.position.y + 300);
        if (firstTime){
            s.position.z = GenRandomNum(camera.position.z - 700, camera.position.z);
        } else{
            s.position.z = GenRandomNum(camera.position.z - 800, camera.position.z - 400);

        }
        
        scene.add(s);
        allSpheres.push(s);
    }
}



function addCubes(n, start_height, x, z){
    for (let i = 0, heights = start_height; i < n; i++, heights += 10){
        let c = MakeCube(1,1,1, 0xFFFFFF, "assets/wood_box.jpg");

        c.position.x = x;
        c.position.z = z;
        c.position.y = heights;


        let c_aabb = new AABBox();
        
        c_aabb.initWithCube(c);


        cube_list.push(c);
        aabb_list.push(c_aabb);

        c.castShadow = true;
        scene.add(c);

        sound_already_played.push(false);

    }
}

let hasPressedSpace = false;
let startTime = undefined;
let elapsedTime = 0;

let LastCamMove, lastSphereAppear = undefined;
let sphereLimit = 1500;
let hasReachedFirstAnim = false;
let cameraResetDone = false;

let LastSpawnCubes = undefined;
let cube_spawn_counter = 0;
let LastCollisionCheck = undefined;
let cube_list = [];
let aabb_list = [];
let gravity = 0.5;
let LightHasBeenAdded  = false;



const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();

function playSound(path) {
    const sound = new THREE.Audio(listener);
    audioLoader.load(path, function(buffer) {
        sound.setBuffer(buffer);
        sound.setVolume(0.5);
        sound.play();
    });
}

let sound_already_played = [];



function animate(timestamp) {
    if (!hasReachedFirstAnim && hasPressedSpace) {
        document.getElementById('press_space').style.display = 'none';
        
        if (startTime == undefined) startTime = timestamp;
        elapsedTime = timestamp - startTime;


        if (LastCamMove == undefined) LastCamMove = elapsedTime;
        if (lastSphereAppear == undefined) lastSphereAppear = elapsedTime;


        if (elapsedTime - LastCamMove >= 10) {
            camera.position.z -= 4; 
            LastCamMove = elapsedTime;
        }

        for (let i = allSpheres.length - 1; i >= 0; i--) {
            if (allSpheres[i].position.z > camera.position.z) {
                scene.remove(allSpheres[i]); 
                allSpheres[i].geometry.dispose(); 
                allSpheres[i].material.dispose();
                allSpheres.splice(i, 1);
            }
        }

        if (allSpheres.length < sphereLimit && elapsedTime - lastSphereAppear >= 1000) {
            addsphere(500);
            lastSphereAppear = elapsedTime;
        }

        if (elapsedTime >= 5000) {
            hasReachedFirstAnim = true;
        }
    } 
	else if (hasReachedFirstAnim && hasPressedSpace){
        elapsedTime = timestamp - startTime;


		if (!cameraResetDone) {
            scene.remove(ambientlight);

			let controls = new OrbitControls(camera, renderer.domElement);

            camera.position.set(4, 3, 9);
            controls.target.set(4,3,-1);
            controls.update()
			cameraResetDone = true;

            camera.fov = 40;
            camera.updateProjectionMatrix();
			
			for (let i = allSpheres.length - 1; i >= 0; i--) {
				scene.remove(allSpheres[i]); 
				allSpheres[i].geometry.dispose(); 
				allSpheres[i].material.dispose();
				allSpheres.splice(i, 1);
				
			}
            let plan = MakePlan(100, 100, 0xFFFFFF, "assets/floor.jpg");
            plan.rotateX(-Math.PI / 180 * 90);
            plan.receiveShadow = true;
            scene.add(plan);
            
            let plan_mur = MakePlan(100, 100, 0xFFFFFF, "assets/floor.jpg");
            plan_mur.position.z -= 50;
            plan_mur.rotateZ(Math.PI / 180 * 90);
            plan_mur.receiveShadow = true;

            scene.add(plan_mur);       




		}

        if (LastCollisionCheck == undefined) LastCollisionCheck = elapsedTime;
        if (LastSpawnCubes == undefined) LastSpawnCubes = elapsedTime;

        if (elapsedTime >= 7000 && !LightHasBeenAdded){
            playSound("./audio/spotlight.mp3");
            scene.add(DirectionalLight);
            LightHasBeenAdded = true;
            elapsedTime = 0;
        }

        if (cube_spawn_counter < 3 && elapsedTime - LastSpawnCubes >= 1800 && elapsedTime >= 8000 && LightHasBeenAdded) {
            addCubes(5, 10, cube_spawn_counter*4, -1);
            cube_spawn_counter++;
            LastSpawnCubes = elapsedTime;
        }

        if (elapsedTime - LastCollisionCheck >= 10) {
            for (let i = 0; i < cube_list.length; i++) {
                if (cube_list[i].position.y >= 1) {
                    let isColliding = false;
        
                    for (let j = 0; j < i; j++) { 
                        if (aabb_list[i].collision(aabb_list[j])) {
                            isColliding = true;
                            if (sound_already_played[i] == false){
                                playSound('./audio/Stone_dig1.ogg');
                                sound_already_played[i] = true;
                            }
                            cube_list[i].position.y = aabb_list[j].max.y + cube_list[i].geometry.parameters.height / 2;
                            
                            break;
                        }
                    }
        
                    if (!isColliding) {
                        cube_list[i].position.y -= gravity;

                    }
                } else{
                    if (sound_already_played[i] == false){
                        playSound('./audio/Stone_dig1.ogg');
                        sound_already_played[i] = true;
                    }
                }
        
                aabb_list[i].initWithCube(cube_list[i]);
            }
        
            DirectionalLight.position.set(Math.cos(elapsedTime * 0.0005) * 20, 20, 10);
            
            LastCollisionCheck = elapsedTime;
        }
	} 

    if (hasPressedSpace){
        renderer.render(scene, camera);
        
    }
    requestAnimationFrame(animate);
}

addsphere(500, 1);
requestAnimationFrame(animate);
