// Drawable object
var Drawable = function(x, y, context, spriteString, speed, collidableWith, type) {
    //location of the image
    this.x = x;
    this.y = y;

    //sprite and canvas context
    this.context = context;
    this.sprite = Resources.get(spriteString);

    this.speed = speed;

    //image width/height used for collision detection
    this.width = this.sprite.width;
    this.height = this.sprite.height;

    //width/height used for off-canvas detection
    this.canvasWidth = 720;
    this.canvasHeight = 432;

    //other paremeter for collision detection
    this.collidableWith = collidableWith;
    this.type = type;
    this.isColliding = false;
};

// Define abstract functions to be implemented in child objects
Drawable.prototype.draw = function() {};

Drawable.prototype.move = function() {};

Drawable.prototype.isCollidableWith = function(object) {
    return (this.isCollidableWith === object.type);
};

// Background object
var Background = function(x, y, bgContext, parallel) {
    var spriteString = 'images/background.png';
    var speed = 40;
    if (parallel === true) {
        speed = 25;
        spriteString = 'images/parallelBackground.png';
    }

    Drawable.call(this, x, y, bgContext, spriteString, speed);
    this.parallel = parallel;
}

Background.prototype = Object.create(Drawable.prototype);

Background.prototype.constructor = Background;

// Implement abstract function
Background.prototype.draw = function(dt) {

    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.y += this.speed * dt;
    this.context.drawImage(this.sprite, this.x, this.y);

    this.context.drawImage(this.sprite, this.x, this.y - this.height + 2);

    if (!this.parallel) {
        this.context.drawImage(this.sprite, this.width - 2, this.y);
        this.context.drawImage(this.sprite, this.width, this.y - this.height);
    }

    if (this.y >= this.height) this.y = 0;
};

// Pool object. Holds bullet and enemy objects to to prevent garbage collection
var Pool = function(maxSize, objectContext, object) {
    this.size = maxSize;
    var pool = [];

    // Populates the pool array
    if (object === 'bullet' || object === 'enemyBullet') {
        for (var i = 0; i < this.size; i++) {
            var bullet = new Bullet(0, 0, objectContext, object);
            pool[i] = bullet;
        }
    } else if (object === 'enemy') {
        for (var i = 0; i < this.size; i++) {
            var enemy = new Enemy(objectContext);
            pool[i] = enemy;
        }
    }
    this.pool = pool;
};

// Grabs the last item in the list, initializes it and pushes it to the front
Pool.prototype.get = function(x, y, speed, type, fireRate, lifes) {
    if (!this.pool[this.size - 1].alive) {
        if (typeof type !== "undefined") {
            this.pool[this.size - 1].spawn(x, y, speed, type, fireRate, lifes)
        } else {
            this.pool[this.size - 1].spawn(x, y, speed);
        }
        this.pool.unshift(this.pool.pop());
    }
};

// Gets two bullets at once
Pool.prototype.getTwo = function(x1, y1, speed1, x2, y2, speed2) {
    if (!this.pool[this.size - 1].alive &&
        !this.pool[this.size - 2].alive) {
        this.get(x1, y1, speed1);
        this.get(x2, y2, speed2);
    }
};

//Draws in use bullets, and clears bullet off the screen
Pool.prototype.animate = function(dt) {
    for (var i = 0; i < this.size; i++) {
        // Only draw until we find a bullet that is not alive
        if (this.pool[i].alive) {
            if (this.pool[i].draw(dt)) {
                this.pool[i].clear();
                this.pool.push((this.pool.splice(i, 1))[0]);
            }
        } else
            break;
    }
};

// Returns array of alive objects
Pool.prototype.getPool = function() {
    var obj = [];
    for (var i = 0; i < this.size; i++) {
        if (this.pool[i].alive) {
            obj.push(this.pool[i]);
        }
    }
    return obj;
}

// Bullet object
var Bullet = function(x, y, bulletContext, object) {
    this.self = object;
    var spriteString = 'images/' + object + '.png';
    var collidableWith = object === "bullet" ? "enemy" : "ship";

    Drawable.call(this, x, y, bulletContext, spriteString, 0, collidableWith, object);
    this.alive = false; // True if the bullet is currently in use
};

