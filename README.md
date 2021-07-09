# Payment Batcher

Task:
**Implement payment batcher PaymentBatcher**

- support ETH & arbitrary ERC20 token
- it is possible to deposit ETH and ERC20
- method transferTokensToMany accepts list of token recipients and amounts
- method transferEtherToMany accepts list of ETH recipients,  amounts, gas limit per transfer
- emits  EtherReceived(address sender, uint256 amount, uint256 balance) event when ETH is deposited
- emits  EtherTransferFailed(address recipients, uint256 amount) when upon transfer fail, all other transfers must be completed

(Assignment given during my internship.)
