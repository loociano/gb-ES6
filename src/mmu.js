import fs from 'fs';
import Logger from './logger';
import Utils from './utils';

export default class MMU {

  /**
   * @param {string} filename
   */
  constructor(filename){

    // Addresses
    this.ADDR_GAME_START = 0x100;
    this.ADDR_NINTENDO_GRAPHIC_START = 0x104;
    this.ADDR_NINTENDO_GRAPHIC_END = 0x133;
    this.ADDR_TITLE_START = 0x134;
    this.ADDR_TITLE_END = 0x142;
    this.ADDR_IS_GB_COLOR = 0x143;
    this.ADDR_IS_SGB = 0x146;
    this.ADDR_CARTRIDGE_TYPE = 0x147;
    this.ADDR_ROM_SIZE = 0x148;
    this.ADDR_RAM_SIZE = 0x149;
    this.ADDR_DESTINATION_CODE = 0x14a;
    this.ADDR_COMPLEMENT_CHECK = 0x14d;
    this.ADDR_ROM_MAX = 0x7fff;

    // VRAM
    this.ADDR_VRAM_START = 0x8000;
    this.BG_CHAR_DATA_8000 = 0x8000;
    this.BG_CHAR_DATA_8800 = 0x8800;
    this.BG_DISPLAY_DATA_1 = 0x9800;
    this.BG_DISPLAY_DATA_2 = 0x9c00;
    this.ADDR_VRAM_END = 0x9fff;

    // OAM
    this.ADDR_OAM_START = 0xfe00;
    this.ADDR_OAM_END = 0xfe9f;

    // IO
    this.ADDR_P1 = 0xff00;
    this.ADDR_SB = 0xff01;
    this.ADDR_SC = 0xff02;
    this.ADDR_IF = 0xff0f;
    this.ADDR_LCDC = 0xff40;
    this.ADDR_STAT = 0xff41;
    this.ADDR_LY = 0xff44;
    this.ADDR_DMA = 0xff46;
    this.ADDR_KEY1 = 0xff4d;
    this.ADDR_VBK = 0xff4f;
    this.ADDR_SVBK = 0xff70;
    this.ADDR_IE = 0xffff;
    this.ADDR_MAX = 0xffff;

    // LCDC
    this.LCDC_ON = 0x80;
    this.LCDC_WINDOW = 0x20;
    this.LCDC_OBJ = 0x02;
    this.LCDC_BG = 0x01;
    this.LCDC_LINE_VBLANK = 0x90; // 114

    // P1 masks
    this.MASK_P1_RW = 0xcf;
    this.MASK_P1_RIGHT = this.MASK_P1_A = 0xfe;
    this.MASK_P1_LEFT = this.MASK_P1_B = 0xfd;
    this.MASK_P1_UP = this.MASK_P1_SELECT = 0xfb;
    this.MASK_P1_DOWN = this.MASK_P1_START = 0xf7;

    // LCDC masks
    this.MASK_BG_CHAR_DATA = 0x10;
    this.MASK_WINDOW_ON = 0x20;
    this.MASK_OBJ_ON = 0x02;
    this.MASK_BG_ON = 0x01;
    this.MASK_BG_OFF = 0xfe;

    this.MASK_BG_CHAR_DATA_8000 = 0x10;
    this.MASK_BG_CHAR_DATA_8800 = 0xef;
    this.MASK_BG_CODE_AREA_1 = 0xf7;
    this.MASK_BG_CODE_AREA_2 = 0x08;

    this.MASK_STAT_MODE = 0x03;

    // Character Data
    this.CHAR_SIZE = 0x10; // 0x00 to 0x0f

    // LCD
    this.NUM_LINES = 153;
    this.CHARS_PER_LINE = 32;

    // OBJ
    this.MAX_OBJ = 40;

    // Values
    this.IS_GB_COLOR = 0x80;

    // Cartridge types
    this._ROM_ONLY = 0;
    this._ROM_MBC1 = 1;
    // TODO add rest of types

    // Rom sizes
    this._32KB = 0x0;
    this._64KB = 0x1;
    this._128KB = 0x2;
    this._256KB = 0x3;
    this._512KB = 0x4;
    this._1MB = 0x5;
    this._1_1MB = 0x52;
    this._1_2MB = 0x53;
    this._1_5MB = 0x54;
    this._2MB = 0x6;

    // RAM Size
    this.RAM_NONE = 0x0;
    this.RAM_2KB = 0x1;
    this.RAM_8KB = 0x2;
    this.RAM_32KB = 0x3;
    this.RAM_128KB = 0x4;

    // Destination codes
    this.JAPANESE = 0x0;
    this.NON_JAPANESE = 0x1;

    this._memory = new Buffer(this.ADDR_MAX + 1);
    this._bios = this.getBIOS();
    this.inBIOS = true;

    this._initMemory();
    this._loadROM(filename);
  }