Bullet.prototype = Object.create(Drawable.prototype);

Bullet.prototype.constructor = Bullet;

//bullet values
Bullet.prototype.spawn = function(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.alive = true;
};

// Returns true if the bullet moved off the screen so the the bullet is cleared by the pool
Bullet.prototype.draw = function(dt) {
    this.context.clearRect(this.x - 1, this.y - 1, this.width + 1, this.height + 1);
    this.y -= this.speed * dt;
    if (this.isColliding || (this.self === 'bullet' && this.y <= 0 - this.height) ||
        (this.self === 'enemyBullet' && this.y >= this.canvasHeight)) {
        return true;
    } else {
        this.context.drawImage(this.sprite, this.x, this.y);
        return false;
    }
};

// Resets the bullet values
Bullet.prototype.clear = function() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.alive = false;
    this.isColliding = false;
};


// Prize object
var Prize = function(x, y, bulletContext, extraLife) {
    var spriteString = 'images/enemy6.png';
    this.extraLife = false;
    if (extraLife === true) {
        this.extraLife = true;
        var spriteString = 'images/enemy7.png';
    }
    Drawable.call(this, x, y, bulletContext, spriteString, 80, "ship", "prize");
};

Prize.prototype = Object.create(Drawable.prototype);
Prize.prototype.constructor = Prize;

Prize.prototype.spawn = function(speed) {
    var margin = this.canvasWidth * 0.06;
    var minX = margin;
    var maxX = this.canvasWidth - margin;
    this.x = Math.floor(Math.random() * (maxX - minX + 1) + minX);
    this.y = -100;
    this.speed = speed;
};

Prize.prototype.draw = function(dt) {
    this.context.clearRect(this.x, this.y, this.width, this.height);
    this.y += this.speed * dt;
    if (this.isColliding || this.y >= this.canvasHeight) {
        return true;
    } else {
        this.context.drawImage(this.sprite, this.x, this.y);
        return false;
    }
};

Prize.prototype.clear = function() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.isColliding = false;
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
};


// Sound pool to use for the sound effects
var SoundPool = function(maxSize, object) {
    this.size = maxSize; // Max sounds allowed in the pool
    this.pool = [];
    this.currSound = 0;
    var soundString = "sounds/" + object + ".mp3";

    // Populates the pool array with the given sound
    for (var i = 0; i < this.size; i++) {
        var sound = new Audio(soundString);
        sound.volume = .20;
        sound.load();
        this.pool[i] = sound;
    }
};

// Plays a sound
SoundPool.prototype.get = function() {
    if (this.pool[this.currSound].currentTime == 0 || this.pool[this.currSound].ended) {
        this.pool[this.currSound].play();
    }
    this.currSound = (this.currSound + 1) % this.size;
};

// Ship object
var Ship = function(x, y, shipContext, bulletContext) {
    var spriteString = 'images/ship.png';

    Drawable.call(this, x, y, shipContext, spriteString, 200, "enemyBullet", "ship");
    this.x = this.x - (this.width / 2);
    this.y = this.y + (this.height * 2);
    this.bulletPool = new Pool(30, bulletContext, 'bullet');
    this.fireRate = 15;
    this.counter = 0;
    this.alive = true;
};

Ship.prototype = Object.create(Drawable.prototype);

Ship.prototype.constructor = Ship;

Ship.prototype.draw = function() {
    this.context.drawImage(this.sprite, this.x, this.y);
};

Ship.prototype.move = function(dt) {
    this.counter++;
    // Determine if the action is move action
    if (KEY_STATUS.left || KEY_STATUS.right ||
        KEY_STATUS.down || KEY_STATUS.up) {

        this.context.clearRect(this.x, this.y, this.width, this.height);

        if (KEY_STATUS.left) {
            this.x -= this.speed * dt;
            if (this.x <= 0) // Keep player within the screen
                this.x = 0;
        } else if (KEY_STATUS.right) {
            this.x += this.speed * dt;
            if (this.x >= this.canvasWidth - this.width)
                this.x = this.canvasWidth - this.width;
        } else if (KEY_STATUS.up) {
            this.y -= this.speed * dt;
            if (this.y <= this.canvasHeight / 4 * 3)
                this.y = this.canvasHeight / 4 * 3;
        } else if (KEY_STATUS.down) {
            this.y += this.speed * dt;
            if (this.y >= this.canvasHeight - this.height)
                this.y = this.canvasHeight - this.height;
        }
        // Finish by redrawing the ship
        if (!this.isColliding) {
            this.draw();
        } else this.alive = false;
    }
    if (KEY_STATUS.space && this.counter >= this.fireRate) {
        this.fire();
        this.counter = 0;
    }
};

