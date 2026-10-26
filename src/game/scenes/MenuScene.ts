import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  public constructor() { super('MenuScene'); }

  public create(): void {
    this.cameras.main.setBackgroundColor('#090b18');
    window.dispatchEvent(new CustomEvent('hotpotato:menu'));
  }
}
