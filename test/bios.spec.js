import CPU from '../src/cpu';
import MMU from '../src/mmu';
import assert from 'assert';
import {describe, beforeEach, it} from 'mocha';
import IPCMock from './mock/ipcMock';
import config from '../src/config';

describe.skip('BIOS execution', function() {

  config.DEBUG = true;

  const stopAt = 0x0100;

  const ipcMock = new IPCMock(stopAt);
  const cpu = new CPU(new MMU('./roms/blargg_cpu_instrs.gb'), ipcMock);
  ipcMock.setCpu(cpu);

  /*while (cpu.pc() < stopAt){
    cpu.runUntil(stopAt);
  }*/

  it('BIOS should start sound', function() {
    assert.equal(cpu.nr52(), 0x80, 'NR52');
    assert.equal(cpu.nr51(), 0xf3, 'NR51');
    assert.equal(cpu.nr50(), 0x77, 'NR50');
    assert.equal(cpu.nr12(), 0xf3, 'NR52');
    assert.equal(cpu.nr11(), 0x80, 'NR11');
  });

  it('should copy the nintendo tiles in VRAM', function() {
    assert(cpu.mmu.readTile(0x1).equals(B('f000f000fc00fc00fc00fc00f300f300')), 'Nintendo tile 1');
    assert(cpu.mmu.readTile(0x2).equals(B('3c003c003c003c003c003c003c003c00')), 'Nintendo tile 2');
    assert(cpu.mmu.readTile(0x3).equals(B('f000f000f000f00000000000f300f300')), 'Nintendo tile 3');
    //...
    assert(cpu.mmu.readTile(0x19).equals(B('3c004200b900a500b900a50042003c00')), 'Nintendo tile 24');
  });

  it('should write the map to tiles', function() {
    assert.equal(cpu.mmu.getCharCode(0x04, 0x08), 0x01, 'Tile 1 at 0x04,0x08');
    assert.equal(cpu.mmu.getCharCode(0x10, 0x08), 0x19, 'Tile 19 at 0x10,0x08');
  });

  it('should init IO registers', function() {
    assert.equal(cpu.pc(), 0x100, 'PC at 0x100');
    assert.equal(cpu.lcdc(), 0x91, 'LCDC initialized');
    // TODO: implement LCDC interruptions to decrease it to 0x00 (scrolling down Nintendo logo)
    //assert.equal(cpu.scy(), 0x00, 'SCY initialized'); // BIOS setting it at 0x64!
    assert.equal(cpu.scx(), 0x00, 'SCX initialized');
    assert.equal(cpu.ly(), 0x00, 'LY initialized');
    assert.equal(cpu.lyc(), 0x00, 'LYC initialized');
    assert.equal(cpu.bgp(), 0xfc, 'BGP Background Palette is initialized');
    assert.equal(cpu.wy(), 0x00, 'WY initialized');
    assert.equal(cpu.wx(), 0x00, 'WX initialized');
    assert.equal(cpu.If(), 0x01, 'IF initialized, triggered vblank'); // TODO: bits 7,6,5 should be always set
    assert.equal(cpu.ie(), 0x00, 'IE initialized');
    assert.equal(cpu.ime(), 1, 'Interrupt Master Enabled');
  });

  it('should override BIOS with ROM in range 0x0000 - 0x00ff', function() {
    assert(!cpu.mmu.readBuffer(0x0000, 0x0100).equals(cpu.mmu.getBIOS()), 'When BIOS finishes, memory 0x00-0xff is overriden by ROM');
    
    // Reset ROM addresses: 00, 08, 10, ... 38
    assert.equal(cpu.mmu.readByteAt(0x00), 0x3c);
    assert.equal(cpu.mmu.readByteAt(0x08), 0x3c);
    assert.equal(cpu.mmu.readByteAt(0x10), 0x3c);
    assert.equal(cpu.mmu.readByteAt(0x18), 0x3c);
    assert.equal(cpu.mmu.readByteAt(0x20), 0x3c);
    assert.equal(cpu.mmu.readByteAt(0x28), 0x3c);
    assert.equal(cpu.mmu.readByteAt(0x30), 0x3c);
    assert.equal(cpu.mmu.readByteAt(0x38), 0x3c);
  });

  it('should end up with the right values on registers', () => {
    assert.equal(cpu.a(), 0x01, 'a');
    assert.equal(cpu.b(), 0x00, 'b');
    assert.equal(cpu.c(), 0x13, 'c');
    assert.equal(cpu.d(), 0x00, 'd');
    assert.equal(cpu.e(), 0xd8, 'e');
    assert.equal(cpu.h(), 0x01, 'h');
    assert.equal(cpu.l(), 0x4d, 'l');
    assert.equal(cpu.sp(), 0xfffe, 'a');
    assert.equal(cpu.f(), 0b1011, 'flags');
  })

});

/**
 * Returns a new Buffer given a hexadecimal string
 * @param hex_string
 * @returns {*|Buffer}
 * @constructor
 */
function B(hex_string){
  return new Buffer(hex_string, 'hex');
}