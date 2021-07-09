// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PaymentBatcher {
    using SafeERC20 for IERC20;

    struct EtherToMany {
        address recipient;
        uint256 amount;
    }
    struct TokensToMany {
        address recipient;
        uint256 amount;
    }

    address private owner;
    uint256 internal locked = 1;
    
    event EtherReceived(address sender, uint256 amount, uint256 balance);
    event EtherTransferFailed(address recipient, uint256 amount);

    modifier noReentrant() {
        require(locked == 1, "No re-entrancy");
        locked = 2;
        _;
        locked = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferEtherToMany(EtherToMany[] calldata _list, uint gasLimit) external onlyOwner noReentrant {
        uint256 contractBalance = address(this).balance;
        for(uint256 i = 0; i < _list.length; i++) {
            require(contractBalance >= _list[i].amount && _list[i].amount > 0, "Contract Ether balance is not enough or sending amount equal to zero");
            require(_list[i].recipient != address(0), "Recipient address cannot be null");
            contractBalance = contractBalance - _list[i].amount; 
        }

        for(uint256 i = 0; i < _list.length; i++) {
            (bool sent, ) = _list[i].recipient.call{value: _list[i].amount, gas: gasLimit}("");

            if(!sent) {
                emit EtherTransferFailed(_list[i].recipient, _list[i].amount);
            }
        }
    }
    
    function transferTokensToMany(IERC20 _token, TokensToMany[] calldata _list) external onlyOwner noReentrant {
        uint256 tokenBalance = _token.balanceOf(address(this));
        for(uint256 i = 0; i < _list.length; i++) {
            require(tokenBalance >= _list[i].amount && _list[i].amount > 0, "Contract Token balance is not enough or sending amount equal to zero");
            require(_list[i].recipient != address(0), "Recipient address cannot be null");
            tokenBalance = tokenBalance - _list[i].amount;
        }
        
        for(uint256 i = 0; i < _list.length; i++) {
             _token.safeTransfer(_list[i].recipient, _list[i].amount);
        }
    }

    receive() external payable{
        require(msg.value > 0);
        emit EtherReceived(msg.sender, msg.value, address(this).balance);
    }
}
