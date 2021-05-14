import "@typechain/hardhat"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-ethers"
import { ethers } from "ethers";


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
//task("accounts", "Prints the list of accounts", async () => {
  //const accounts = await ethers.getSigners();

  //for (const account of accounts) {
    //console.log(account.address);
  //}
//});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      // from: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      //accounts: {
        // privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
        //accountsBalance: "10000000000000000"
      
    }
  }
};

