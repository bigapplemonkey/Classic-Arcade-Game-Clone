/* Engine.js
 * This file provides the game loop functionality (update entities and render),
 * draws the initial game board on the screen, and then calls the update and
 * render methods on your player and enemy objects (defined in your app.js).
 *
 * A game engine works by drawing the entire game screen over and over, kind of
 * like a flipbook you may have created as a kid. When your player moves across
 * the screen, it may look like just that image/character is moving or being
 * drawn but that is not the case. What's really happening is the entire "scene"
 * is being drawn over and over, presenting the illusion of animation.
 *
 * This engine is available globally via the Engine variable and it also makes
 * the canvas' context (ctx) object globally available to make writing app.js
 * a little simpler to work with. 495 530
 */

var Engine = (function(global) {

    /* Predefine the variables we'll be using within this scope,
     * create the canvas element, grab the 2D context for that canvas
     * set the canvas elements height/width and add it to the DOM.
     */

    // DOM manipulation variables
    var doc = global.document,
        win = global.window;

    // Game object instances
    var background,
        parallBackground,
        ship,
        enemyPool,
        enemyBulletPool,
        prize;

    //Game general variables
    var lifes,
        score,
        gameIteration,
        levelIterations = 3,
        level,
        lastTime,
        level1Config,
        // TODO: implement difficulty selection
        difficultyLevels = { easy: 0.02, medium: 0.3, difficult: 0.45 };

    // For collision detection
    var quadTree;

    // Sound object instances and variables
    var deadPool,
        explosionPool,
        laserPool,
        variousSounds = { prizeSound: 0.3, gameOverSound: 0.3, levelUp: 0.6 },
        variousSoundsPool = {},
        checkAudio;

    // For visual manipulation
    var ctxs = {},
        lifeImages = [],
        canvasIDs = ['parallBackground', 'background', 'prize', 'main', 'spaceship'],
        canvasWidth = 720,
        canvasHeight = 432;




    /* This function serves as the kickoff point for the game loop itself
     * and handles properly calling the update and render methods.
     */
    function main() {
        /* Get our time delta information which is required if your game
         * requires smooth animation. Because everyone's computer processes
         * instructions at different speeds we need a constant value that
         * would be the same for everyone (regardless of how fast their
         * computer is) - hurray time!
         */
        var now = Date.now(),
            dt = (now - lastTime) / 1000.0;

        /* Call our update/render functions, pass along the time delta to
         * our update function since it may be used for smooth animation.
         */
        update(dt);

        /* Set our lastTime variable which is used to determine the time delta
         * for the next time this function is called.
         */
        lastTime = now;

        if (timeIdle > 10) {
            doc.getElementById('progress-screen').style.display = 'block';
            return;
        }

        if (lifes < 1) {
            return;
        }
        /* Use the browser's requestAnimationFrame function to call this
         * function again as soon as the browser is able to draw another frame.
         */
        requestAnimFrame(main);

    }

    /* This function does some initial setup that should only occur once,
     * particularly setting the lastTime variable that is required for the
     * game loop.
     */
    function init() {
        // Audio files
        laserPool = new SoundPool(10, 'laser');
        global.laserPool = laserPool;
        explosionPool = new SoundPool(20, 'explosion');
        deadPool = new SoundPool(2, 'dead');

        for (var key in variousSounds) {
            if (variousSounds.hasOwnProperty(key)) {
                variousSoundsPool[key] = new Audio('sounds/' + key + '.mp3');
                variousSoundsPool[key].volume = variousSounds[key];
                variousSoundsPool[key].load();
            }
        }

        // Initializes the 5 canvas in canvasIDs
        var gameContainer = doc.getElementById('game-container');
        for (var i in canvasIDs) {
            if (canvasIDs.hasOwnProperty(i)) {
                var canvas = doc.createElement('canvas');
                ctxs[canvasIDs[i]] = canvas.getContext('2d');
                canvas.id = canvasIDs[i];
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                canvas.className = canvasIDs[i];
                canvas.innerHTML = i === 0 ? 'Your browser does not support canvas. Please try again with a different browser.' : '';
                gameContainer.appendChild(canvas);
            }
        }

        // Caches the life images
        for (var k = 1; k < 4; k++) {
            lifeImages.push(doc.getElementById('life' + k));
        }

        checkAudio = win.setInterval(function() { checkReadyState(); }, 1000);

    }

    // Checks when audio ready so the game can be started.
    // Removes loading screen an display instructions once resourses are loaded
    function checkReadyState() {
        var isAudioReady = true;
        for (var key in variousSoundsPool) {
            if (variousSoundsPool[key].readyState !== 4) {
                isAudioReady = false;
            }
        }

        if (isAudioReady) {
            win.clearInterval(checkAudio);
            reset();
            doc.getElementById('loading').style.display = 'none';
            doc.getElementById('instructions').style.display = 'block';
        }
    }


    /* This function is called by main (our game loop) and itself calls all
     * of the functions which may need to update entity's data. Based on how
     * you implement your collision detection (when two entities occupy the
     * same space, for instance when your character should die), you may find
     * the need to add an additional function call here. For now, we've left
     * it commented out - you may or may not want to implement this
     * functionality this way (you could just implement collision detection
     * on the entities themselves within your app.js file).
     */
    function update(dt) {
        checkCollisions(dt);

        document.getElementById('score').innerHTML = score;
        document.getElementById('level').innerHTML = level;

        if (enemyPool.getPool().length === 0) {
            spawnWave();
        }

        updateEntities(dt);
    }

    // Start of collision detection algorithm
    // by inseting objects into quadtree
    function checkCollisions(dt) {
        quadTree.clear();
        quadTree.insert(ship);
        quadTree.insert(ship.bulletPool.getPool());
        quadTree.insert(enemyPool.getPool());
        quadTree.insert(prize);
        quadTree.insert(enemyBulletPool.getPool());

        detectCollision(dt);
    }

    // Detects the collisiong of surrounding objects
    // in the quadtree and handles collisions after
    function detectCollision(dt) {
        var objects = [];
        var collidingObjects = [];

        quadTree.getAllObjects(objects);

        for (var x = 0, len = objects.length; x < len; x++) {
            var obj = [];
            quadTree.findObjects(obj, objects[x]);

            for (var y = 0, length = obj.length; y < length; y++) {

                // DETECT COLLISION ALGORITHM
                if (objects[x].collidableWith === obj[y].type &&
                    (objects[x].x < obj[y].x + obj[y].width &&
                        objects[x].x + objects[x].width > obj[y].x &&
                        objects[x].y < obj[y].y + obj[y].height &&
                        objects[x].y + objects[x].height > obj[y].y)) {
                    objects[x].isColliding = true;
                    obj[y].isColliding = true;

                    collidingObjects.push(objects[x].type);
                    collidingObjects.push(obj[y].type);
                }
            }
        }

        // Handles updates if any object collision
        if (collidingObjects.indexOf('enemyBullet') > -1) {
            lifeImages[lifes - 1].className += ' dead';
            lifes -= 1;
            if (lifes > 0) {
                deadPool.get();

                // Clears enemy bullets
                ctxs.spaceship.clearRect(0, 0, canvasWidth, canvasHeight);
                ctxs.main.clearRect(0, 0, canvasWidth, canvasHeight);
                enemyBulletPool = new Pool(50, ctxs.main, 'enemyBullet');
                global.enemyBulletPool = enemyBulletPool;

                // Redraw ship
                ship = new Ship(canvasWidth / 2, canvasHeight / 4 * 3, ctxs.spaceship, ctxs.main);
                ship.draw();
            } else {
                gameOver();
            }
        }

        if (collidingObjects.indexOf('bullet') > -1) {
            score += 100;
            explosionPool.get();
        }

        if (collidingObjects.indexOf('prize') > -1) {
            if (prize.extraLife) {
                lifeImages[lifes].className = '';
                lifes += 1;
            } else {
                score += 500;
            }

            variousSoundsPool.prizeSound.play();
            spawnPrizeOrLife(dt);
            ship.isColliding = false;
        }
    }

    /* This is called by the update function and loops through all of the
     * objects within your allEnemies array as defined in app.js and calls
     * their update() methods. It will then call the update function for your
     * player object. These update methods should focus purely on updating
     * the data/properties related to the object. Do your drawing in your
     * render methods.
     */
    function updateEntities(dt) {
        background.draw(dt);
        parallBackground.draw(dt);
        ship.move(dt);
        ship.bulletPool.animate(dt);
        enemyPool.animate(dt);
        enemyBulletPool.animate(dt);

        spawnPrizeOrLife(dt);
    }

    // Spawns a new wave of enemies or a boss enemy according to game iteration,
    // Increases level according to game iteration - levelUp()
    function spawnWave() {
        gameIteration += 1;
        if ((gameIteration - 1) % levelIterations === 0) {
            levelUp();
        }

        var height = enemyPool.pool[0].height;
        var width = enemyPool.pool[0].width;

        var x = 95;
        var y = -height;
        var spacer = y * 1.5;
        var speed = level1Config.enemySpeed;

        if (gameIteration % levelIterations === 0) {
            enemyPool.get(x, -100, speed, 'big', level1Config.bigEnemyFireRate, level1Config.bigEnemyLifes);
        } else {
            for (var i = 1; i <= 24; i++) {
                enemyPool.get(x, y, speed, 'small', level1Config.smallEnemyFireRate, 0);
                x += width + 30;
                if (i % 8 === 0) {
                    x = 95;
                    y += spacer;
                }
            }
        }
    }

    // Handles updates when level increases
    // Adds difficulty based on the level
    function levelUp() {
        ++level;
        if (level > 1) {
            variousSoundsPool.levelUp.play();

            level1Config.prizeSpeed = (difficultyLevels.easy + 1) * level1Config.prizeSpeed;
            level1Config.enemySpeed = (difficultyLevels.easy + 1) * level1Config.enemySpeed;
            level1Config.smallEnemyFireRate = level1Config.smallEnemyFireRate + 1;
            level1Config.bigEnemyFireRate = level1Config.bigEnemyFireRate + 3;
            level1Config.bigEnemyLifes = level1Config.bigEnemyLifes + 3;

        }
    }

    // Spawns a new prize or life according to some
    // operations with random numbers
    function spawnPrizeOrLife(dt) {
        var speed = level1Config.prizeSpeed;
        if (gameIteration > 0) {
            if (prize.draw(dt)) {
                // Put prize off canvas if taken
                prize.y = prize.isColliding ? 900 : prize.y;

                var chance = Math.floor(Math.random() * 1600);

                if (chance <= 1 && lifes < 3) {
                    prize = new Prize(0, 0, ctxs.prize, true);
                    prize.spawn(speed);
                } else if (chance < 5) {
                    prize = new Prize(0, 0, ctxs.prize, false);
                    prize.spawn(speed);
                }
            }
        } else {
            prize = new Prize(0, 0, ctxs.prize, false);
            prize.spawn(speed);
        }
    }


    // Handles game-over updates
    function gameOver() {
        variousSoundsPool.gameOverSound.play();
        doc.getElementById('game-over').style.display = 'block';
    }


    // Adds event listener for start button
    doc.getElementById('start').onclick = function() {
        doc.getElementById('progress-screen').style.display = 'none';
        reset();
        lastTime = Date.now();
        main();
    };

    // Adds event listener for restart button
    doc.getElementById('restart').onclick = function() {
        doc.getElementById('game-over').style.display = 'none';
        reset();
        lastTime = Date.now();
        main();
    };

    /**
     * requestAnim shim layer by Paul Irish
     * Finds the first API that works to optimize the animation loop,
     * otherwise defaults to setTimeout().
     */
    global.requestAnimFrame = (function() {
        return win.requestAnimationFrame ||
            win.webkitRequestAnimationFrame ||
            win.mozRequestAnimationFrame ||
            win.oRequestAnimationFrame ||
            win.msRequestAnimationFrame ||
            function( /* function */ callback, /* DOMElement */ element) {
                win.setTimeout(callback, 1000 / 60);
            };
    })();

    /* This function does nothing but it could have been a good place to
     * handle game reset states - maybe a new game menu or a game over screen
     * those sorts of things. It's only called once by the init() method.
     */
    function reset() {
        score = 0;
        lifes = 3;
        gameIteration = 0;
        level = 0;
        level1Config = {
            enemySpeed: 93,
            smallEnemyFireRate: 1,
            bigEnemyFireRate: 8,
            bigEnemyLifes: 5,
            prizeSpeed: 70
        };

        // Clears canvas
        for (var i in canvasIDs) {
            if (canvasIDs.hasOwnProperty(i)) {
                ctxs[canvasIDs[i]].clearRect(0, 0, canvasWidth, canvasHeight);
            }
        }

        // Resets life images' classes
        for (var j = 0; j < 3; j++) {
            lifeImages[j].className = '';
        }

        // Intializes game objects
        background = new Background(0, 0, ctxs.background);
        parallBackground = new Background(0, 0, ctxs.parallBackground, true);
        ship = new Ship(canvasWidth / 2, canvasHeight / 4 * 3, ctxs.spaceship, ctxs.main);
        enemyPool = new Pool(24, ctxs.main, 'enemy');
        enemyBulletPool = new Pool(50, ctxs.main, 'enemyBullet');
        global.enemyBulletPool = enemyBulletPool;


        spawnPrizeOrLife();

        // Starts QuadTree
        quadTree = new QuadTree({ x: 0, y: 0, width: canvasWidth, height: canvasHeight });

        ship.draw();
        timeIdle = 0;
    }

    /* Go ahead and load all of the images we know we're going to need to
     * draw our game level. Then set init as the callback method, so that when
     * all of these images are properly loaded our game will start.
     */
    Resources.load([
        'images/background.png',
        'images/parallelBackground.png',
        'images/bullet.png',
        'images/enemyBullet.png',
        'images/ship.png',
        'images/enemy.png',
        'images/bossEnemy1.png',
        'images/bossEnemy2.png',
        'images/bossEnemy3.png',
        'images/spaceman.png',
        'images/life.png'
    ]);
    Resources.onReady(init);

})(this);