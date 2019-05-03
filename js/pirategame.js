var config = {
  type: Phaser.AUTO,
  width: 64 * 25,
  height: 64 * 20,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: {
        y: 0
      }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
}

var game = new Phaser.Game(config);
var player, cursors, enemies = [],
  maxEnemies, scene, cannonBalls, enemyCannonBalls, kraken;
var vel = 175;
var velMod = 0;
var fail = false;

function preload() {
  this.load.image('map-tilesheet', 'assets/Tilesheet/tiles_sheet.png');
  this.load.image('Sea', 'assets/Sea.png');
  this.load.tilemapTiledJSON('tileMap', 'assets/PirateMap.json');
  this.load.atlas("yellowShip", "assets/yellowShip.png", 'assets/yellowShip.json');
  this.load.atlas("enemyShip", "assets/enemyShip.png", 'assets/enemyShip.json');
  this.load.atlas("shipDec", "assets/shipDec.png", 'assets/shipDec.json');
  this.load.image('cannonBall', 'assets/cannonBall.png');
  this.load.spritesheet('explosion', 'assets/explosion.png', {
    frameWidth: 75,
    frameHeight: 74
  });
  this.load.spritesheet('seaMonster', 'assets/Kraken Sprite Sheet.png', {
    frameWidth: 218,
    frameHeight: 117
  });
}

function create() {
  this.physics.world.on('worldbounds', function(body) {
    killCannonBall(body.gameObject)
  }, this);

  scene = this;
  this.map = this.make.tilemap({
    key: 'tileMap'
  });
  var mapTiles = this.map.addTilesetImage("PirateTiles", "map-tilesheet");
  this.add.tileSprite(800, 800, 1600, 1600, 'Sea');
  this.map.createStaticLayer("Castles", [mapTiles], 0, 0).setDepth(3);
  var landLayer = this.map.createDynamicLayer("Land", [mapTiles], 0, 0).setDepth(2);
  var shallowLayer = this.map.createStaticLayer("Shallows", [mapTiles], 0, 0).setDepth(1);
  this.map.createStaticLayer("Decorations", [mapTiles], 0, 0).setDepth(3);

  this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
  this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

  enemyCannonBalls = this.physics.add.group({
    defaultKey: 'cannonBall',
    maxSize: 10
  })

  cursors = this.input.keyboard.addKeys({
    left: Phaser.Input.Keyboard.KeyCodes.LEFT,
    right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    up: Phaser.Input.Keyboard.KeyCodes.UP,
    down: Phaser.Input.Keyboard.KeyCodes.DOWN,
    w: Phaser.Input.Keyboard.KeyCodes.W,
    a: Phaser.Input.Keyboard.KeyCodes.A,
    s: Phaser.Input.Keyboard.KeyCodes.S,
    d: Phaser.Input.Keyboard.KeyCodes.D
  });

  var playerSpawn = this.map.findObject("Player", function(object) {
    if (object.name === "PlayerSpawn") {
      return object;
    }
  });
  createPlayer.call(this, playerSpawn);

  var krakenSpawn = this.map.findObject("BossEnemy", function(object) {
    if (object.name === "Kraken") {
      return object;
    }
  })
  createKraken.call(this, krakenSpawn);
  krakenAnimation.call(this);

  this.map.findObject("Enemies", function(object) {
    if (object.type === "Enemy" && object.name === "EnemySpawn") {
      var enemy = new EnemyShip(scene, 'enemyShip', 'ship1', object.x, object.y, player);
      enemy.ship.setCollideWorldBounds(true);
      enemy.setCannonBalls(enemyCannonBalls);
      scene.physics.add.collider(enemy.ship, landLayer);
      enemies.push(enemy);
      scene.physics.add.collider(enemy.ship, player.ship);
      for (var i = 0; i < maxEnemies; i++) {
        if (i > 0) {
          for (var j = 0; j < enemies.length - 1; j++) {
            this.physics.add.collider(enemyShip, enemyShips[j]);
          }
        }
      }
    }
  })

  cannonBalls = this.physics.add.group({
    defaultKey: 'cannonBall',
    maxSize: 2
  });
  explosions = this.physics.add.group({
    defaultKey: 'explosion',
    maxSize: maxEnemies
  })
  this.anims.create({
    key: 'explode',
    frames: this.anims.generateFrameNumbers('explosion', {
      start: 0,
      end: 3,
      first: 0
    }),
    frameRate: 10
  });

  function krakenAnimation() {
    this.anims.create({
      key: 'krakenAnims',
      frames: this.anims.generateFrameNumbers('seaMonster', {
        start: 0,
        end: 8,
        first: 0
      }),
      frameRate: 8
    });
  }

  this.cameras.main.startFollow(player.ship, true, 0.5, 0.5);
  console.log(this.cameras.main)
  this.cameras.main.setZoom(1.5)
  this.physics.add.collider(player.ship, landLayer);
  landLayer.setCollisionByProperty({
    Collision: true
  });
  shallowLayer.setTileIndexCallback([10, 11, 12, 26, 27, 28, 42, 43, 44, 58, 59, 74, 75], beachPlayer, this);
  this.physics.add.overlap(player.ship, shallowLayer);
  this.input.on('pointerdown', tryShoot, this);
}

function update(time, delta) {
  checkPlayerMovement.call(this);
  playObjectAnimations.call();
  for (var i = 0; i < enemies.length; i++) {
    enemies[i].update(time, delta);
  }
  if (velMod == -100) {
    velMod = 0;
  }
}