  /**
   * @param filename
   * @private
   */
  _loadROM(filename){
    const memory_start = 0;
    const rom_start = 0;
    const rom_32kb = 0x7fff;

    try {

      fs.readFileSync(filename)
        .copy(this._memory, memory_start, rom_start, rom_32kb);

    } catch (e){
      throw new Error(`ROM ${filename} was not found.`);
    }
  }

  /**
   * @private
   */
  _initMemory() {
    this._memory.fill(0); // Buffers are created with random data

    this._memory[this.ADDR_P1] = 0xff;
    this._memory[0xff05] = 0x00;
    this._memory[0xff06] = 0x00;
    this._memory[0xff07] = 0x00;
    this._memory[0xff10] = 0x80;
    this._memory[0xff14] = 0xbf;
    this._memory[0xff16] = 0x3f;
    this._memory[0xff17] = 0x00;
    this._memory[0xff19] = 0xbf;
    this._memory[0xff1a] = 0x7f;
    this._memory[0xff1b] = 0xff;
    this._memory[0xff1c] = 0x9f;
    this._memory[0xff1e] = 0xbf;
    this._memory[0xff20] = 0xff;
    this._memory[0xff21] = 0x00;
    this._memory[0xff22] = 0x00;
    this._memory[0xff23] = 0xbf;

    this._memory[this.ADDR_IF] = 0x00;
    this._memory[this.ADDR_IE] = 0x01;
  }

  /**
   * @returns {Buffer} BIOS
   */
  getBIOS(){
    return new Buffer('31feffaf21ff9f32cb7c20fb2126ff0e113e8032e20c3ef3e2323e77773efce0471104012110801acd9500cd9600137bfe3420f311d80006081a1322230520f93e19ea1099212f990e0c3d2808320d20f92e0f18f3673e6457e0423e91e040041e020e0cf044fe9020fa0d20f71d20f20e13247c1e83fe6228061ec1fe6420067be20c3e87e2f04290e0421520d205204f162018cb4f0604c5cb1117c1cb11170520f522232223c9ceed6666cc0d000b03730083000c000d0008111f8889000edccc6ee6ddddd999bbbb67636e0eecccdddc999fbbb9333e3c42b9a5b9a5423c21040111a8001a13be20fe237dfe3420f506197886230520fb8620fe3e01e050', 'hex');
  }

  /**
   * @param {number} addr
   * @return {number} byte at memory address
   */
  readByteAt(addr) {

    if (addr > this.ADDR_MAX || addr < 0){
      throw new Error(`Cannot read memory address ${Utils.hexStr(addr)}`);
    }

    switch(addr){
      case this.ADDR_DMA:
      case this.ADDR_SB:
      case this.ADDR_SC:
      case this.ADDR_SVBK:
      case this.ADDR_KEY1:
        throw new Error('Unsupported');
    }

    if (this._isOAMAddr(addr) && !this._canAccessOAM()){
      throw new Error('Cannot read OAM');
    }
    if (this._isVRAMAddr(addr) && !this._canAccessVRAM()){
      throw new Error('Cannot read VRAM');
    }

    if (addr <= this.ADDR_ROM_MAX){
      if (addr < this.ADDR_GAME_START && this.inBIOS){
        return this._biosByteAt(addr);
      }
      return this.romByteAt(addr);
    }

    return this._memory[addr];
  }

  /**
   * Reads buffer from memory
   * @param {number} addr_start, 16 bits
   * @param {number} addr_end, 16 bits (exclusive)
   */
  readBuffer(addr_start, addr_end){
    return this._memory.slice(addr_start, addr_end);
  }

  /**
   * @param buffer
   * @param addr_start
   */
  writeBuffer(buffer, addr_start){
    if (!addr_start) throw new Error('Must indicate start address');
    buffer.copy(this._memory, addr_start);
  }