// Fires two bullets
Ship.prototype.fire = function() {
    this.bulletPool.getTwo(this.x + 6, this.y, 175,
        this.x + 33, this.y, 175);
    laserPool.get();
};

/*
// Enemies our player must avoid
var Enemy = function(x, y, speed) {
    // Variables applied to each of our instances go here,
    // we've provided one for you to get started

    // The image/sprite for our enemies, this uses
    // a helper we've provided to easily load images
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.sprite = 'images/enemy-bug.png';
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function(dt) {
    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.x = this.x + this.speed * dt;
    if (this.x > 500) {
        // Initial enemy x-axis position
        this.x = -60;
        this.speed = Math.floor(Math.random() * 5 + 1) * 75;
    }
};

// Draw the enemy on the screen, required method for game
Enemy.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};*/

// Enemy object.
var Enemy = function(enemyContext) {
    var spriteString = 'images/enemy.png';

    Drawable.call(this, 0, 0, enemyContext, spriteString, 0, "bullet", "enemy");

    this.chance = 0;
    this.alive = false;
    this.lifes = 0;
};

Enemy.prototype = Object.create(Drawable.prototype);
Enemy.prototype.constructor = Enemy;

// Enemy values
Enemy.prototype.spawn = function(x, y, speed, type, fireRate, lifes) {
    this.x = x;
    this.y = y;

    this.finalSpeed = speed;
    this.speed = 125;
    this.speedX = 0;
    this.speedY = speed;

    this.leftEdge = this.x - 80;
    this.rightEdge = this.x + 80;

    this.startBottomEdge = this.y + 150;
    this.endBottomEdge = this.y + 300

    this.verticalMoving = true;

    this.type = 'small';
    this.alive = true;
    this.lifes = lifes;
    this.percentFire = fireRate;

    if (type === "big") {
        var margin = this.canvasWidth * 0.06;
        var minX = margin;
        var maxX = this.canvasWidth - margin;
        this.x = Math.floor(Math.random() * (maxX - minX + 1) + minX);
        this.type = 'big';
        this.leftEdge = 10
        this.rightEdge = this.canvasWidth - (2 * this.width) - 10;
    }
};

// Move the enemy
Enemy.prototype.draw = function(dt) {
    this.context.clearRect(this.x - 1, this.y - 1, this.width + 1, this.height + 1);
    this.x += this.speedX * dt;

    // Move vertically
    if (this.y <= this.endBottomEdge) this.y += this.speedY * dt;

    if (this.x <= this.leftEdge) this.speedX = this.speed;
    else if (this.x >= this.rightEdge + this.width) {
        this.speedX = -this.speed;
    }

    if (this.verticalMoving && this.y >= this.startBottomEdge) {
        console.log("here");
        this.speed = this.finalSpeed;
        this.speedY = 6;
        this.y -= 5;
        this.speedX = -this.speed;
        this.verticalMoving = false;
    }

    if (this.isColliding && this.lifes === 0) {
        // this.drawExplosion(dt);
        return true;
    } else {
        if (this.isColliding && this.type === 'big') {
            this.lifes -= 1;
            this.isColliding = false
        }
        this.context.drawImage(this.sprite, this.x, this.y);
        // Enemy has a chance to shoot every movement
        this.chance = Math.floor(Math.random() * 700);
        if (this.chance < this.percentFire) {
            this.fire();
        }
        return false;
    }
};

/*
 * Fires a bullet
 */
