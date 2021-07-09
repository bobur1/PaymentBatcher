var PaymentBatcherV2 = artifacts.require("./PaymentBatcherV2.sol");

module.exports = function(deployer) {
  deployer.deploy(PaymentBatcherV2);
};
