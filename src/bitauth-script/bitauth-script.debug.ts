import {
  instantiateBitcoinCashVirtualMachine,
  createEmptyBitcoinCashProgramState,
  BitcoinCashOpcodes,
  stringify,
  hexToBin
} from 'bitcoin-ts';

(async () => {
  const vm = await instantiateBitcoinCashVirtualMachine();

  const program = createEmptyBitcoinCashProgramState([
    { opcode: BitcoinCashOpcodes.OP_1 },
    { opcode: BitcoinCashOpcodes.OP_DROP }
  ]);

  // tslint:disable-next-line:no-console
  console.log(stringify(vm.debug(program)));

  const program2 = createEmptyBitcoinCashProgramState([
    { opcode: BitcoinCashOpcodes.OP_1 },
    { opcode: 99 },
    { opcode: 4, data: hexToBin('03030303') },
    { opcode: 177 },
    { opcode: 117 }
  ]);

  // tslint:disable-next-line:no-console
  console.log(stringify(vm.debug(program2)));

  // testing individual opcodes:

  return true;
})().catch(error => {
  // tslint:disable-next-line:no-console
  console.error(error);
});