function createPlayer() {
  player = new PlayerShip(this, 'yellowShip', 'ship1', 300, 200);
  player.ship.setCollideWorldBounds(true);
}

function createKraken(spawn) {
  kraken = this.physics.add.sprite(spawn.x, spawn.y, "seaMonster", 1).setDepth(3);
}

function checkPlayerMovement() {
  player.update();
  if (cursors.right.isDown || cursors.d.isDown) {
    player.ship.body.setVelocityX(vel + velMod);
    player.ship.setRotation(Phaser.Math.DegToRad(270));
  } else if (cursors.left.isDown || cursors.a.isDown) {
    player.ship.body.setVelocityX(-vel - velMod);
    player.ship.setRotation(Phaser.Math.DegToRad(90));
  } else {
    player.ship.body.setVelocityX(0);
  }

  if (cursors.up.isDown || cursors.w.isDown) {
    player.ship.body.setVelocityY(-vel - velMod);
    player.ship.setRotation(Phaser.Math.DegToRad(180));
  } else if (cursors.down.isDown || cursors.s.isDown) {
    player.ship.body.setVelocityY(vel + velMod);
    player.ship.setRotation(Phaser.Math.DegToRad(0));
  } else {
    player.ship.body.setVelocityY(0);
  }

  if ((cursors.up.isDown || cursors.w.isDown) && (cursors.right.isDown || cursors.d.isDown)) {
    player.ship.setRotation(Phaser.Math.DegToRad(225));
  } else if ((cursors.down.isDown || cursors.s.isDown) && (cursors.right.isDown || cursors.d.isDown)) {
    player.ship.setRotation(Phaser.Math.DegToRad(315));
  } else if ((cursors.down.isDown || cursors.s.isDown) && (cursors.left.isDown || cursors.a.isDown)) {
    player.ship.setRotation(Phaser.Math.DegToRad(45));
  } else if ((cursors.up.isDown || cursors.w.isDown) && (cursors.left.isDown || cursors.a.isDown)) {
    player.ship.setRotation(Phaser.Math.DegToRad(135));
  }
}

function beachPlayer() {
  velMod = -100;
}

function tryShoot(pointer) {
  var cannonBall = cannonBalls.get(player.cannon.x, player.cannon.y);
  if (cannonBall) {
    fireCannonBall.call(this, cannonBall, player.cannon.rotation, enemies);
  }
}

function fireCannonBall(cannonBall, rotation, target) {
  cannonBall.setDepth(3);
  cannonBall.body.collideWorldBounds = true;
  cannonBall.body.onWorldBounds = true;
  cannonBall.enableBody(false);
  cannonBall.setActive(true);
  cannonBall.setVisible(true);
  cannonBall.rotation = rotation;

  this.physics.velocityFromRotation(cannonBall.rotation, 500, cannonBall.body.velocity);
  if (target === player) {
    this.physics.add.overlap(player.ship, cannonBall, cannonBallHitPlayer, null, this)
  } else {
    for (var i = 0; i < enemies.length; i++) {
      this.physics.add.overlap(enemies[i].ship, cannonBall, cannonBallHitEnemy, null, this); // additional parameter so that you can add in another function for testing
    }
  }
}

function killCannonBall(cannonBall) {
  cannonBall.disableBody(true, true);
  cannonBall.setActive(false);
  cannonBall.setVisible(false);
}

function activateExplosion(explosion) {
  explosion.setDepth(6);
  explosion.setActive(true);
  explosion.setVisible(true);
}

function cannonBallHitPlayer(ship, cannonBall) {
  killCannonBall(cannonBall);
  player.damage();
  if (player.isDestroyed()) {
    console.log("Hey");
    this.input.enabled = false;
    fail = true;
    enemyShips = [];
    this.physics.pause();
    var explosion = explosions.get(ship.x, ship.y);
    if (explosion) {
      activateExplosion(explosion);
      explosion.play('explode');
    }
    endGame.call(this);
  }
}

function cannonBallHitEnemy(ship, cannonBall) {
  console.log('Owwww')
  var enemy;
  var index;
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].ship === ship) {
      enemy = enemies[i];
      index = i;
      break;
    }
  }
  killCannonBall(cannonBall);
  enemy.damage();
  var explosion = explosions.get(ship.x, ship.y);
  if (explosion) {
    activateExplosion(explosion);
    explosion.on('animationcomplete', animComplete, this)
    explosion.play('explode');
  }
  if (enemy.isDestroyed()) {
    enemies.splice(index, 1);
    if (enemies.length == 0) {
      endGame.call(this);
    }
  }
}

function animComplete(animation, frame, gameObject) {
  gameObject.disableBody(true, true)
}

function endGame() {
  if (fail === true) {
    this.add.text(game.config.width / 2 - 150, game.config.height / 2 - 25, 'GAME OVER', ({
      fontSize: '50px',
      fill: '#fff',
      fontstyle: 'bold',
      fontFamily: 'Arial'
    })).setScrollFactor(0).setDepth(7);
  } else {
    this.add.text(game.config.width / 2 - 150, game.config.height / 2 - 25, 'YOU WIN', ({
      fontSize: '50px',
      fill: '#fff',
      fontstyle: 'bold',
      fontFamily: 'Arial'
    })).setScrollFactor(0).setDepth(7);
  }
}

function playObjectAnimations() {
  kraken.play("krakenAnims", true);
}
