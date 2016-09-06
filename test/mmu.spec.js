import MMU from '../src/mmu';
import assert from 'assert';
import config from '../src/config';
import {describe, beforeEach, it} from 'mocha';
import fs from 'fs';

describe('MMU', () => {

  config.DEBUG = false;
  config.TEST = true;

  let mmu;

  beforeEach(function() {
    mmu = new MMU('./roms/blargg_cpu_instrs.gb');
  });

  it('should write bytes in memory', () => {
    mmu.writeByteAt(0xc000, 0xab);
    assert.equal(mmu.readByteAt(0xc000), 0xab, 'write 0xab in memory address 0xc000');
  });

  it('should write in Interrupt Enable register', () => {
    mmu.writeByteAt(0xffff, 0x0f);
    assert.equal(mmu.ie(), 0x0f, 'should write on 0xffff');
  });

  it('should not write bytes in ROM', () => {
    
    let addr = 0x0000;
    let value = mmu.readByteAt(addr);

    assert.doesNotThrow( () => {
      mmu.writeByteAt(addr, 0xab);
    }, Error, `should not write on ${addr}`);

    addr = 0x7fff;

    assert.doesNotThrow( () => {
      mmu.writeByteAt(addr, 0xab);
    }, Error, `should not write on ${addr}`);

    addr = 0x8000;

    mmu.writeByteAt(addr, 0xab);

    assert.equal(mmu.readByteAt(addr), 0xab, `can write on ${addr}`);
  });

  it('should start the memory map', () => {

    assert.equal(mmu.memory.length, 0x10000, 'Memory size is 0x10000');

    // Starting values at addresses
    assert.equal(mmu.readByteAt(0xff05), 0x00);
    assert.equal(mmu.readByteAt(0xff06), 0x00);
    assert.equal(mmu.readByteAt(0xff07), 0x00);
    assert.equal(mmu.readByteAt(0xff10), 0x80);
    assert.equal(mmu.readByteAt(0xff14), 0xbf);
    assert.equal(mmu.readByteAt(0xff16), 0x3f);
    assert.equal(mmu.readByteAt(0xff17), 0x00);
    assert.equal(mmu.readByteAt(0xff19), 0xbf);
    assert.equal(mmu.readByteAt(0xff1a), 0x7f);
    assert.equal(mmu.readByteAt(0xff1b), 0xff);
    assert.equal(mmu.readByteAt(0xff1c), 0x9f);
    assert.equal(mmu.readByteAt(0xff1e), 0xbf);
    assert.equal(mmu.readByteAt(0xff20), 0xff);
    assert.equal(mmu.readByteAt(0xff21), 0x00);
    assert.equal(mmu.readByteAt(0xff22), 0x00);
    assert.equal(mmu.readByteAt(0xff23), 0xbf);
  });

  it('should load the BIOS in memory', () => {
    assert(mmu.readBIOSBuffer().equals(mmu.getBIOS()), 'BIOS is in memory');
  });

  it('should read BIOS', () => {
    assert.equal(mmu.readByteAt(0x0000), 0x31, 'first BIOS byte');
    assert.equal(mmu.readByteAt(0x00ff), 0x50, 'last BIOS byte');
    assert.equal(mmu.readByteAt(0x0100), 0x00, 'first GAME byte');
    assert.equal(mmu.readByteAt(0x0101), 0xc3, 'second GAME byte');
  });

  describe('ROM checks', () => {

    it('should read the game header', () => {
      assert.equal(mmu.getGameTitle(), 'CPU_INSTRS', 'should read title');
      assert.equal(mmu.isGameInColor(), true, 'is gb color');
      assert.equal(mmu.isGameSuperGB(), false, 'should not be super GB');
      assert.equal(mmu.getCartridgeType(), 'ROM+MBC1');
      assert.equal(mmu.getRomSize(), '64KB');
      assert.equal(mmu.getRAMSize(), 'None');
      assert.equal(mmu.getDestinationCode(), 'Japanese');
    });

    it('should read the nintendo graphic buffer', () => {
      const buf = new Buffer('CEED6666CC0D000B03730083000C000D0008' +
        '111F8889000EDCCC6EE6DDDDD999BBBB67636E0EECCCDDDC999FBBB9333E', 'hex');
      assert(mmu.getNintendoGraphicBuffer().equals(buf), 'Nintendo Graphic Buffer must match.');
    });

    it('should compute the checksum', () => {
      assert(mmu.isChecksumCorrect());
    });

  });

  it('should write ly', () => {
    mmu.setLy(0x01);
    assert.equal(mmu.ly(), 0x01, 'set ly');
  });

  describe('LCD Control Register', () => {
    it('should read/write lcdc', () => {
      mmu.writeByteAt(mmu.ADDR_LCDC, 0xff);
      assert.equal(mmu.lcdc(), 0xff, 'set lcdc');
    });
  });

  describe('STAT or LCDC Status Flag', () => {
    it('should read/write STAT', () => {
      mmu.writeByteAt(mmu.ADDR_STAT, 0x00);
      assert.equal(mmu.stat(), 0x80, 'STAT.7 always set');

      mmu.writeByteAt(mmu.ADDR_STAT, 0xff);
      assert.equal(mmu.stat(), 0xff, 'STAT set');
    });
  });

  describe('Interruptions', () => {

    it('should read/write the interrupt enable register', () => {
      mmu.setIe(0x01);
      assert.equal(mmu.ie(), 0x01);
    });

    it('should read/write the interrupt request register', () => {
      mmu.setIf(0x01);
      assert.equal(mmu.If(), 0x01);
    });
  });

  describe('DMA', () => {
    it('should detect DMA', () => {
      assert.throws( () => mmu.readByteAt(mmu.ADDR_DMA), Error, 'DMA unsupported');
    });
  });

  describe('Serial Cable Communication', () => {
    it('should detect serial communication', () => {
      assert.throws( () => mmu.readByteAt(mmu.ADDR_SB), Error, 'SB register unsupported');
      assert.throws( () => mmu.readByteAt(mmu.ADDR_SC), Error, 'SC register unsupported');
    });
  });

  describe('Bank Registers (CGB only)', () => {
    it('should detect bank register', () => {
      assert.throws(() => mmu.readByteAt(mmu.ADDR_SVBK), Error, 'SVBK register unsupported');
      assert.throws(() => mmu.readByteAt(mmu.ADDR_KEY1), Error, 'KEY1 unsupported');
    });

    it('should not write VBK in DMG mode', () => {
      assert.equal(mmu.vbk(), 0, 'VBK always zero in DMG');
      mmu.writeByteAt(mmu.ADDR_VBK, 0xab);
      assert.equal(mmu.vbk(), 0, 'VBK always zero in DMG');
    });
  });

  describe('Memory dumps', () => {

    it('should dump a memory snapshot', () => {
      const filename = mmu.dumpMemoryToFile(); // TODO: mock fs in tests
      assert.doesNotThrow( () => {
          fs.accessSync(filename);
      });
      fs.unlinkSync(filename);

    });
  });

});