// Enemy.prototype.drawExplosion = function(dt) {
//     var explosionSprites = ['images/explosion1.png', 'images/explosion2.png', 'images/explosion3.png']
//     var test;
//     for (var i in explosionSprites) {
//         test = 1;
//         while(test < 20) {
//             console.log("here " + explosionSprites[i])
//             this.context.drawImage(Resources.get(explosionSprites[i]), this.x, this.y);
//             test += 1 * dt;
//         }
//         this.context.clearRect(this.x, this.y, Resources.get(explosionSprites[i]).width, Resources.get(explosionSprites[i]).height);

//     }
//     this.context.clearRect(this.x, this.y, Resources.get(explosionSprites[i]).width, Resources.get(explosionSprites[i]).height);

// }

// Fires bullets
Enemy.prototype.fire = function() {
    if (this.type === 'big') enemyBulletPool.getTwo((this.x + this.width / 2) + 6, this.y + this.height, -155, (this.x + this.width / 2) + 33, this.y + this.height, -155);
    else enemyBulletPool.get(this.x + this.width / 2, this.y + this.height, -155);
}


// Resets the enemy values
Enemy.prototype.clear = function() {
    this.x = 0;
    this.y = 0;

    this.speed = 0;
    this.speedX = 0;
    this.speedY = 0;

    this.alive = false;
    this.isColliding = false;
    this.lifes = 0;
    this.percentFire = .01;
};

/**
 * QuadTree object.
 *
 * The quadrant indexes are numbered as below:
 *     |
 *  1  |  0
 * —-+—-
 *  2  |  3
 *     |
 */
var QuadTree = function(boundBox, lvl) {
    this.maxObjects = 10;
    this.bounds = boundBox || {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };
    this.objects = [];
    this.nodes = [];
    this.level = lvl || 0;
    this.maxLevels = 5;
}

/*
 * Clears the quadTree and all nodes of objects
 */
QuadTree.prototype.clear = function() {
    this.objects = [];
    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].clear();
    }
    this.nodes = [];
};

/*
 * Get all objects in the quadTree
 */
QuadTree.prototype.getAllObjects = function(returnedObjects) {
    for (var i = 0; i < this.nodes.length; i++) {
        this.nodes[i].getAllObjects(returnedObjects);
    }
    for (var i = 0, len = this.objects.length; i < len; i++) {
        returnedObjects.push(this.objects[i]);
    }
    return returnedObjects;
};

/*
 * Return all objects that the object could collide with
 */
QuadTree.prototype.findObjects = function(returnedObjects, obj) {
    if (typeof obj === "undefined") {
        console.log("UNDEFINED OBJECT");
        return;
    }
    var index = this.getIndex(obj);
    if (index != -1 && this.nodes.length) {
        this.nodes[index].findObjects(returnedObjects, obj);
    }
    for (var i = 0, len = this.objects.length; i < len; i++) {
        returnedObjects.push(this.objects[i]);
    }
    return returnedObjects;
};
/*
 * Insert the object into the quadTree. If the tree
 * excedes the capacity, it will split and add all
 * objects to their corresponding nodes.
 */
QuadTree.prototype.insert = function(obj) {
    if (typeof obj === "undefined") {
        return;
    }
    if (obj instanceof Array) {
        for (var i = 0, len = obj.length; i < len; i++) {
            this.insert(obj[i]);
        }
        return;
    }
    if (this.nodes.length) {
        var index = this.getIndex(obj);
        // Only add the object to a subnode if it can fit completely
        // within one
        if (index != -1) {
            this.nodes[index].insert(obj);
            return;
        }
    }
    this.objects.push(obj);
    // Prevent infinite splitting
    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
        if (this.nodes[0] == null) {
            this.split();
        }
        var i = 0;
        while (i < this.objects.length) {
            var index = this.getIndex(this.objects[i]);
            if (index != -1) {
                this.nodes[index].insert((this.objects.splice(i, 1))[0]);
            } else {
                i++;
            }
        }
    }
};

