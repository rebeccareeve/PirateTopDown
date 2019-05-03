class BaseShip {
  constructor(scene, image, frame, x, y) {
    this.scene = scene;
    this.damageCount = 0;
    this.damageMax = 3;
    this.ship = this.scene.physics.add.sprite(x, y, image, frame);
    this.ship.body.bounce.setTo(0.75, 0.75);
    this.cannon = scene.physics.add.sprite(x, y, 'shipDec', 'cannon');
    this.cannon.setDepth(5);
    this.ship.setDepth(4);
  }
  update() {
    if (this.isDestroyed()) {
      return
    }
    this.forwardVect = this.scene.physics.velocityFromAngle(this.ship.angle + 90, 1);
    this.ship.rotation = Phaser.Math.Angle.Between(this.ship.x, this.ship.y, this.ship.x + this.ship.body.velocity.x, this.ship.y + this.ship.body.velocity.y) - Phaser.Math.DegToRad(90);
    this.cannon.angle = this.ship.angle + 90;
    this.cannon.x = this.ship.x + this.forwardVect.x * 30;
    this.cannon.y = this.ship.y + this.forwardVect.y * 30;
  }
  burn() {
    this.ship.body.velocity.x *= 0.1;
    this.ship.body.velocity.y *= 0.1;
    this.ship.body.immovable = true;
    this.ship.setFrame('ship2');
  }
  isDestroyed() {
    if (this.damageCount >= this.damageMax) {
      return true
    }
  }
  damage() {
    this.damageCount++;
    if (this.damageCount == this.damageMax - 1) {
      this.ship.setFrame('ship3');
    } else if (this.damageCount == this.damageMax - 2) {
      this.burn();
    } else if (this.damageCount >= this.damageMax) {
      if (this !== player) {
        this.ship.destroy()
        this.cannon.destroy()
      }
    }
  }

  enableCollision(destructLayer) {
    this.scene.physics.add.collider(this.ship, destructLayer);
  }
}

class PlayerShip extends BaseShip {
  constructor(scene, image, frame, x, y) {
    super(scene, image, frame, x, y)
  }
  update() {
    if (super.isDestroyed())
      return
    super.update();
    this.scene.physics.velocityFromRotation(this.ship.rotation, this.currentSpeed, this.ship.body.velocity);
    const worldPoint = this.scene.input.activePointer.positionToCamera(this.scene.cameras.main);
    this.cannon.rotation = Phaser.Math.Angle.Between(this.cannon.x, this.cannon.y, worldPoint.x, worldPoint.y);
  }
}

class EnemyShip extends BaseShip {
  constructor(scene, image, frame, x, y, player) {
    super(scene, image, frame, x, y)
    this.player = player
    this.ship.angle = Phaser.Math.RND.angle();
    this.scene.physics.velocityFromRotation(this.ship.rotation, 100, this.ship.body.velocity);
    this.fireTime = 0;
  }
  update(time, delta) {
    if (super.isDestroyed())
      return
    super.update();
    this.cannon.rotation = Phaser.Math.Angle.Between(this.cannon.x, this.cannon.y, player.ship.x, player.ship.y);
    if (Phaser.Math.Distance.Between(this.ship.x, this.ship.y, this.player.ship.x, this.player.ship.y) < 300 && this.fireTime == 0) {
      this.fireTime = time;
      var cannonBall = this.cannonBalls.get(this.cannon.x, this.cannon.y);
      if (cannonBall) {
        fireCannonBall.call(this.scene, cannonBall, this.cannon.rotation, this.player) //Scope, Bullet, Rotation, Target
      }
    }

    const worldPoint = this.scene.input.activePointer.positionToCamera(this.scene.cameras.main);
    if (this.fireTime > 0) {
      if (time > this.fireTime + 2000) {
        this.fireTime = 0;
      }
    }
  }
  setCannonBalls(cannonBalls) {
    this.cannonBalls = cannonBalls;
  }
}
