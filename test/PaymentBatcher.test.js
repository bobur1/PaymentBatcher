const SimpleToken = artifacts.require("./SimpleToken.sol");
const PaymentBatcher = artifacts.require("./PaymentBatcher.sol");
const BrokenContract = artifacts.require("./BrokenContract.sol");
const chai = require("./setupchai.js");
const BN = web3.utils.BN;
const expect = chai.expect;

contract("PaymentBatcher", accounts => {
    const ownerAccount = accounts[0];
    const clientAccount1 = accounts[1];
    const clientAccount2 = accounts[2];
    const depositAmount = new BN(web3.utils.toWei("10", "ether"));
    const withdrAmount1 = new BN(web3.utils.toWei("7", "ether"));
    const withdrAmount2 = new BN(web3.utils.toWei("4", "ether"));
    const withdrAmount3 = new BN(web3.utils.toWei("3", "ether"));
    let SimpleTokenInstance;
    let PaymentBatcherInstance;

    beforeEach(async function() {
      SimpleTokenInstance = await SimpleToken.new({from: clientAccount1});
      PaymentBatcherInstance = await PaymentBatcher.new({from: ownerAccount});
    });

    it("Deposit ether from owner account", async () => {   
        await PaymentBatcherInstance.sendTransaction({from: ownerAccount, value: depositAmount});
        let balance = await web3.eth.getBalance(PaymentBatcherInstance.address);
        expect(balance).to.be.a.bignumber.equal(depositAmount);
    });

    it("Deposit ether from NOT owner account", async () => {   
      await PaymentBatcherInstance.sendTransaction({from: clientAccount1, value: depositAmount});
      let balance = await web3.eth.getBalance(PaymentBatcherInstance.address);
      expect(balance).to.be.a.bignumber.equal(depositAmount);
    });
    
    it("Batch ether to several addresses", async () => {   
      await PaymentBatcherInstance.sendTransaction({from: ownerAccount, value: depositAmount});
      let prevBalanceOfClientAccount1 = await web3.eth.getBalance(clientAccount1);
      let prevBalanceOfClientAccount2 = await web3.eth.getBalance(clientAccount2);
      let result = await PaymentBatcherInstance.transferEtherToMany([[clientAccount1, withdrAmount3], [clientAccount2, withdrAmount1]], 21000, {from: ownerAccount,});
      
      console.log('Batch ether to several addresses');
      console.log(`GasUsed: ${result.receipt.gasUsed}`);
      
      let currentBalanceOfClientAccount1 = await web3.eth.getBalance(clientAccount1);
      let currentBalanceOfClientAccount2 = await web3.eth.getBalance(clientAccount2);
      expect(new BN(prevBalanceOfClientAccount1).add(withdrAmount3)).to.be.bignumber.equal(new BN(currentBalanceOfClientAccount1));
      expect(new BN(prevBalanceOfClientAccount2).add(withdrAmount1)).to.be.bignumber.equal(new BN(currentBalanceOfClientAccount2));
    });
    
    it("Contract ether balance is less than sum of all sending ethers", async () => {   
      await PaymentBatcherInstance.sendTransaction({from: ownerAccount, value: (depositAmount)});
      let prevBalanceOfClientAccount1 = await web3.eth.getBalance(clientAccount1);
      let prevBalanceOfClientAccount2 = await web3.eth.getBalance(clientAccount2);
      return expect(PaymentBatcherInstance.transferEtherToMany([[clientAccount1, withdrAmount1], [clientAccount1, withdrAmount2], [clientAccount2, withdrAmount3]], 21000, {from: ownerAccount,})).to.be.eventually.rejected;
    });

    it("Batch ether to several addresses with skipping contract without recieve", async () => {   
      await PaymentBatcherInstance.sendTransaction({from: ownerAccount, value: (depositAmount)});
      let BrokenContractInstance = await BrokenContract.new();
      let prevBalanceOfClientAccount2 = await web3.eth.getBalance(clientAccount2);
      let result = await PaymentBatcherInstance.transferEtherToMany([[BrokenContractInstance.address, withdrAmount3], [clientAccount2, withdrAmount3]], 21000, {from: ownerAccount,});
      
      console.log('Batch ether to several addresses with skipping contract without recieve');
      console.log(`GasUsed: ${result.receipt.gasUsed}`);
      
      let currentBalanceOfClientAccount2 = await web3.eth.getBalance(clientAccount2);
      expect(result.logs[0].args.recipient).to.be.equal(BrokenContractInstance.address);
      expect(new BN(prevBalanceOfClientAccount2).add(withdrAmount3)).to.be.bignumber.equal(new BN(currentBalanceOfClientAccount2));
    });
    
    it("NOT owner cannot Batch ether", async () => {   
      await PaymentBatcherInstance.sendTransaction({from: clientAccount1, value: (depositAmount)});
      return expect(PaymentBatcherInstance.transferEtherToMany([[clientAccount1, withdrAmount2], [clientAccount2, withdrAmount3]], 21000, {from: clientAccount1,})).to.be.eventually.rejected;
    });
    
    it("Batch tokens to several accounts", async () => {   
      await SimpleTokenInstance.transfer(PaymentBatcherInstance.address, depositAmount, {from: clientAccount1});
      expect(await SimpleTokenInstance.balanceOf(PaymentBatcherInstance.address)).to.be.bignumber.equal(depositAmount);
      let result = await PaymentBatcherInstance.transferTokensToMany(SimpleTokenInstance.address, [[clientAccount1, withdrAmount1], [clientAccount2, withdrAmount3]], {from: ownerAccount});
      
      console.log('Batch tokens to several accounts');
      console.log(`GasUsed: ${result.receipt.gasUsed}`);
      
      expect(await SimpleTokenInstance.balanceOf(PaymentBatcherInstance.address)).bignumber.is.zero;
      expect(await SimpleTokenInstance.balanceOf(clientAccount2)).to.be.bignumber.equal(withdrAmount3);
    });

    it("Batch several allowed tokens to several accounts", async () => {
      let AnotherTokenInstance = await SimpleToken.new({from: clientAccount2});   
      await SimpleTokenInstance.transfer(PaymentBatcherInstance.address, depositAmount, {from: clientAccount1});
      await AnotherTokenInstance.transfer(PaymentBatcherInstance.address, depositAmount, {from: clientAccount2});
  
      expect(await SimpleTokenInstance.balanceOf(PaymentBatcherInstance.address)).to.be.bignumber.equal(depositAmount);
      let result = await PaymentBatcherInstance.transferTokensToMany(SimpleTokenInstance.address, [[clientAccount1, withdrAmount1], [clientAccount2, withdrAmount3]], {from: ownerAccount});
      
      console.log('Batch several allowed tokens to several accounts');
      console.log(`GasUsed: ${result.receipt.gasUsed}`);
      
      expect(await SimpleTokenInstance.balanceOf(PaymentBatcherInstance.address)).bignumber.is.zero;
      expect(await SimpleTokenInstance.balanceOf(clientAccount2)).to.be.bignumber.equal(withdrAmount3);

      expect(await AnotherTokenInstance.balanceOf(PaymentBatcherInstance.address)).to.be.bignumber.equal(depositAmount);
      result = await PaymentBatcherInstance.transferTokensToMany(AnotherTokenInstance.address, [[clientAccount1, withdrAmount1], [clientAccount2, withdrAmount3]], {from: ownerAccount});
      console.log(`GasUsed: ${result.receipt.gasUsed}`);
      expect(await AnotherTokenInstance.balanceOf(PaymentBatcherInstance.address)).bignumber.is.zero;
      expect(await AnotherTokenInstance.balanceOf(clientAccount1)).to.be.bignumber.equal(withdrAmount1);
    });
    
    it("Contract token balance is less than sum of all sending tokens", async () => {   
      await SimpleTokenInstance.transfer(PaymentBatcherInstance.address, depositAmount, {from: clientAccount1});
      expect(await SimpleTokenInstance.balanceOf(PaymentBatcherInstance.address)).to.be.bignumber.equal(depositAmount);
      return expect(PaymentBatcherInstance.transferTokensToMany([[clientAccount1, withdrAmount1], [clientAccount2, withdrAmount2], [clientAccount2, withdrAmount3]], {from: ownerAccount})).to.be.eventually.rejected;
      });

    it("NOT owner cannot Batch tokens", async () => {   
      await SimpleTokenInstance.transfer(PaymentBatcherInstance.address, depositAmount, {from: clientAccount1});
      expect(await SimpleTokenInstance.balanceOf(PaymentBatcherInstance.address)).to.be.bignumber.equal(depositAmount);
      return expect(PaymentBatcherInstance.transferTokensToMany([[clientAccount1, withdrAmount1], [clientAccount2, withdrAmount3]], {from: clientAccount1})).to.be.eventually.rejected;
    });
});