  readBIOSBuffer(){
    return this._bios.slice(0, this.ADDR_GAME_START);
  }

  /**
   * Returns the buffer given a tile number
   * Tiles are numbered from 0x00 to 0xff
   * @param tile_number
   */
  readTile(tile_number){
    if (tile_number < 0 || tile_number > 0xff){
      throw new Error(`Cannot read tile ${tile_number}`);
    }

    if ((this.lcdc() & this.LCDC_BG) === 0){
      return this._genEmptyCharBuffer();
    }

    const start_addr = this._getBgCharDataStartAddr() + (tile_number << 4);
    return this._memory.slice(start_addr, start_addr + this.CHAR_SIZE);
  }

  /**
   * @returns {Buffer} generates an char-size, empty buffer
   * @private
   */
  _genEmptyCharBuffer(){
    return new Buffer(this.CHAR_SIZE).fill(0);
  }

  /**
   * @returns {number} start address of background character data based on LCDC
   * @private
   */
  _getBgCharDataStartAddr(){
    if ((this.lcdc() & this.MASK_BG_CHAR_DATA) === 0){
      return this.BG_CHAR_DATA_8800;
    } else {
      return this.BG_CHAR_DATA_8000;
    }
  }

  /**
   * Returns the char code given the x,y lcd coordinates
   * @param {number} x between 0 and 31
   * @param {number} y between 0 and 31
   * @returns {number}
   */
  getCharCode(x, y){
    if (x < 0 || x > 0x1f || y < 0 || y > 0x1f){
      throw new Error(`Cannot read tile at coord ${x}, ${y}`);
    }
    const addr = this._getBgDisplayDataStartAddr() + x + (y * this.CHARS_PER_LINE);
    return this.readByteAt(addr);
  }

  /**
   * @returns {number} start address of the background display data
   * @private
   */
  _getBgDisplayDataStartAddr(){
    if((this.lcdc() & this.MASK_BG_CODE_AREA_2) === 0){
      return this.BG_DISPLAY_DATA_1;
    } else {
      return this.BG_DISPLAY_DATA_2;
    }
  }

  /**
   * Writes a byte n into address
   * @param {number} 16 bit address
   * @param {number} byte
   */
  writeByteAt(addr, n){
    if (addr > this.ADDR_MAX || addr < 0 || addr <= this.ADDR_ROM_MAX){
      Logger.error(`Cannot set memory address ${Utils.hexStr(addr)}`);
      return;
    }
    if (n < 0 || n > 0xff){
      throw new Error(`Cannot write ${n} in memory, it has more than 8 bits`);
    }
    if (this._isOAMAddr(addr) && !this._canAccessOAM()){
      throw new Error('Cannot write OAM');
    }
    if (this._isVRAMAddr(addr) && !this._canAccessVRAM()){
      throw new Error('Cannot write on VRAM');
    }

    switch(addr){
      case this.ADDR_P1:
        n |= this.MASK_P1_RW;
        break;
      case this.ADDR_VBK:
        Logger.info(`Cannot write on ${Utils.hex4(addr)}`);
        return;
      case this.ADDR_STAT:
        n |= 0x80; // Bit 7 is always set
        break;
      case this.ADDR_LCDC:
        this._handle_lcdc(n);
        break;
    }
    this._memory[addr] = n;
  }

  /**
   * @param addr
   * @returns {boolean} true if addr is in OAM range
   * @private
   */
  _isOAMAddr(addr){
    return (addr >= this.ADDR_OAM_START) && (addr <= this.ADDR_OAM_END);
  }

  /**
   * @param addr
   * @returns {boolean} true if addr is in VRAM range
   * @private
   */
  _isVRAMAddr(addr){
    return (addr >= this.ADDR_VRAM_START) && (addr <= this.ADDR_VRAM_END);
  }

  /**
   * @returns {boolean} true OAM is accessible
   * @private
   */
  _canAccessOAM(){
    const mode = this.getLCDMode();
    return  mode !== 2 && mode !== 3;
  }

  /**
   * @returns {boolean} true if VRAM is accessible
   * @private
   */
  _canAccessVRAM(){
    return this.getLCDMode() !== 3;
  }

  /**
   * @returns {number} LCD Mode: [0,3]
   */
  getLCDMode(){
    return this.stat() & this.MASK_STAT_MODE;
  }

