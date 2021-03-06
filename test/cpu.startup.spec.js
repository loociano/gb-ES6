import CPU from '../src/cpu';
import MMU from '../src/mmu';
import Loader from '../src/loader';
import assert from 'assert';
import {describe, before, it} from 'mocha';
import lcdMock from './mock/lcdMock';
import StorageMock from './mock/storageMock';

let cpu, lcd;

describe('Start BIOS', () => {

  before( () => {
    const loader = new Loader('./roms/blargg/cpu_instrs/cpu_instrs.gb');
    lcd = new lcdMock();
    cpu = new CPU(new MMU(loader.asUint8Array(), new StorageMock()), lcd);
    /**
     * NOP
     */
    cpu.nop = () => this._m++;
  });

  it('BIOS should reset VRAM', () => {
    cpu.runUntil(0x100);
    assert.equal(cpu.mmu.readByteAt(0x9fff), 0x00, 'Top VRAM empty');
    assert.equal(cpu.mmu.readByteAt(0x8000), 0x00, 'Bottom VRAM empty');
  });

  describe('LCD', () => {
    it('should draw lines on LCD mode 3', () => {
      let lines = [];
      lcd.drawLine = (line) => {
        lines[line] = true;
      };
      cpu.mmu.writeByteAt(cpu.mmu.ADDR_LCDC, 0x80); // LCD on
      cpu._execute = () => cpu.nop();

      cpu.frame();

      for(let l = 0; l < 144; l++) {
        assert.equal(lines[l], true);
      }
    });
  });

});