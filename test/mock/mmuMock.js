export default class MMUMock {

  constructor(){
    this._ly = 0;
    this.MAX_OBJ = 40;
    this._VRAMRefreshed = false;
    this.MASK_OBJ_ATTR_HFLIP = 0x20;
    this.MASK_OBJ_ATTR_OBG = 0x10;
  }

  ly(){
    return this._ly;
  }

  setLy(line){
    this._ly = line;
  }

  lcdc(){
    return 0x90;
  }

  areOBJOn() {
    return true;
  }

  bgp(){
    return 0b11100100;
  }

  obg0(){
    return 0b11100100;
  }

  obg1(){
    return 0b11100100;
  }
}