  /**
   * Sets LCD Mode
   * @param {number} mode [0,3]
   */
  setLCDMode(mode){
    if (mode > 3 || mode < 0) return;
    this._memory[this.ADDR_STAT] &= 0xfc;
    this._memory[this.ADDR_STAT] += mode;
  };

  /**
   * Handles updates to LCD Control Register (LCDC)
   * @param n
   * @private
   */
  _handle_lcdc(n){
    switch(n & this.LCDC_ON){
      case 0:
        this._handle_lcd_off();
        break;
    }
    switch(n & this.LCDC_WINDOW){
      case 0:
        break;
      default:
        throw new Error('Windowing unsupported');
    }
    switch(n & this.LCDC_OBJ){
      case 0:
        break;
      default:
        Logger.error('OBJ unsupported');
    }
  }

  /**
   * Handles actions when LCD turns off
   * @private
   */
  _handle_lcd_off(){
    this.setLy(0x00);
  }

  /**
   * Sets value on Interrupt Enable Register
   * @param value
   */
  setIe(value){
    this._memory[this.ADDR_IE] = value;
  }

  /**
   * Reads the interrupt enable register
   * @returns {number}
   */
  ie(){
    return this.readByteAt(this.ADDR_IE);
  }

  /**
   * Sets value on interrupt request register
   * @param value
   */
  setIf(value){
    this._memory[this.ADDR_IF] = value;
  }

  /**
   * Reads the interrupt request register
   * @returns {number}
   */
  If(){
    return this.readByteAt(this.ADDR_IF);
  }

  /**
   * @param {number} address
   * @return {number} byte value
   */
  romByteAt(address) {
    if (address > this.ADDR_ROM_MAX || address < 0){
      throw new Error(`Cannot read ROM address ${Utils.hexStr(address)}`);
    }
    return this._memory[address];
  }

  _biosByteAt(addr){
    if (addr >= this.ADDR_GAME_START || addr < 0){
      throw new Error(`Cannot read bios address ${Utils.hexStr(addr)}`);
    }
    return this._bios[addr];
  }

  /**
   * @param {number} start
   * @param {number} end
   * @returns {any}
   */
  romBufferAt(addr_start, addr_end){
    if (addr_start > this.ADDR_ROM_MAX || addr_start < 0 ||
      addr_end < addr_start || addr_end > this.ADDR_ROM_MAX){
      throw new Error(`Cannot read ROM Buffer ${Utils.hexStr(addr_start)} to ${Utils.hexStr(addr_end)}`);
    }
    return this._memory.slice(addr_start, addr_end);
  }

  /** @return {string} game title */
  getGameTitle(){
    var title = this._memory.slice(this.ADDR_TITLE_START, this.ADDR_TITLE_END);
    var length = 0;
    while(title[length] != 0){
      length++;
    }
    return title.toString('ascii', 0, length);
  }

  /** @return {boolean} true if game is in color */
  isGameInColor() {
    return this.romByteAt(this.ADDR_IS_GB_COLOR) === this.IS_GB_COLOR;
  }

  /**
   * @returns {boolean} true if ROM is for Super Game Boy
   */
  isGameSuperGB() {
    return this.romByteAt(this.ADDR_IS_SGB);
  }

  /**
   * @returns {string} cartridge type
   */
  getCartridgeType() {
    const type = this.romByteAt(this.ADDR_CARTRIDGE_TYPE)
    switch(type){
      case this._ROM_ONLY: return 'ROM ONLY';
      case this._ROM_MBC1: return 'ROM+MBC1';
      default:
        throw new Error(`Cartridge type ${type} unknown`);
    }
  }

  /**
   * @returns {string} ROM size
   */
  getRomSize() {
    switch(this.romByteAt(this.ADDR_ROM_SIZE)){
      case this._32KB: return '32KB';
      case this._64KB: return '64KB';
      case this._128KB: return '128KB';
      case this._256KB: return '256KB';
      case this._512KB: return '512KB';
      case this._1MB: return '1MB';
      case this._1_1MB: return '1.1MB';
      case this._1_2MB: return '1.2MB';
      case this._1_5MB: return '1.5MB';
      case this._2MB: return '2MB';
      default:
        throw new Error('Rom size unknown');
    }
  }