// Quadtree implementation
QuadTree.prototype.getIndex = function(obj) {
    var index = -1;
    var verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    var horizontalMidpoint = this.bounds.y + this.bounds.height / 2;
    // Object can fit completely within the top quadrant
    var topQuadrant = (obj.y < horizontalMidpoint && obj.y + obj.height < horizontalMidpoint);
    // Object can fit completely within the bottom quandrant
    var bottomQuadrant = (obj.y > horizontalMidpoint);
    // Object can fit completely within the left quadrants
    if (obj.x < verticalMidpoint &&
        obj.x + obj.width < verticalMidpoint) {
        if (topQuadrant) {
            index = 1;
        } else if (bottomQuadrant) {
            index = 2;
        }
    }
    // Object can fix completely within the right quandrants
    else if (obj.x > verticalMidpoint) {
        if (topQuadrant) {
            index = 0;
        } else if (bottomQuadrant) {
            index = 3;
        }
    }
    return index;
};
/*
 * Splits the node into 4 subnodes
 */
QuadTree.prototype.split = function() {
    // Bitwise or [html5rocks]
    var subWidth = (this.bounds.width / 2) | 0;
    var subHeight = (this.bounds.height / 2) | 0;
    this.nodes[0] = new QuadTree({
        x: this.bounds.x + subWidth,
        y: this.bounds.y,
        width: subWidth,
        height: subHeight
    }, this.level + 1);
    this.nodes[1] = new QuadTree({
        x: this.bounds.x,
        y: this.bounds.y,
        width: subWidth,
        height: subHeight
    }, this.level + 1);
    this.nodes[2] = new QuadTree({
        x: this.bounds.x,
        y: this.bounds.y + subHeight,
        width: subWidth,
        height: subHeight
    }, this.level + 1);
    this.nodes[3] = new QuadTree({
        x: this.bounds.x + subWidth,
        y: this.bounds.y + subHeight,
        width: subWidth,
        height: subHeight
    }, this.level + 1);
};

// Now write your own player class
// This class requires an update(), render() and
// a handleInput() method.

// Player
var Player = function() {
    // Variables applied to each of our instances go here,
    // we've provided one for you to get started

    // The image/sprite for our player, this uses
    // a helper we've provided to easily load images
    this.x = 2 * 101;
    this.y = 5 * 83;
    this.sprite = 'images/char-princess-girl.png';
};

// Update the player's position, required method for game
// Parameter: dt, a time delta between ticks
Player.prototype.update = function(dt) {
    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
};

// Draw the player on the screen, required method for game
Player.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

// Handle keybord input in order to move player
Player.prototype.handleInput = function() {
    //code to be added
};


// Now instantiate your objects.
// Place all enemy objects in an array called allEnemies
// var allEnemies = [];
// for (var i = 0; i < 3; i++) {
//     var tempSpeed = Math.floor(Math.random() * 5 + 1) * 75;
//     allEnemies.push(new Enemy(-60, 60 + 85 * i, tempSpeed));
// }
// Place the player object in a variable called player
// var player = new Player();



// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
// document.addEventListener('keyup', function(e) {
//     var allowedKeys = {
//         37: 'left',
//         38: 'up',
//         39: 'right',
//         40: 'down'
//     };

//     // player.handleInput(allowedKeys[e.keyCode]);
// });

// The keycodes that will be mapped when a user presses a button.
// Original code by Doug McInnes
KEY_CODES = {
        32: 'space',
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
    }
    // Creates the array to hold the KEY_CODES and sets all their values
    // to false. Checking true/flase is the quickest way to check status
    // of a key press and which one was pressed when determining
    // when to move and which direction.
KEY_STATUS = {};
for (code in KEY_CODES) {
    KEY_STATUS[KEY_CODES[code]] = false;
}
/**
 * Sets up the document to listen to onkeydown events (fired when
 * any key on the keyboard is pressed down). When a key is pressed,
 * it sets the appropriate direction to true to let us know which
 * key it was.
 */
document.onkeydown = function(e) {
        // Firefox and opera use charCode instead of keyCode to
        // return which key was pressed.
        var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
        if (KEY_CODES[keyCode]) {
            e.preventDefault();
            KEY_STATUS[KEY_CODES[keyCode]] = true;
        }
    }
    /**
     * Sets up the document to listen to ownkeyup events (fired when
     * any key on the keyboard is released). When a key is released,
     * it sets teh appropriate direction to false to let us know which
     * key it was.
     */
document.onkeyup = function(e) {
    var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
    if (KEY_CODES[keyCode]) {
        e.preventDefault();
        KEY_STATUS[KEY_CODES[keyCode]] = false;
    }
}
