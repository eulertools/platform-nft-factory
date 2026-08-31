import bigGasBlockFormatter from './blockFormatter';
import bigGasLimitTransactionFormatter from './transactionFormatter';
import NetworkProvider  from '@truffle/hdwallet-provider'

const Web3 = require('web3')

const readContract = async (web3:any, address:string, abi:any[], methodName:string, ...args:any) => {

  const methods = abi.filter((method:any) => method.name === methodName);

  const contract = new web3.eth.Contract(methods, address);

  return contract.methods[methods[0].name](...args).call();
}

const writeContract = async (web3:any, address:string, abi:any, methodName:string,parameterCall:any, ...args:any) => {

  const methods = abi.filter((method:any) => method.name === methodName);

  const contract = new web3.eth.Contract(methods, address);

  return contract.methods[methods[0].name](...args).send(parameterCall);
}

const newWeb3 = (provider:any) => {

  const web3:any = new Web3(provider);

  const extendedWeb3 = [
      {
          name: 'getBigGasLimitTransaction',
          call: 'eth_getTransactionByHash',
          params: 1,
          inputFormatter: [null],
          outputFormatter: bigGasLimitTransactionFormatter,
      },
      {
          name: 'getBigGasBlockWithTransactions',
          call: 'eth_getBlockByNumber',
          params: 2,
          inputFormatter: [web3.utils.numberToHex, null],
          outputFormatter: bigGasBlockFormatter,
      },
  ]

  web3.extend({
      methods: extendedWeb3
  });

  web3.ext = {

    currentAccount: async () => (await web3.eth.getAccounts())[0],

    writeContract: async (address:string, abi:any, methodName:string,parameterCall:any, ...args:any) =>
        writeContract(web3, address, abi, methodName, parameterCall, ...args),

    readContract: async (address:string, abi:any, methodName:string, ...args:any) =>
        readContract(web3, address, abi, methodName, ...args),

    balanceOf: async(account:string) =>
        web3.utils.fromWei(await web3.eth.getBalance(account)),

    transfer: async(to:string, amount:string) => {

        const from = await provider.currentAccount();

        return web3.eth.sendTransaction({ from, to, value:amount})
    }
  }

  return web3;
}

export default newWeb3;
export { Web3, NetworkProvider };