  /**
   * @returns {string} RAM size
   */
  getRAMSize() {
    switch(this.romByteAt(this.ADDR_RAM_SIZE)){
      case this.RAM_NONE: return 'None';
      case this.RAM_2KB: return '2KB';
      case this.RAM_8KB: return '8KB';
      case this.RAM_32KB: return '32KB';
      case this.RAM_128KB: return '128KB';
      default:
        throw new Error('RAM size unknown');
    }
  }

  /**
   * @returns {string} destination code
   */
  getDestinationCode() {
    if (this.romByteAt(this.ADDR_DESTINATION_CODE) === this.JAPANESE){
      return 'Japanese';
    } else if (this.romByteAt(this.ADDR_DESTINATION_CODE) === this.NON_JAPANESE){
      return 'Non-Japanese';
    } else {
      throw new Error('Destination code unknown');
    }

  }

  /**
   * @returns {number|any} Buffer with nintendo graphic
   */
  getNintendoGraphicBuffer() {
    return this.romBufferAt(this.ADDR_NINTENDO_GRAPHIC_START,
      this.ADDR_NINTENDO_GRAPHIC_END + 1);
  }

  /**
   * Computes ROM checksum and verifies if correct.
   *
   * Checksum is computed by summing all bytes in the cartridge
   * from 0x134 to 0x14d plus 25. Checksum is correct if the least
   * significant byte is 0x00.
   *
   * @return {boolean} true if checksum is correct.
   */
  isChecksumCorrect() {
    let addr = this.ADDR_TITLE_START;
    let count = 0;
    while(addr <= this.ADDR_COMPLEMENT_CHECK){
      count += this.romByteAt(addr);
      addr++;
    }
    return (count + 25 & 0xff) === 0;
  }

  /**
   * Dumps memory to a file
   */
  dumpMemoryToFile(pc){
    const filename = `${Utils.toFsStamp()}_memory_dump_at_${Utils.hex4(pc)}.bin`;
    try {
      fs.writeFileSync(filename, this._memory);
    } catch(e){
      console.error('Problem writing memory dump');
    }
    return filename;
  }

  /**
   * Returns the value of LCD Control register
   * @returns {number}
   */
  lcdc(){
    return this.readByteAt(this.ADDR_LCDC);
  }

  /**
   * LCDC Status Flag
   * @returns {number}
   */
  stat(){
    return this.readByteAt(this.ADDR_STAT);
  }

  /**
   * LCDC Y-Coordinate (read-only)
   * @returns {number}
   */
  ly(){
    return this.readByteAt(this.ADDR_LY);
  }

  /**
   * Sets value at register LY (emulates hardware)
   * @param {number} line
   */
  setLy(line){
    this.writeByteAt(this.ADDR_LY, line);
  }

    /**
   * Increments register LY by 1. Resets after 153.
   */
  incrementLy(){
    let ly = this.ly();
    if (ly >= 153){
      ly = 0;
    } else {
      ly++;
    }
    this.setLy(ly);
  }

  /**
   * Bank register for LCD display RAM.
   * Always zero in DMG.
   */
  vbk(){
    return this.readByteAt(this.ADDR_VBK);
  }

  p1(){
    return this.readByteAt(this.ADDR_P1);
  }

  pressRight(){
    this._memory[this.ADDR_P1] &= this.MASK_P1_RIGHT;
  }

  pressLeft(){
    this._memory[this.ADDR_P1] &= this.MASK_P1_LEFT;
  }

  pressUp(){
    this._memory[this.ADDR_P1] &= this.MASK_P1_UP;
  }

  pressDown(){
    this._memory[this.ADDR_P1] &= this.MASK_P1_DOWN;
  }

  pressA(){
    this._memory[this.ADDR_P1] &= this.MASK_P1_A;
  }

  pressB(){
    this._memory[this.ADDR_P1] &= this.MASK_P1_B;
  }

  pressSELECT(){
    this._memory[this.ADDR_P1] &= this.MASK_P1_SELECT;
  }

  pressSTART(){
    this._memory[this.ADDR_P1] &= this.MASK_P1_START;
  }

  /**
   * @param number
   * @returns {{y: number, x: number, chrCode: number, attr: number}}
   */
  getOBJ(number){
    if (number < 0 || number > 39) throw new Error('OBJ number out of range');

    const addr = this.ADDR_OAM_START + (4 * number);
    return {
      y: this.readByteAt(addr),
      x: this.readByteAt(addr + 1),
      chrCode: this.readByteAt(addr + 2),
      attr: this.readByteAt(addr + 3)
    }
  }
}